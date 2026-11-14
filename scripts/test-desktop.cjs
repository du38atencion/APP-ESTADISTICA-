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
    executablePath: process.env.Q_MONITOR_ELECTRON_EXECUTABLE || undefined,
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
    app = await electron.launch({
      ...options,
      args: [
        process.env.Q_MONITOR_PREVIOUS_APP || root,
        ...options.args.slice(1),
      ],
    });
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
    // Exercise the actual desktop button; window.prompt is unsupported in Electron.
    await page
      .getByRole("button", { name: "Lotes e historial", exact: true })
      .click();
    await page.getByRole("button", { name: "Anular", exact: true }).click();
    let actionDialog = page.getByRole("dialog", {
      name: "Anular medición",
      exact: true,
    });
    await expect(actionDialog).toBeVisible();
    await expect(
      actionDialog.getByRole("button", { name: "Confirmar anulación" }),
    ).toBeDisabled();
    await actionDialog.getByLabel("Motivo de la anulación *").fill("  ");
    await expect(
      actionDialog.getByRole("button", { name: "Confirmar anulación" }),
    ).toBeDisabled();
    await actionDialog
      .getByLabel("Motivo de la anulación *")
      .fill("Se cancela esta operación");
    await actionDialog
      .getByRole("button", { name: "Cancelar", exact: true })
      .click();
    await expect(page.locator("tbody tr")).toHaveCount(1);
    assert.equal(
      await page.evaluate(
        () =>
          JSON.parse(localStorage.getItem("qmonitor-real")).measurements[0]
            .voided,
      ),
      false,
    );
    await page.getByRole("button", { name: "Anular", exact: true }).click();
    actionDialog = page.getByRole("dialog", {
      name: "Anular medición",
      exact: true,
    });
    await actionDialog.getByLabel("Responsable *").fill("Responsable QA");
    await actionDialog
      .getByLabel("Motivo de la anulación *")
      .fill("Error de transcripción confirmado");
    await actionDialog
      .getByRole("button", { name: "Confirmar anulación", exact: true })
      .click();
    await expect(actionDialog).not.toBeVisible();
    await expect(page.getByRole("status")).toContainText("anulada");
    await expect(page.locator("tbody tr")).toHaveCount(0);
    let record = await page.evaluate(
      () => JSON.parse(localStorage.getItem("qmonitor-real")).measurements[0],
    );
    assert.equal(record.voided, true);
    assert.equal(record.ph, 7);
    assert.equal(record.audit.at(-1).actor, "Responsable QA");
    assert.equal(
      record.audit.at(-1).reason,
      "Error de transcripción confirmado",
    );
    await app.close();
    app = await electron.launch(options);
    page = await app.firstWindow();
    page.on("pageerror", (error) => errors.push(error.message));
    await expect(page.getByText("Esperando primera lectura")).toHaveCount(3);
    await page
      .getByRole("button", { name: "Lotes e historial", exact: true })
      .click();
    await expect(page.locator("tbody tr")).toHaveCount(0);
    await page
      .getByRole("button", { name: "Configuración", exact: true })
      .click();
    await expect(
      page.getByRole("row", {
        name: /Responsable QA.*Anulación.*Error de transcripción confirmado/,
      }),
    ).toBeVisible();
    // The other former prompt (review responsibility) also works in a desktop dialog.
    await page
      .getByRole("button", { name: "Dashboard general", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Explorar demo", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Lotes e historial", exact: true })
      .click();
    await page
      .getByRole("combobox", { name: "Estado", exact: true })
      .selectOption("Pendiente de revisión");
    const pending = await page.locator("tbody tr").count();
    await page.locator("tbody .link").first().click();
    await page
      .getByRole("button", { name: "Documentar revisión", exact: true })
      .click();
    const reviewDialog = page.getByRole("dialog", {
      name: "Documentar revisión",
      exact: true,
    });
    await expect(
      reviewDialog.getByRole("button", { name: "Confirmar revisión" }),
    ).toBeDisabled();
    await reviewDialog.getByLabel("Responsable *").fill("Revisor QA");
    await reviewDialog
      .getByLabel("Notas de revisión (opcional)")
      .fill("Lecturas y límites revisados");
    await reviewDialog
      .getByRole("button", { name: "Confirmar revisión", exact: true })
      .click();
    await expect(page.getByRole("status")).toContainText("Revisión");
    await expect(page.locator("tbody tr")).toHaveCount(pending - 1);
    const networkResult = await app.evaluate(({ BrowserWindow }) => {
      return BrowserWindow.getAllWindows()[0].webContents.executeJavaScript(
        "fetch('https://example.com').catch(() => 'blocked')",
      );
    });
    assert.equal(networkResult, "blocked");
    await page
      .getByRole("button", { name: "Volver a datos reales", exact: true })
      .click();
    await page
      .getByRole("button", { name: "Análisis estadístico", exact: true })
      .click();
    await page
      .getByLabel("Nombre del sistema de medición")
      .fill("R&R escritorio");
    await page.getByLabel("Característica medida").fill("Diámetro");
    await page.getByLabel("Unidad *", { exact: true }).fill("mm");
    await page
      .getByRole("button", { name: "Guardar estudio", exact: true })
      .click();
    await page
      .getByText("Agregar varias lecturas desde Excel o una tabla", {
        exact: true,
      })
      .click();
    const rrRows = [1, 2, 3]
      .flatMap((part) =>
        ["Ana", "Luis"].flatMap((operator, index) =>
          [1, 2].map((repetition) =>
            [
              part,
              operator,
              repetition,
              10 + part + index * 0.1 + repetition * 0.05,
            ].join(";"),
          ),
        ),
      )
      .join("\n");
    await page.getByLabel("Tabla de lecturas R&R").fill(rrRows);
    await page
      .getByRole("button", { name: "Agregar tabla de lecturas", exact: true })
      .click();
    await expect(page.getByTestId("rr-count")).toHaveText("12");
    await expect(page.locator(".rr-chart")).toHaveCount(6);
    await page
      .getByText("Datos guardados del estudio (12)", { exact: true })
      .click();
    const previous = await page.getByTestId("rr-verdict").innerText();
    await page
      .getByRole("button", {
        name: "Corregir lectura 1 / Ana / 1",
        exact: true,
      })
      .click();
    await page.getByLabel("Medición (mm) *", { exact: true }).fill("11.8");
    await page
      .getByRole("button", { name: "Guardar corrección R&R", exact: true })
      .click();
    await expect(page.getByTestId("rr-verdict")).not.toHaveText(previous);
    const savedRr = await page.getByTestId("rr-verdict").innerText();
    await app.close();
    app = await electron.launch(options);
    page = await app.firstWindow();
    page.on("pageerror", (error) => errors.push(error.message));
    await page
      .getByRole("button", { name: "Análisis estadístico", exact: true })
      .click();
    await expect(page.getByTestId("rr-count")).toHaveText("12");
    await expect(page.getByTestId("rr-verdict")).toHaveText(savedRr);
    record = await page.evaluate(
      () => JSON.parse(localStorage.getItem("qmonitor-real")).measurements[0],
    );
    assert.equal(record.lot, "EXE-01");
    assert.equal(record.ph, 7);
    assert.equal(record.voided, true);
    assert.deepEqual(errors, []);
    console.log(
      "Escritorio Electron: ventana propia, aislamiento, captura, persistencia tras cerrar/reabrir, CSV, Excel, respaldo JSON, anulación persistente con motivo/cancelación y revisión, R&R ANOVA, actualización de gráficas y persistencia del estudio verificados.",
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
