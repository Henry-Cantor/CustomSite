const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  pickDatasetPath: (inputType) => ipcRenderer.invoke("pick-dataset-path", inputType),
  pickSaveLocation: () => ipcRenderer.invoke("dialog:saveFile"),
  openFile: () => ipcRenderer.invoke("dialog:openFile"),
  openFolder: () => ipcRenderer.invoke("dialog:openFolder"),
  parseCSVFeatures: (filePath) => ipcRenderer.invoke("parse-csv-features", filePath),
  trainModel: (config) => {
    ipcRenderer.send('train-model', config)
  },
  readConfig: (folderPath) => ipcRenderer.invoke("config:read", folderPath),
  runInference: (data) => ipcRenderer.invoke("inference:run", data),
  onTrainLog: (callback) => {
    const listener = (_, data) => callback(data);
    ipcRenderer.on("train-log", listener);

    // return unsubscribe fn
    return () => {
      ipcRenderer.removeListener("train-log", listener);
      console.log("Unsubscribed from train-log");
    };
  },
  unsubTrainLog: () => {
    ipcRenderer.removeAllListeners("train-log");
  },
  selectImage: () =>
    ipcRenderer.invoke("select-image") // returns string | null
});