// pages/Create.tsx
import { useState, useEffect, useRef } from "react";
import { FolderOpenIcon, DocumentTextIcon, CogIcon } from "@heroicons/react/outline";
import { ChevronDownIcon, ChevronUpIcon } from "@heroicons/react/outline";
import fs from "fs";
import Papa from "papaparse";
import {Timestamp} from "firebase/firestore";
import { saveProject } from "../firebase/projects"; // adjust path if needed
import { useAuth } from "../context/AuthContext";
import { collection, query, where, getDocs, deleteDoc, doc } from "firebase/firestore";
import {db} from "../firebase/firebaseConfig"; // adjust path if needed
import { getStorage, ref, uploadBytes, getDownloadURL, uploadString } from "firebase/storage";

type InputType = "csv" | "images";
type ModelType = "classification" | "regression";



export default function CreatePage() {
  const {user} = useAuth();
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [graphUrls, setGraphUrls] = useState<string[]>([]);
  const [open, setOpen] = useState(true);
  const [modelStruct, setModelStruct] = useState("");
  const [loadingCSV, setLoadingCSV] = useState(false);
  const [inputType, setInputType] = useState<InputType>("csv");
  const [datasetPath, setDatasetPath] = useState("");
  const [csvColumns, setCsvColumns] = useState<string[]>([]);
  const [selectedInputColumns, setSelectedInputColumns] = useState<string[]>([]);
  const [targetColumn, setTargetColumn] = useState("");
  const [modelType, setModelType] = useState<ModelType>("classification");
  //const [graphData, setGraphData] = useState<Record<string, string>>({});
  var graphData = {name1: "", value1: "", name2: "", value2: ""}
  var oneDone = false
  var savedOnce = false

  const [preprocessing, setPreprocessing] = useState({
    normalize: false,
    scale: false,
    resize: false,
  });
  const [architecture, setArchitecture] = useState({
    layers: "3",
    layerSize: "64",
    kernelSize: "3",
    padding: "1",
  });
  const [trainingParams, setTrainingParams] = useState({
    epochs: 10,
    batchSize: 32,
  });
  const [saveLocation, setSaveLocation] = useState("");
  const [training, setTraining] = useState(false);
  const [progress, setProgress] = useState(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [metricGraphUrl, setMetricGraphUrl] = useState<string | null>(null);
  const prevLogLength = useRef(0);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [mae, setMae] = useState<number | null>(null);
  const [r2, setr2] = useState<number | null>(null);
  const [projectName, setProjectName] = useState("");
  const [projectDescription, setProjectDescription] = useState("");
  const accuracyRef = useRef<number | null>(null);
  const maeRef = useRef<number | null>(null);
  const r2Ref = useRef<number | null>(null);

  const handleFileSelect = async () => {
    const filePath = await (window as any).electronAPI.selectFile();
    console.log("Selected file:", filePath);
    };

    const handleFolderSelect = async () => {
        const folderPath = await (window as any).electronAPI.selectFolder();
        console.log("Selected folder:", folderPath);
    };
    useEffect(() => {
  if (logs.length > prevLogLength.current) {
    logsEndRef.current?.scrollIntoView({ behavior: "smooth" });
    prevLogLength.current = logs.length;
  }
}, [logs]);

useEffect(() => {
  const handleLog = (data: { type: string; message?: string; path?: string }) => {
  if (data.type === "graph" && data.path) {
    console.log("doing the local graphs.")
    setGraphUrls((prev) => {
      // Add the new graph URL at the end, with cache busting
      const newList = [...prev, data.path + `?t=${Date.now()}`];
      // Keep only the last 2 graphs
      return newList.slice(-2);
    });
  } else if (data.type === "log") {
    setLogs((prev) => [...prev, data.message ?? ""]);
  }
};

  window.electronAPI.onTrainLog(handleLog);

  // No cleanup here because removeTrainLog does not exist
}, []);



  // Placeholder: simulate csv columns extraction
  useEffect(() => {
    if (inputType === "csv" && datasetPath) {
      setCsvColumns([]);
      setSelectedInputColumns([]);
      setTargetColumn("");
    } else {
      setCsvColumns([]);
      setSelectedInputColumns([]);
      setTargetColumn("");
    }
  }, [inputType, datasetPath]);

  const togglePreprocessing = (key: keyof typeof preprocessing) => {
    setPreprocessing({ ...preprocessing, [key]: !preprocessing[key] });
  };
async function uploadGraphImages(
  userId: string,
  projectId: string,
  graphs: { name1: string; value1: string; name2: string; value2: string }
) {
  const storage = getStorage();
  const urls: Record<string, string> = {};

  const nameValuePairs = [
    { name: graphs.name1, value: graphs.value1 },
    { name: graphs.name2, value: graphs.value2 },
  ];

  for (const { name, value } of nameValuePairs) {
    try {
      const refPath = `users/${userId}/projects/${projectId}/${name}.png`;
      const imageRef = ref(storage, refPath);

      // Upload base64 string
      await uploadString(imageRef, value, "data_url");
      await new Promise((res) => setTimeout(res, 500));
      // Fetch the public URL
      const url = await getDownloadURL(imageRef);
      urls[name] = url;
    } catch (err) {
      console.error(`Failed to upload or retrieve ${name}`, err);
    }
  }

  return urls;
}



  const handleTrain = async () => {
    setLogs([]);
    if (
      !inputType || !datasetPath || !modelStruct || !modelType ||
      !trainingParams.epochs || !trainingParams.batchSize ||
      !architecture.padding || !architecture.kernelSize ||
      !architecture.layerSize || !architecture.layers ||
      !saveLocation || 
      !projectName || !projectDescription ||
      (inputType === "csv" && (selectedInputColumns.length === 0 || !targetColumn))
    ) {
      alert("Please fill out all required fields.");
      return;
    }
    var userid = "anonymous";
        if(user) {userid = user.uid} // replace with actual user ID logic


    // Check for duplicates
    const projectsRef = collection(db, `users/${userid}/projects`);
    const q = query(projectsRef, where("name", "==", projectName));
    const querySnapshot = await getDocs(q);

    if (!querySnapshot.empty) {
      // Ask for confirmation to overwrite
      const overwrite = window.confirm(
        `A project named "${projectName}" already exists. Do you want to overwrite it?`
      );

      if (!overwrite) {
        return; // User canceled, stop training
      }

      // Delete all projects with the duplicate name
      for (const docSnap of querySnapshot.docs) {
        await deleteDoc(doc(db, `users/${userid}/projects`, docSnap.id));
      }
    }

    setTraining(true);
    setProgress(0);
    setLogs(["Starting training..."]);
    setMetricGraphUrl(null);
    setAccuracy(null);
    setMae(null);


    const config: any = {
      inputType,
      datasetPath,
      modelType,
      modelStruct,
      preprocessing,
      epochs: Number(trainingParams.epochs),
      batchSize: Number(trainingParams.batchSize),
      padding: Number(architecture.padding),
      kernelSize: Number(architecture.kernelSize),
      layerSize: Number(architecture.layerSize),
      numLayers: Number(architecture.layers),
      saveLocation,
      inputColumns: inputType === "csv" ? selectedInputColumns : undefined,
      targetColumn: inputType === "csv" ? targetColumn : undefined,
      type: inputType,
      name: projectName,
      description: projectDescription,
    };

    window.electronAPI.trainModel(config);


    window.electronAPI.onTrainLog(async (data: any) => {
      if (data.type === "progress") {
        setProgress(parseInt(data.message));
      } else if (data.type === "log") {
        //setLogs((prev) => [...prev, data.message ?? ""]);

        const match = data.message?.match(/Validation Accuracy:\s*([0-9.]+)/i);
        if (match) {
          const acc = parseFloat(match[1]);
          setAccuracy(acc);
          accuracyRef.current = acc;
        }

        const match2 = data.message?.match(/Validation MAE:\s*([0-9.]+)/i);
        if (match2) {
          const m = parseFloat(match2[1]);
          setMae(m);
          maeRef.current = m;
        }
        const match3 = data.message?.match(/Validation R\^2:\s*(-?[0-9.]+)/i);
        if (match2) {
          const m = parseFloat(match2[1]);
          setMae(m);
          maeRef.current = m;
        }
        if (match3) {
          const r = parseFloat(match3[1]);
          setr2(r);
          r2Ref.current = r;
        }
        const nameMatch = data.message?.match(/name\s*:\s*"([^"]+)"/);
        // Extract "data": "..."
        const dataMatch = data.message?.match(/data\s*:\s*"([^"]+)"/);

        if (nameMatch && dataMatch) {
          const dataName = nameMatch[1];
          const dataValue = dataMatch[1];
          console.log("graph detected.");
          if(!oneDone) {
            graphData.name1 = dataName
            graphData.value1 = dataValue
            oneDone = true
            //setGraphData((prev) => ({ ...prev, [dataName]: dataValue }));
            console.log(graphData)
          } else {
            graphData.name2 = dataName
            graphData.value2 = dataValue
          }
        }

        const completeMatch = data.message?.match(/Training script finished./i);
        if (completeMatch) {
      // } else if (data.type === "complete") {
        setTraining(false);

        const metric: any = {};
        if (accuracyRef.current !== null) metric.accuracy = accuracyRef.current;
        if (maeRef.current !== null) metric.mae = maeRef.current;
        if (r2Ref.current !== null) metric.r2 = r2Ref.current;
        maeRef.current = null
        r2Ref.current = null
        // after training finishes, save to firebase
        if(!savedOnce) {
          savedOnce = true
        try {
          const projectId = `${Date.now()}`; // or generate differently
          let graphURLs = {};
          graphURLs = await uploadGraphImages(userid, projectId, graphData);
          await saveProject({
            userId: userid, // replace with actual user
            projectId,
            name: projectName,
            modelType: modelType + " / " + modelStruct,
            dataType: inputType,
            datasetName: datasetPath,
            metrics: metric,
            createdAt: Timestamp.now(),
            description: projectDescription,
            location: saveLocation,
            inputs: [...selectedInputColumns],
            output: targetColumn,
            layers: architecture.layers,
            preprocessing: preprocessing,
            layersize: architecture.layerSize,
            kernelsize: architecture.kernelSize,
            padding: architecture.padding,
            epochs: trainingParams.epochs,
            batchsize: trainingParams.batchSize,
            graphURLs: graphData
          });
          setLogs((prev) => [...prev, "Project saved to Firebase ✅"]);
        } catch (err) {
          console.error(err);
          setLogs((prev) => [...prev, "Failed to save project to Firebase ❌"]);
        }
      }
      }
    }
  //);
  });}


  const useDefaults = () => {
    setInputType("csv");
    setDatasetPath("");
    setModelType("classification");
    setPreprocessing({ normalize: true, scale: false, resize: false });
    setArchitecture({
      layers: "3",
      layerSize: "64",
      kernelSize: "3",
      padding: "1",
    });
    setTrainingParams({ epochs: 10, batchSize: 32 });
    setSaveLocation("");
  };

  // Combine all config for saving
  const getConfigJSON = () => ({
    inputType,
    datasetPath,
    csvColumns,
    selectedInputColumns,
    targetColumn,
    modelType,
    preprocessing,
    architecture,
    trainingParams,
    saveLocation,
  });

  // Dummy file/folder picker handlers (replace with Electron dialog calls)

