const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
  pickDatasetPath: (inputType) => ipcRenderer.invoke("pick-dataset-path", inputType),
  pickSaveLocation: () => ipcRenderer.invoke("dialog:saveFile"),
  openFile: () => ipcRenderer.invoke("dialog:openFile"),
  openFolder: () => ipcRenderer.invoke("dialog:openFolder"),
  parseCSVFeatures: (filePath) => ipcRenderer.invoke("parse-csv-features", filePath),
  trainModel: (config) => ipcRenderer.send('train-model', config),
  onTrainLog: (callback) => ipcRenderer.on('train-log', (_, data) => callback(data)),
  readConfig: (folderPath) => ipcRenderer.invoke("config:read", folderPath),
  runInference: (data) => ipcRenderer.invoke("inference:run", data)
});