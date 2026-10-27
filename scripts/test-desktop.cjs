const { _electron: electron, expect } = require("@playwright/test");
const fs = require("node:fs");
const os = require("node:os");
const path = require("node:path");
const assert = require("node:assert/strict");

(async () => {
  const root = path.resolve(__dirname, "..");
  const sandbox = fs.mkdtempSync(path.join(os.tmpdir(), "q-monitor-desktop-"));
  const errors = [];
  const options = {
    args: [
      root,
      `--user-data-dir=${path.join(sandbox, "Q-MONITOR")}`,
      "--no-sandbox",
      "--disable-gpu",
    ],
    env: { ...process.env, DISPLAY: process.env.DISPLAY || ":99" },
    timeout: 30000,
  };
  let app;
  try {
    app = await electron.launch(options);
    let page = await app.firstWindow();
    page.on("pageerror", (error) => errors.push(error.message));
    await expect(
      page.getByRole("heading", { name: "Dashboard general", exact: true }),
    ).toBeVisible();
    const config = await app.evaluate(({ BrowserWindow, app }) => {
      const w = BrowserWindow.getAllWindows()[0];
      const prefs = w.webContents.getLastWebPreferences();
      return {
        nodeIntegration: prefs.nodeIntegration,
        contextIsolation: prefs.contextIsolation,
        sandbox: prefs.sandbox,
        data: app.getPath("userData"),
      };
    });
    assert.equal(page.url(), "qmonitor://app/index.html");
    assert.equal(config.nodeIntegration, false);
    assert.equal(config.contextIsolation, true);
    assert.equal(config.sandbox, true);
    assert.ok(config.data.startsWith(sandbox));
    await page
      .getByRole("button", { name: "Nueva medición", exact: true })
      .click();
    for (const [name, value] of Object.entries({
      product: "Prueba escritorio",
      lot: "EXE-01",
      operator: "Ana",
      instrument: "PRO-01",
      ph: "7",
      temperature: "23",
      humidity: "50",
    })) {
      await page.locator(`[name="${name}"]`).fill(value);
    }
    await page
      .getByRole("button", { name: "Guardar medición", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Guardado");
    await app.close();
    app = await electron.launch(options);
    page = await app.firstWindow();
    page.on("pageerror", (error) => errors.push(error.message));
    await page
      .getByRole("button", { name: "Lotes e historial", exact: true })
      .click();
    await expect(page.locator("tbody tr")).toHaveCount(1);
    await expect(page.locator("tbody")).toContainText("EXE-01");
    await page
      .getByRole("button", { name: "Reportes y exportación", exact: true })
      .click();
    for (const [name, file] of [
      ["CSV", "mediciones.csv"],
      ["Excel", "mediciones.xlsx"],
      ["Descargar respaldo completo", "respaldo.json"],
    ]) {
      const output = path.join(sandbox, file);
      await app.evaluate(({ session }, outputPath) => {
        session.defaultSession.once("will-download", (_event, item) =>
          item.setSavePath(outputPath),
        );
      }, output);
      await page.getByRole("button", { name, exact: true }).click();
      await expect
        .poll(() => fs.existsSync(output) && fs.statSync(output).size > 0)
        .toBe(true);
    }
    const data = JSON.parse(
      fs.readFileSync(path.join(sandbox, "respaldo.json"), "utf8"),
    );
    assert.equal(data.measurements[0].lot, "EXE-01");
    assert.equal(data.measurements[0].temperature, 23);
    const networkResult = await app.evaluate(({ BrowserWindow }) => {
      return BrowserWindow.getAllWindows()[0].webContents.executeJavaScript(
        "fetch('https://example.com').catch(() => 'blocked')",
      );
    });
    assert.equal(networkResult, "blocked");
    assert.deepEqual(errors, []);
    console.log(
      "Escritorio Electron: ventana propia, aislamiento, captura, persistencia tras cerrar/reabrir, CSV, Excel y respaldo JSON verificados.",
    );
  } finally {
    if (app) await app.close().catch(() => {});
    // Retain only an independent temporary test profile; never touch real user data.
    fs.rmSync(sandbox, {
      recursive: true,
      force: true,
      maxRetries: 10,
      retryDelay: 200,
    });
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
