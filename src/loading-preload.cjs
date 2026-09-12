const { contextBridge, ipcRenderer } = require('electron')

if (location.protocol === 'file:') contextBridge.exposeInMainWorld('desktopRecovery', {
  retry: () => ipcRenderer.invoke('desktop:retry'),
  openLogs: () => ipcRenderer.invoke('desktop:open-logs'),
})
