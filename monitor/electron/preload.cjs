const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("junction", {
  onUrl: (callback) => {
    ipcRenderer.on("junction-url", (_event, url) => callback(url));
  },
  defaultUrl: "http://localhost:4200",
});
