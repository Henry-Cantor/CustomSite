

const { app, BrowserWindow, ipcMain, dialog } = require("electron");
const path = require("path");
const fs = require("fs");
const Papa = require("papaparse");
const { spawn } = require('child_process');
const https = require("https");
const { getAuth } = require("firebase/auth");
const os = require("os");
var mainWindow;


function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    icon: path.join(__dirname, "assets/icon.ico"),
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.loadURL(
    `file://${path.join(__dirname, "frontend", "build", "index.html")}`
  );
}
app.whenReady().then(() => {
  createWindow();

  const appVersion = app.getVersion();
  console.log(appVersion);

  mainWindow.webContents.once("did-finish-load", async () => {
    try {

      console.log("updating info")
      const updateInfo = await checkForUpdate(appVersion);
      if (updateInfo.needsUpdate) {
        console.log("needs update, downloading now")
        const downloadedPath = await downloadUpdate(updateInfo.latestFile);

        // Show alert to user
        await dialog.showMessageBox(mainWindow, {
          type: "info",
          title: "Update Ready",
          message: `The installer for the latest version of CustoMLearning has been saved to your Downloads folder:\n${downloadedPath}\n\nPlease delete your current application, open the downloaded installer, and run the new version for the updated app!`,
          buttons: ["OK"]
        });

        // Quit the app
        app.quit();
      }
    } catch (err) {
      console.error("Update check failed:", err);
    }
  });
});

function ensureBackendReady(executablePath, timeout = 30000) {
  return new Promise((resolve, reject) => {
    const start = Date.now();

    function check() {
      if (fs.existsSync(executablePath)) {
        resolve(true);
      } else if (Date.now() - start > timeout) {
        reject(new Error("Backend executable not ready in time"));
        console.log("NOT READY")
      } else {
        setTimeout(check, 200);
      }
    }

    check();
  });
}

ipcMain.handle("pick-dataset-path", async (event, inputType) => {
  const options = inputType === "image"
    ? { properties: ["openDirectory"] }
    : {
        properties: ["openFile"],
        filters: [{ name: "CSV Files", extensions: ["csv"] }],
      };

  const result = await dialog.showOpenDialog(options);
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.handle("dialog:saveFile", async () => {
const result = await dialog.showSaveDialog({
    title: "Select Output Folder",
    defaultPath: "model", // User can rename this
    buttonLabel: "Save Here",
    showsTagField: false,
    properties: [] // not openDirectory
  });

  if (result.canceled) return null;

  const folderPath = result.filePath;

  // Create the folder manually if it doesn't exist
  const fs = require("fs");
  const path = require("path");
  if (!fs.existsSync(folderPath)) {
    fs.mkdirSync(folderPath, { recursive: true });
  }

  return folderPath;
});

ipcMain.handle("dialog:openFile", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openFile"],
    filters: [{ name: "CSV Files", extensions: ["csv"] }],
  });
  return result.canceled ? null : result.filePaths[0];
});

ipcMain.handle("dialog:openFolder", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory"],
  });
  return result.canceled ? null : result.filePaths[0];
});

// IPC handler to parse CSV headers
ipcMain.handle("parse-csv-features", async (event, filePath) => {
  try {
    const csvContent = fs.readFileSync(filePath, "utf-8");
    const parsed = Papa.parse(csvContent, { header: true });
    if (parsed.meta.fields) {
      return parsed.meta.fields;
    } else {
      throw new Error("No headers found in CSV.");
    }
  } catch (error) {
    console.error("Error parsing CSV:", error);
    throw error;
  }
});

function getBackendPath(baseName, isDev) {
  if (isDev) {
    // In dev, just run the raw Python script
    return path.join(__dirname, "backend", `${baseName}.py`);
  }

  const platform = process.platform;
  const backendRoot = path.join(process.resourcesPath, "backend", "dist");

  if (platform === "win32") {
    // Windows → trainWin / testWin
    const exePath = path.join(backendRoot, `${baseName}Win`, `${baseName}.exe`);
    return fs.existsSync(exePath)
      ? exePath
      : path.join(backendRoot, `${baseName}.exe`);
  } else if (platform === "linux") {
    // Linux → trainLinux / testLinux
    const exePath = path.join(backendRoot, `${baseName}Linux`, baseName);
    return fs.existsSync(exePath)
      ? exePath
      : path.join(backendRoot, baseName, baseName);
  } else {
    // macOS → just train / test (default)
    const exePath = path.join(backendRoot, baseName, baseName);
    return fs.existsSync(exePath)
      ? exePath
      : path.join(backendRoot, baseName);
  }
}

