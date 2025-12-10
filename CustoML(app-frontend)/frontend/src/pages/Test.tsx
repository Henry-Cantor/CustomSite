// pages/Test.tsx
import { useState, useEffect } from "react";
import { DocumentTextIcon } from "@heroicons/react/outline";

interface Config {
  inputType: "csv" | "image";
  inputColumns?: string[];
  modelType: string;
  modelStruct: string;
}

export default function TestPage() {
  const [modelPath, setModelPath] = useState<string>("");
  const [config, setConfig] = useState<Config | null>(null);
  const [csvInput, setCsvInput] = useState<Record<string, string>>({});
  const [imageFiles, setImageFiles] = useState<FileList | null>(null);
  const [results, setResults] = useState<string | null>(null);

  useEffect(() => {
    if (!modelPath) return;
    // Read config.json from the selected model folder
    window.electronAPI.readConfig(modelPath).then((cfg: Config) => {
      setConfig(cfg);
      if (cfg.inputType === "csv" && cfg.inputColumns) {
        const emptyInputs: Record<string, string> = {};
        cfg.inputColumns.forEach(col => (emptyInputs[col] = ""));
        setCsvInput(emptyInputs);
      }
    });
  }, [modelPath]);

  const handleCsvChange = (key: string, value: string) => {
    setCsvInput(prev => ({ ...prev, [key]: value }));
  };

  const handleRunInference = async () => {
    if (!modelPath || !config) return;
    setResults("Running inference...");

    const result = await window.electronAPI.runInference({
      modelPath,
      inputs: config.inputType === "csv" ? csvInput : imageFiles?.[0] ?? null,
    });

    setResults(result);
  };

  const openModelFolder = async () => {
    const folder = await window.electronAPI.openFolder();
    if (folder) {
      setModelPath(folder);
      setResults(null);
    }
  };

  return (
    <div className="max-w-4xl mx-auto bg-white p-8 rounded shadow space-y-6">
      <h1 className="text-3xl font-bold text-purple-700">Test Trained Model</h1>

      <div>
        <label className="block font-semibold mb-1">Model Folder:</label>
        <div className="flex space-x-2">
          <input
            type="text"
            readOnly
            value={modelPath}
            placeholder="No folder selected"
            className="flex-1 border border-purple-300 rounded px-3 py-2 bg-gray-50"
          />
          <button
            onClick={openModelFolder}
            className="bg-purple-600 text-white px-4 rounded hover:bg-purple-700 flex items-center space-x-1"
          >
            <DocumentTextIcon className="h-5 w-5" />
            <span>Select</span>
          </button>
        </div>
      </div>

      {config && (
        <>
          <h2 className="font-semibold text-xl mt-6">Input Data</h2>

          {config.inputType === "csv" && (
            <div className="space-y-4">
              {config.inputColumns?.map(col => (
                <div key={col}>
                  <label className="block font-semibold mb-1">{col}:</label>
                  <input
                    type="text"
                    className="w-full border border-gray-300 rounded px-3 py-2"
                    value={csvInput[col] || ""}
                    onChange={e => handleCsvChange(col, e.target.value)}
                  />
                </div>
              ))}
            </div>
          )}

          {config.inputType === "image" && (
            <div>
              <label className="block font-semibold mb-1">Upload Image:</label>
              <input
                type="file"
                accept="image/*"
                onChange={e => setImageFiles(e.target.files)}
              />
            </div>
          )}

          <button
            onClick={handleRunInference}
            className="mt-6 bg-indigo-600 text-white px-6 py-3 rounded hover:bg-indigo-700"
          >
            Run Inference
          </button>

          {results && (
            <pre className="mt-6 bg-gray-100 p-4 rounded whitespace-pre-wrap font-mono text-sm">
              {results}
            </pre>
          )}
        </>
      )}
    </div>
  );
}
