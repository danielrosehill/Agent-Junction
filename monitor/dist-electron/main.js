"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const electron_1 = require("electron");
const path = __importStar(require("path"));
let mainWindow = null;
let tray = null;
const junctionUrl = process.argv.find((a) => a.startsWith("--junction-url="))?.split("=")[1] ??
    process.env.JUNCTION_URL ??
    "http://localhost:4200";
function createWindow() {
    mainWindow = new electron_1.BrowserWindow({
        width: 1100,
        height: 750,
        minWidth: 800,
        minHeight: 500,
        title: "Agent Junction Monitor",
        backgroundColor: "#0d1117",
        webPreferences: {
            preload: path.join(__dirname, "preload.js"),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });
    // Load Vite dev server or built files
    const isDev = process.env.NODE_ENV !== "production" && !electron_1.app.isPackaged;
    if (isDev) {
        mainWindow.loadURL("http://localhost:5173");
    }
    else {
        mainWindow.loadFile(path.join(__dirname, "../dist/index.html"));
    }
    mainWindow.on("close", (e) => {
        if (tray) {
            e.preventDefault();
            mainWindow?.hide();
        }
    });
    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}
function createTray() {
    // Simple 16x16 tray icon — a green circle
    const icon = electron_1.nativeImage.createFromDataURL("data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA" +
        "OklEQVQ4y2Ng+M9AHGBiIBKMGmBAAyxE2sxCjCasgRCN2PwQTIwmfIYQbQs+Q4i2BZ8h" +
        "RNuCzxAAACpCBVnplcYAAAAASUVORK5CYII=");
    tray = new electron_1.Tray(icon);
    tray.setToolTip("Agent Junction Monitor");
    const contextMenu = electron_1.Menu.buildFromTemplate([
        {
            label: "Show",
            click: () => {
                mainWindow?.show();
                mainWindow?.focus();
            },
        },
        { type: "separator" },
        {
            label: "Quit",
            click: () => {
                tray?.destroy();
                tray = null;
                electron_1.app.quit();
            },
        },
    ]);
    tray.setContextMenu(contextMenu);
    tray.on("double-click", () => {
        mainWindow?.show();
        mainWindow?.focus();
    });
}
electron_1.app.whenReady().then(() => {
    createWindow();
    createTray();
    // Pass junction URL to renderer via a custom protocol or env
    mainWindow?.webContents.on("did-finish-load", () => {
        mainWindow?.webContents.send("junction-url", junctionUrl);
    });
});
electron_1.app.on("window-all-closed", () => {
    if (process.platform !== "darwin" && !tray) {
        electron_1.app.quit();
    }
});
electron_1.app.on("activate", () => {
    if (mainWindow === null) {
        createWindow();
    }
});
