const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

let mainWindow;
let engineProcess;

function createWindow() {
  // Auto-copy the user's transparent dragon image to the workspace
  const brainDir = path.join(app.getPath('home'), '.gemini', 'antigravity', 'brain', '3590eb6e-03f2-4a6b-9fc0-8a1dde5e8ca1');
  const srcPath = path.join(brainDir, 'dragon_cream_bg_1779034755408.png');
  const destPath = path.join(__dirname, 'dragon.png');
  if (fs.existsSync(srcPath)) {
    try {
      fs.copyFileSync(srcPath, destPath);
      console.log("Successfully copied user dragon image to:", destPath);
    } catch (e) {
      console.error("Failed to copy dragon image:", e);
    }
  }

  mainWindow = new BrowserWindow({
    width: 1250,
    height: 850,
    icon: path.join(__dirname, 'dragon.png'),
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false
    },
    title: "Saian Photo Editor",
    autoHideMenuBar: true,
    backgroundColor: '#efe0d0',
    show: false
  });

  mainWindow.loadFile('index.html');
  
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', function () {
    mainWindow = null;
  });
}

function startEngine() {
  let enginePath = path.join(__dirname, 'backend', 'bin', 'engine.exe');
  enginePath = enginePath.replace('app.asar', 'app.asar.unpacked');
  
  let engineCwd = path.join(__dirname, 'backend', 'bin');
  engineCwd = engineCwd.replace('app.asar', 'app.asar.unpacked');
  
  console.log("Starting C++ Engine at:", enginePath);
  
  engineProcess = spawn(enginePath, [], {
    cwd: engineCwd
  });

  engineProcess.stdout.on('data', (data) => {
    const output = data.toString().trim();
    console.log(`C++ Engine Stdout: ${output}`);
    
    if (output === 'SUCCESS') {
      mainWindow.webContents.send('engine-response', { success: true });
    } else if (output.startsWith('ERROR')) {
      mainWindow.webContents.send('engine-response', { success: false, error: output });
    }
  });

  engineProcess.stderr.on('data', (data) => {
    console.error(`C++ Engine Stderr: ${data}`);
  });

  engineProcess.on('close', (code) => {
    console.log(`C++ Engine exited with code ${code}`);
  });
}

app.on('ready', () => {
  createWindow();
  startEngine();
});

app.on('window-all-closed', function () {
  if (engineProcess) {
    try {
      engineProcess.stdin.write("EXIT\n");
      engineProcess.kill();
    } catch(e) {}
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('activate', function () {
  if (mainWindow === null) {
    createWindow();
  }
});

// IPC communication between Renderer (UI) and C++ Engine
ipcMain.on('process-image', (event, data) => {
  if (engineProcess && !engineProcess.killed) {
    const { 
      inputPath, outputPath, blur, contrast, brightness, invert, grayscale,
      saturation, hue, sharpness, exposure, gamma, sepia, vignette, noise, flip, rotate,
      temp, highlights, shadows, sketch, crop_x, crop_y, crop_w, crop_h
    } = data;
    
    // Send standard multiline protocol commands to the C++ process
    engineProcess.stdin.write("PROCESS\n");
    engineProcess.stdin.write(inputPath + "\n");
    engineProcess.stdin.write(outputPath + "\n");
    
    // Write all 24 parameters on a single space-separated line
    engineProcess.stdin.write(`${blur} ${contrast} ${brightness} ${invert} ${grayscale} ${saturation} ${hue} ${sharpness} ${exposure} ${gamma} ${sepia} ${vignette} ${noise} ${flip} ${rotate} ${temp} ${highlights} ${shadows} ${sketch} ${crop_x} ${crop_y} ${crop_w} ${crop_h}\n`);
  } else {
    event.reply('engine-response', { success: false, error: "C++ engine is not running" });
  }
});

// Save/Export processed image
ipcMain.on('save-image', (event, data) => {
  const { tempPath } = data;
  
  dialog.showSaveDialog(mainWindow, {
    title: 'Save Processed Image',
    defaultPath: 'edited_image.jpg',
    filters: [
      { name: 'Images', extensions: ['jpg', 'png', 'jpeg', 'bmp'] }
    ]
  }).then(result => {
    if (!result.canceled && result.filePath) {
      fs.copyFile(tempPath, result.filePath, (err) => {
        if (err) {
          event.reply('save-image-response', { success: false, error: err.message });
        } else {
          event.reply('save-image-response', { success: true, path: result.filePath });
        }
      });
    }
  }).catch(err => {
    event.reply('save-image-response', { success: false, error: err.message });
  });
});