const pickDatasetPath = async () => {
let selectedPath: string | null = null;

if (inputType === "csv") {
  selectedPath = await window.electronAPI.openFile();
} else if (inputType === "images") {
  selectedPath = await window.electronAPI.openFolder();
}

if (selectedPath) {
  setDatasetPath(selectedPath);
  if (inputType === "csv" && selectedPath != null) {
      setLoadingCSV(true);
      try {
        var features = await window.electronAPI.parseCSVFeatures(selectedPath);
        setCsvColumns(features);
      } catch (err) {
        console.error(err);
      } finally {
        setLoadingCSV(false);
      }
    }
} else {
  console.warn("No path selected");
}
};
  const pickSaveLocation = async () => {
  const path = await window.electronAPI.pickSaveLocation();
  if (path) {
    console.log("Saving to:", path);
    // You can now write to this path via backend or send it back through ipc
    setSaveLocation(path);
  }
};

    return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded shadow space-y-8">
      <h1 className="text-3xl font-bold text-purple-700 mb-4">Create Model</h1>

      {/* Accordion instructions */}
      <div className="border border-purple-300 rounded">
        <button
          onClick={() => setOpen(!open)}
          className="w-full flex justify-between items-center p-4 bg-purple-100 text-purple-900 font-semibold"
          aria-expanded={open}
          aria-controls="instructions-panel"
        >
          <span>How to Use This Page</span>
          {open ? (
            <ChevronUpIcon className="w-6 h-6" />
          ) : (
            <ChevronDownIcon className="w-6 h-6" />
          )}
        </button>

        {open && (
          <div id="instructions-panel" className="p-4 text-purple-800 space-y-2">
            <p>
              1. Select your input data type and files (CSV or image folder).
            </p>
            <p>
              2. Choose model type and configure parameters or use defaults.
            </p>
            <p>
              3. Reference the <strong>Learn</strong> page for information on each model type and parameter!
            </p>
            <p>
              4. Select output directory for saving your trained model.
            </p>
            <p>
              5. Click <strong>Train Model</strong> and monitor progress and evaluation!
            </p>
            <p>
              <strong>Important:</strong> After training, the app saves a folder
              containing your model, graphs, and information on how your model was trained, including your model’s architecture and settings, which
              are important for later testing/use.
            </p>
          </div>
        )}
      </div>

      {/* Input Type */}
      <div>
        <label className="font-semibold mr-4 text-purple-900">Input Type:</label>
        <select
          value={inputType}
          onChange={(e) => {
            setInputType(e.target.value as InputType) 
            setDatasetPath("");}}
          className="border border-purple-300 rounded px-3 py-1"
          disabled={training}
        >
          <option value="csv">CSV File</option>
          <option value="images">Image Folder</option>
        </select>
      </div>

      {/* Dataset Path with picker */}
      <div>
        <label className="block font-semibold mb-1 text-purple-900">Dataset Path:</label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={datasetPath}
            readOnly
            placeholder={inputType === "csv" ? "No file selected" : "No folder selected"}
            className="flex-1 border border-purple-300 rounded px-3 py-2 bg-gray-50"
          />
          <button
            onClick={pickDatasetPath}
            className="bg-purple-600 text-white px-4 rounded hover:bg-purple-700 flex items-center space-x-1"
          >
            <FolderOpenIcon className="h-5 w-5" />
            <span>Select</span>
          </button>
        </div>
      </div>

            {/* Project name + description */}
      <div>
        <label className="font-semibold block mb-1 text-purple-900">Project Name:</label>
        <input
          type="text"
          value={projectName}
          onChange={(e) => setProjectName(e.target.value)}
          disabled={training}
          className="w-full border border-purple-300 rounded px-3 py-2"
        />
      </div>
      <div>
        <label className="font-semibold block mb-1 text-purple-900">Description:</label>
        <textarea
          value={projectDescription}
          onChange={(e) => setProjectDescription(e.target.value)}
          disabled={training}
          className="w-full border border-purple-300 rounded px-3 py-2"
          rows={3}
        />
      </div>

      {/* CSV Input Columns and Target */}
      {inputType === "csv" && csvColumns.length > 0 && (
        <div className="space-y-4">
          <div>
            <label className="font-semibold block mb-1">Input Columns:</label>
            <div className="flex flex-wrap gap-3">
              {csvColumns.map((col) => (
                <label key={col} className="inline-flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={selectedInputColumns.includes(col)}
                    onChange={() => {
                      if (selectedInputColumns.includes(col)) {
                        setSelectedInputColumns([])
                        setSelectedInputColumns(selectedInputColumns.filter((c) => c !== col));
                      } else {
                        setSelectedInputColumns([])
                        setSelectedInputColumns([...selectedInputColumns, col]);
                      }
                    }}
                    disabled={training}
                  />
                  <span>{col}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <label className="font-semibold block mb-1">Target Column:</label>
            <select
              value={targetColumn}
              onChange={(e) => setTargetColumn(e.target.value)}
              className="border border-gray-300 rounded px-3 py-2"
              disabled={training}
            >
              {csvColumns.map((col) => (
                <option key={col} value={col}>
                  {col}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Model type */}
      <div>
        <label className="font-semibold block mb-1">Model Type:</label>
        <select
          value={modelType}
          onChange={(e) => setModelType(e.target.value as ModelType)}
          className="border border-gray-300 rounded px-3 py-2"
          disabled={training || inputType === "images"}
        >
          <option value="classification">Classification</option>
          {inputType !== "images" && (
            <option value="regression">Regression</option>
          )}
        </select>
      </div>
      {/* Model Selector */}
      <div>
        <label className="font-semibold block mb-1">Model Structure:</label>
        <select
          className="border border-gray-300 rounded px-3 py-2 w-quarter"
          value={modelStruct}
          onChange={(e) => setModelStruct(e.target.value)}
        >
          <option value="">Select a model</option>
          <option value="cnn">CNN (Convolutional Neural Network)</option>
          {inputType !== "images" && (
            <>
              <option value="rnn">RNN (Recurrent Neural Network)</option>
              <option value="lstm">LSTM (Long Short-Term Memory)</option>
              <option value="mlp">MLP (Multi-layer Perceptron)</option>
              <option value="fnn">FNN (Feedforward Neural Network)</option>
            </>
          )}
        </select>
      </div>

      {/* Preprocessing */}
      <div>
        <label className="font-semibold block mb-1">Preprocessing:</label>
        <div className="flex space-x-6">
          {Object.entries(preprocessing).map(([key, val]) => (
            <label key={key} className="inline-flex items-center space-x-2">
              <input
                type="checkbox"
                checked={val}
                onChange={() => togglePreprocessing(key as keyof typeof preprocessing)}
                disabled={training}
              />
              <span>{key.charAt(0).toUpperCase() + key.slice(1)}</span>
            </label>
          ))}
        </div>
      </div>

      {/* Architecture */}
      <div className="space-y-3">
        <h3 className="font-semibold text-lg">Architecture</h3>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-semibold">Number of Layers:</label>
            <input
              type="number"
              min={1}
              max={20}
              value={architecture.layers}
              onChange={(e) =>
                setArchitecture({ ...architecture, layers: e.target.value })
              }
              className="w-full border border-gray-300 rounded px-3 py-2"
              disabled={training}
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Layer Size:</label>
            <input
              type="number"
              min={1}
              max={1024}
              value={architecture.layerSize}
              onChange={(e) =>
                setArchitecture({ ...architecture, layerSize: e.target.value })
              }
              className="w-full border border-gray-300 rounded px-3 py-2"
              disabled={training}
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Kernel Size:</label>
            <input
              type="number"
              min={1}
              max={11}
              value={architecture.kernelSize}
              onChange={(e) =>
                setArchitecture({ ...architecture, kernelSize: e.target.value })
              }
              className="w-full border border-gray-300 rounded px-3 py-2"
              disabled={training}
            />
          </div>
          <div>
            <label className="block mb-1 font-semibold">Padding:</label>
            <input
              type="number"
              min={0}
              max={5}
              value={architecture.padding}
              onChange={(e) =>
                setArchitecture({ ...architecture, padding: e.target.value })
              }
              className="w-full border border-gray-300 rounded px-3 py-2"
              disabled={training}
            />
          </div>
      </div>

      {/* Training params */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block mb-1 font-semibold">Epochs:</label>
          <input
            type="number"
            min={1}
            max={1000}
            value={trainingParams.epochs}
            onChange={(e) =>
              setTrainingParams({ ...trainingParams, epochs: +e.target.value })
            }
            className="w-full border border-gray-300 rounded px-3 py-2"
            disabled={training}
          />
        </div>
        <div>
          <label className="block mb-1 font-semibold">Batch Size:</label>
          <input
            type="number"
            min={1}
            max={1024}
            value={trainingParams.batchSize}
            onChange={(e) =>
              setTrainingParams({ ...trainingParams, batchSize: +e.target.value })
            }
            className="w-full border border-gray-300 rounded px-3 py-2"
            disabled={training}
          />
        </div>
      </div>
      <div className="flex items-end">
            <button
              onClick={useDefaults}
              disabled={training}
              className="bg-gray-300 text-gray-700 px-4 py-2 rounded hover:bg-gray-400"
            >
              Use Defaults
            </button>
          </div>
      </div>

      {/* Save Location with picker */}
      <div>
        <label className="block font-semibold mb-1 text-purple-900">Save Location:</label>
        <div className="flex space-x-2">
          <input
            type="text"
            value={saveLocation}
            readOnly
            placeholder="No folder selected"
            className="flex-1 border border-purple-300 rounded px-3 py-2 bg-gray-50"
          />
          <button
            onClick={pickSaveLocation}
            className="bg-purple-600 text-white px-4 rounded hover:bg-purple-700 flex items-center space-x-1"
          >
            <FolderOpenIcon className="h-5 w-5" />
            <span>Select</span>
          </button>
        </div>
      </div>
      {/* Train and Save Config Buttons */}
      <div className="flex space-x-4">
        <button
          onClick={handleTrain}
          className={`px-6 py-3 rounded font-semibold text-white ${
            training ? "bg-purple-400 cursor-not-allowed" : "bg-purple-700 hover:bg-purple-800"
          }`}
        >
          {training ? `Training... ${progress}%` : "Train Model"}
        </button>
      </div>

        <div
          className="bg-gray-100 p-3 rounded h-32 overflow-auto font-mono text-sm whitespace-pre-wrap"
          style={{ whiteSpace: "pre-wrap" }}
        >
          {logs.join("\n")}
          <div ref={logsEndRef} />
        </div>

        {/* Training Graphs */}
        {graphUrls.length > 0 && (
        <div className="my-4">
          <h3 className="font-semibold mb-2">Training Metrics</h3>
          <div className="flex gap-4 flex-wrap">
            {graphUrls.map((url, i) => (
              <img
                key={i}
                src={url}
                alt={`Graph ${i + 1}`}
                className="rounded shadow w-[48%] max-w-[500px]"
              />
            ))}
          </div>
        </div>
      )}


      {/* Example Datasets */}
        <h2 className="text-2xl font-semibold text-purple-700">Example Datasets</h2>
        <div className="space-y-3">
          <div>
            <h3 className="font-semibold">1. Classification Practice (CSV)</h3>
            <p>A simple and classic machine learning problem. Classify ones and zeroes based on two input features.</p>
          </div>
          <div>
            <h3 className="font-semibold">2. House Price Regression (CSV)</h3>
            <p>Dataset containing house features (in USD) to predict price. Valuable to learn regression, and an example of using ML in industry.</p>
          </div>
          <div>
            <h3 className="font-semibold">3. Gas Mileage (CSV)</h3>
            <p>Dataset containing car features to predict gas usage (mpg). Regression model to model saving ability and environmental impact.</p>
          </div>
          <div>
            <h3 className="font-semibold">4. Pets Classification (Image Folder)</h3>
            <p>Dataset cultivated from public domain, open source images to learn classification between cats, dogs, and birds.</p>
          </div>
          <div>
            <h3 className="font-semibold">5. Heart Disease (CSV)</h3>
            <p>Classification dataset for the prediction of heart disease. Valuable example of neural networks in research to classify people between healthy (0) and heart disease (1).</p>
          </div>
          <div>
            <p className="font-semibold text-purple-600 hover:underline">Download Datasets at <strong>customlearning.vercel.app</strong></p>
          </div>
        </div>
      </div>
        
  );
}
