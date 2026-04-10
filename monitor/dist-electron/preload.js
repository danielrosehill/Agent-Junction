"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
electron_1.contextBridge.exposeInMainWorld("junction", {
    onUrl: (callback) => {
        electron_1.ipcRenderer.on("junction-url", (_event, url) => callback(url));
    },
    defaultUrl: "http://localhost:4200",
});