ipcMain.on("train-model", (event, config) => {
  const isDev = !app.isPackaged;
  const trainPath = getBackendPath("train", isDev);

  if (!fs.existsSync(trainPath)) {
    console.error("Train binary not found at:", trainPath);
    return;
  }

  const proc = isDev
    ? spawn("python", [trainPath], { stdio: ["pipe", "pipe", "pipe"] })
    : spawn(trainPath, { stdio: ["pipe", "pipe", "pipe"] });

  proc.stdin.write(JSON.stringify(config));
  proc.stdin.end();

  const projectData = { metrics: {}, graphs: {} };

  proc.stdout.on("data", (data) => {
    const lines = data.toString().split("\n").filter(Boolean);
    for (const line of lines) {
      try {
        const msg = JSON.parse(line);
        if (msg.type === "metric") projectData.metrics[msg.name] = msg.value;
        if (msg.type === "graph") projectData.graphs[msg.name] = msg.data;
        if (msg.type === "complete") saveProjectToFirestore(projectData);
        mainWindow.webContents.send("train-log", msg);
      } catch {
        mainWindow.webContents.send("train-log", { type: "log", message: line });
      }
    }
  });

  proc.stderr.on("data", (data) => {
    mainWindow.webContents.send("train-log", { type: "log", message: data.toString() });
  });

  proc.on("close", () => {
    mainWindow.webContents.send("train-log", { type: "log", message: "Training script finished." });
  });
});

// === TEST / INFERENCE ===
ipcMain.handle("inference:run", async (event, { modelPath, inputs }) => {
  const isDev = !app.isPackaged;
  const testPath = getBackendPath("test", isDev);

  if (!fs.existsSync(testPath)) {
    throw new Error("Test binary not found at: " + testPath);
  }

  return new Promise((resolve, reject) => {
    const proc = isDev
      ? spawn("python", [testPath], { stdio: ["pipe", "pipe", "pipe"] })
      : spawn(testPath, { stdio: ["pipe", "pipe", "pipe"] });

    let stdout = "", stderr = "";

    proc.stdout.on("data", (chunk) => { stdout += chunk.toString(); });
    proc.stderr.on("data", (chunk) => { stderr += chunk.toString(); });

    proc.on("error", (err) => reject(err));

    proc.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`Binary exited with code ${code}\nstderr: ${stderr}`));
      } else {
        resolve(stdout.trim());
      }
    });

    proc.stdin.write(JSON.stringify({ modelPath, inputs }));
    proc.stdin.end();
  });
});

ipcMain.handle("config:read", async (event, folderPath) => {
  const configPath = path.join(folderPath, "config.json");
  const raw = await fs.promises.readFile(configPath, "utf-8");
  return JSON.parse(raw);
});


function getOSFileName(latestJson) {
  const platform = os.platform();
  return latestJson.files[platform]; // expects latest.json to have keys: darwin, win32, linux
}
async function checkForUpdate(currentVersion) {
  const dotenv = require("dotenv");
  const envPath = app.isPackaged
    ? path.join(process.resourcesPath, ".env")  // production
    : path.join(__dirname, ".env");             // dev

  dotenv.config({ path: envPath, override: true });
  console.log("Loaded .env from:", envPath);
  const downloadsFolder = process.env.DOWNLOAD_FOLDER;

  const res = await fetch(`https://customlearning.vercel.app/${downloadsFolder}/latest.json`);
  if (!res.ok) throw new Error(`Failed to fetch latest.json: ${res.status}`);
  const latestJson = await res.json();

  const latestVersion = latestJson.version;
  const latestFile = getOSFileName(latestJson);
  const needsUpdate = latestVersion !== currentVersion;

  return { needsUpdate, latestVersion, latestFile };
}

async function downloadUpdate(fileName) {
  const dotenv = require("dotenv");
  const envPath = app.isPackaged
    ? path.join(process.resourcesPath, ".env")  // production
    : path.join(__dirname, ".env");             // dev

  dotenv.config({ path: envPath, override: true });
  console.log("Loaded .env from:", envPath);

  // Request JSON (not the file directly)
  const apiUrl = `https://customlearning.vercel.app/api/download?file=${
    fileName.includes("mac")
      ? "mac"
      : fileName.includes("win")
      ? "windows"
      : "linux"
  }`;

  const res = await fetch(apiUrl);
  if (!res.ok) throw new Error(`Failed to fetch signed URL: ${res.status}`);
  const { url } = await res.json(); // <-- actual signed R2 URL

  const savePath = path.join(app.getPath("downloads"), fileName);

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(savePath);

    https.get(url, (res) => {
      if (res.statusCode !== 200) {
        return reject(new Error(`File download failed: ${res.statusCode}`));
      }
      res.pipe(file);
      file.on("finish", () => {
        file.close();
        resolve(savePath);
      });
    }).on("error", (err) => {
      fs.unlink(savePath, () => reject(err));
    });
  });
}


// New: select single image for model input
ipcMain.handle("select-image", async () => {
  const result = await dialog.showOpenDialog({
    title: "Select Image",
    properties: ["openFile"],
    filters: [
      { name: "Images", extensions: ["jpg", "jpeg", "png", "bmp", "tif", "tiff", "webp"] }
    ]
  });
  if (result.canceled || !result.filePaths.length) return null;
  return result.filePaths[0];
});