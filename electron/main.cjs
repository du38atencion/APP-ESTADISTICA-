const {
  app,
  BrowserWindow,
  Menu,
  dialog,
  session,
  shell,
  protocol,
} = require("electron");
const path = require("node:path");
const { readFile } = require("node:fs/promises");

protocol.registerSchemesAsPrivileged([
  {
    scheme: "qmonitor",
    privileges: {
      standard: true,
      secure: true,
      supportFetchAPI: true,
      corsEnabled: true,
    },
  },
]);

app.setName("Q-MONITOR");
// A stable profile survives application updates and is separate from web/demo usage.
const profileOverride = app.commandLine.getSwitchValue("user-data-dir");
app.setPath(
  "userData",
  profileOverride
    ? path.resolve(profileOverride)
    : path.join(app.getPath("appData"), "Q-MONITOR"),
);
const singleInstance = app.requestSingleInstanceLock();
let window;
if (!singleInstance) app.quit();
else {
  app.on("second-instance", () => {
    if (!window) return;
    if (window.isMinimized()) window.restore();
    window.show();
    window.focus();
  });
  app
    .whenReady()
    .then(() => {
      const file = path.join(__dirname, "..", "portable", "index.html");
      const entryURL = "qmonitor://app/index.html";
      // Stable storage origin also survives portable executable extraction paths.
      protocol.handle("qmonitor", async (request) => {
        const url = new URL(request.url);
        if (
          url.hostname !== "app" ||
          !["/", "/index.html"].includes(url.pathname)
        )
          return new Response("No encontrado", { status: 404 });
        return new Response(await readFile(file), {
          headers: {
            "Content-Type": "text/html; charset=utf-8",
            "Content-Security-Policy":
              "default-src 'none'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; img-src data: blob:; font-src data:; worker-src blob:; connect-src 'none'; base-uri 'none'; form-action 'none'; object-src 'none'",
          },
        });
      });
      session.defaultSession.setPermissionRequestHandler(
        (_contents, _permission, callback) => callback(false),
      );
      session.defaultSession.setPermissionCheckHandler(() => false);
      // No network is required. Only bundled files and locally generated export blobs are used.
      session.defaultSession.webRequest.onBeforeRequest((details, callback) => {
        callback({
          cancel: !["qmonitor:", "blob:", "data:", "devtools:"].some((scheme) =>
            details.url.startsWith(scheme),
          ),
        });
      });
      window = new BrowserWindow({
        title: "Q-MONITOR | Calidad industrial",
        width: 1400,
        height: 940,
        minWidth: 800,
        minHeight: 600,
        backgroundColor: "#f4f7f9",
        show: false,
        icon: path.join(__dirname, "..", "build", "icon.png"),
        webPreferences: {
          nodeIntegration: false,
          contextIsolation: true,
          sandbox: true,
          webSecurity: true,
          devTools: !app.isPackaged,
          spellcheck: false,
        },
      });
      window.webContents.setUserAgent(
        window.webContents.getUserAgent() + " QMonitorDesktop",
      );
      window.webContents.setWindowOpenHandler(() => ({ action: "deny" }));
      window.webContents.on("will-navigate", (event, url) => {
        if (url !== entryURL) event.preventDefault();
      });
      window.webContents.on("will-attach-webview", (event) =>
        event.preventDefault(),
      );
      window.webContents.session.on("will-download", (_event, item) => {
        item.setSaveDialogOptions({
          title: "Guardar archivo de Q-MONITOR",
          defaultPath: path.join(
            app.getPath("downloads"),
            path.basename(item.getFilename()),
          ),
        });
      });
      window.webContents.on("did-fail-load", (_event, code, description) => {
        if (code === -3) return;
        dialog.showErrorBox(
          "No se pudo iniciar Q-MONITOR",
          `Código ${code}: ${description}. Reinstala la aplicación sin eliminar sus datos y conserva tus respaldos.`,
        );
      });
      window.once("ready-to-show", () => window.show());
      window.on("closed", () => {
        window = null;
      });
      Menu.setApplicationMenu(
        Menu.buildFromTemplate([
          {
            label: "Archivo",
            submenu: [
              {
                label: "Imprimir informe / PDF",
                accelerator: "CmdOrCtrl+P",
                click: () =>
                  window?.webContents.print({ printBackground: true }),
              },
              { type: "separator" },
              {
                label: "Salir",
                accelerator: "Alt+F4",
                click: () => app.quit(),
              },
            ],
          },
          {
            label: "Edición",
            submenu: [
              { label: "Deshacer", role: "undo" },
              { label: "Rehacer", role: "redo" },
              { type: "separator" },
              { label: "Cortar", role: "cut" },
              { label: "Copiar", role: "copy" },
              { label: "Pegar", role: "paste" },
              { label: "Seleccionar todo", role: "selectAll" },
            ],
          },
          {
            label: "Vista",
            submenu: [
              { label: "Acercar", role: "zoomIn" },
              { label: "Alejar", role: "zoomOut" },
              { label: "Restablecer zoom", role: "resetZoom" },
              { type: "separator" },
              { label: "Pantalla completa", role: "togglefullscreen" },
            ],
          },
          {
            label: "Ayuda",
            submenu: [
              {
                label: "Carpeta de datos locales",
                click: () => shell.openPath(app.getPath("userData")),
              },
              {
                label: "Acerca de Q-MONITOR",
                click: () =>
                  dialog.showMessageBox(window, {
                    type: "info",
                    title: "Q-MONITOR",
                    message: "Q-MONITOR · Calidad industrial",
                    detail: `Versión ${app.getVersion()}\nAplicación de escritorio para captura manual y análisis.\nFunciona sin Internet. No conecta sensores.\nLos datos se guardan únicamente en este equipo. Usa Reportes para descargar respaldos JSON.`,
                  }),
              },
            ],
          },
        ]),
      );
      window.loadURL(entryURL);
    })
    .catch((error) => {
      dialog.showErrorBox("Error al iniciar Q-MONITOR", error.message);
      app.quit();
    });
  app.on("before-quit", () => session.defaultSession?.flushStorageData());
  app.on("window-all-closed", () => app.quit());
}
