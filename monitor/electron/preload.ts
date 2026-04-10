import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("junction", {
  onUrl: (callback: (url: string) => void) => {
    ipcRenderer.on("junction-url", (_event, url: string) => callback(url));
  },
  defaultUrl: "http://localhost:4200",
});
