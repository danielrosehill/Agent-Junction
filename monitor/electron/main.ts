import { app, BrowserWindow, Tray, Menu, nativeImage } from "electron";
import * as path from "path";

let mainWindow: BrowserWindow | null = null;
let tray: Tray | null = null;

const junctionUrl =
  process.argv.find((a) => a.startsWith("--junction-url="))?.split("=")[1] ??
  process.env.JUNCTION_URL ??
  "http://localhost:4200";

function createWindow() {
  mainWindow = new BrowserWindow({
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
  const isDev = process.env.NODE_ENV !== "production" && !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL("http://localhost:5173");
  } else {
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
  const icon = nativeImage.createFromDataURL(
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAABAAAAAQCAYAAAAf8/9hAAAA" +
      "OklEQVQ4y2Ng+M9AHGBiIBKMGmBAAyxE2sxCjCasgRCN2PwQTIwmfIYQbQs+Q4i2BZ8h" +
      "RNuCzxAAACpCBVnplcYAAAAASUVORK5CYII="
  );
  tray = new Tray(icon);
  tray.setToolTip("Agent Junction Monitor");

  const contextMenu = Menu.buildFromTemplate([
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
        app.quit();
      },
    },
  ]);

  tray.setContextMenu(contextMenu);
  tray.on("double-click", () => {
    mainWindow?.show();
    mainWindow?.focus();
  });
}

app.whenReady().then(() => {
  createWindow();
  createTray();

  // Pass junction URL to renderer via a custom protocol or env
  mainWindow?.webContents.on("did-finish-load", () => {
    mainWindow?.webContents.send("junction-url", junctionUrl);
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin" && !tray) {
    app.quit();
  }
});

app.on("activate", () => {
  if (mainWindow === null) {
    createWindow();
  }
});
