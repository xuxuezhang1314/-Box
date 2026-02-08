const { app, BrowserWindow, ipcMain, session, dialog } = require('electron');
const path = require('path');

let mainWindow;
const isDev = process.argv.includes('--inspect=5858');

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    frame: false,
    titleBarStyle: 'hidden',
    backgroundColor: '#0a0a0a',
    show: false, // 等待加载完成再显示
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js'),
      webviewTag: true,
      allowRunningInsecureContent: true,
      webSecurity: false // 允许跨域（开发用）
    }
  });

  // 加载主页
  mainWindow.loadFile('src/ui/home.html');

  // 加载完成后显示（避免白屏）
  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
    if (isDev) mainWindow.webContents.openDevTools();
  });

  // 窗口控制 IPC
  ipcMain.on('window-minimize', () => mainWindow.minimize());
  ipcMain.on('window-maximize', () => {
    if (mainWindow.isMaximized()) {
      mainWindow.unmaximize();
    } else {
      mainWindow.maximize();
    }
  });
  ipcMain.on('window-close', () => mainWindow.close());

  // 创建新标签页（从主页导航）
  ipcMain.on('create-tab', (event, url) => {
    mainWindow.webContents.send('new-tab', url);
  });

  // 获取版本信息
  ipcMain.handle('get-app-info', () => ({
    name: '云box',
    version: app.getVersion(),
    electron: process.versions.electron,
    chrome: process.versions.chrome
  }));

  // 选择主题文件
  ipcMain.handle('select-theme', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'CSS 主题', extensions: ['css'] }]
    });
    if (!result.canceled && result.filePaths.length > 0) {
      return result.filePaths[0];
    }
    return null;
  });
}

app.whenReady().then(createWindow);

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});

