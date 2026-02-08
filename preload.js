const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('cloudbox', {
  // 窗口控制
  minimize: () => ipcRenderer.send('window-minimize'),
  maximize: () => ipcRenderer.send('window-maximize'),
  close: () => ipcRenderer.send('window-close'),
  
  // 标签页
  createTab: (url) => ipcRenderer.send('create-tab', url),
  onNewTab: (callback) => ipcRenderer.on('new-tab', (e, url) => callback(url)),
  
  // 应用信息
  getAppInfo: () => ipcRenderer.invoke('get-app-info'),
  
  // 主题
  selectTheme: () => ipcRenderer.invoke('select-theme'),
  
  // 存储（封装 localStorage）
  storage: {
    get: (key) => localStorage.getItem(key),
    set: (key, value) => localStorage.setItem(key, value),
    getObject: (key) => {
      try {
        return JSON.parse(localStorage.getItem(key));
      } catch {
        return null;
      }
    },
    setObject: (key, value) => localStorage.setItem(key, JSON.stringify(value))
  }
});

