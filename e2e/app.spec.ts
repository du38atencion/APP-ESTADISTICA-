import { test, expect } from "@playwright/test";
async function fillMeasurement(page: any, lot = "LOTE-01", draft = false) {
  await page
    .getByRole("button", { name: "Nueva medición", exact: true })
    .click();
  await page.getByLabel("Producto *", { exact: true }).fill("Producto real");
  await page.getByLabel("Número de lote *").fill(lot);
  await page.getByLabel("Operador *", { exact: true }).fill("Ana");
  await page.getByLabel("Instrumento / prototipo *").fill("PRO-01");
  await page.locator('input[name="ph"]').fill("7.1");
  if (!draft) {
    await page.locator('input[name="temperature"]').fill("24");
    await page.locator('input[name="humidity"]').fill("55");
  }
  await page
    .getByRole("button", {
      name: draft ? "Guardar borrador" : "Guardar medición",
      exact: true,
    })
    .click();
}
test("captura, persistencia, filtros, corrección trazable y exportación", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await expect(page.getByText("Esperando primera lectura")).toHaveCount(3);
  await fillMeasurement(page);
  await expect(page.getByRole("status")).toContainText("Guardado");
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.reload();
  await page
    .getByRole("button", { name: "Lotes e historial", exact: true })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByLabel("Buscar registros").fill("inexistente");
  await expect(page.locator("tbody tr")).toHaveCount(0);
  await page.getByRole("button", { name: "Limpiar", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Editar", exact: true }).click();
  await page.locator('input[name="ph"]').fill("7.2");
  await page
    .getByLabel("Motivo de la corrección *")
    .fill("Corrección de transcripción");
  await page
    .getByRole("button", { name: "Guardar medición", exact: true })
    .click();
  await expect(page.locator("tbody")).toContainText("7.2");
  await page.locator("tbody .link").first().click();
  await expect(
    page.getByRole("heading", { name: "Historial", exact: true }),
  ).toBeVisible();
  await expect(page.locator(".modal")).toContainText(
    "Corrección de transcripción",
  );
  await page.getByRole("button", { name: "Cerrar detalle" }).click();
  const dl = page.waitForEvent("download");
  await page.getByRole("button", { name: "Exportar CSV" }).click();
  const file = await dl;
  expect(file.suggestedFilename()).toBe("q-monitor.csv");
  await page
    .getByRole("button", { name: "Reportes y exportación", exact: true })
    .click();
  const excel = page.waitForEvent("download");
  await page.getByRole("button", { name: "Excel", exact: true }).click();
  expect((await excel).suggestedFilename()).toBe("q-monitor.xlsx");
  const backup = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descargar respaldo completo" })
    .click();
  expect((await backup).suggestedFilename()).toContain("real-respaldo");
  expect(errors).toEqual([]);
});
test("borradores sin lecturas faltantes convertidas en cero", async ({
  page,
}) => {
  await page.goto("/");
  await fillMeasurement(page, "BORRADOR", true);
  await expect(page.locator("tbody")).toContainText("Borrador");
  await page
    .getByRole("button", { name: "Análisis estadístico", exact: true })
    .click();
  await expect(page.getByText("Aún no hay mediciones").first()).toBeVisible();
});
test("demostración separada, gráficas reales y navegación de ocho módulos", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar demo" }).click();
  await expect(page.locator(".demo-banner")).toContainText(
    "DATOS DE DEMOSTRACIÓN",
  );
  await expect(page.locator(".recharts-line")).not.toHaveCount(0);
  for (const name of [
    "Análisis estadístico",
    "Validación metrológica",
    "Alertas y desviaciones",
    "Reportes y exportación",
    "Configuración",
  ]) {
    await page.getByRole("button", { name, exact: true }).click();
    await expect(
      page.getByRole("heading", { level: 1, name, exact: true }),
    ).toBeVisible();
  }
  await page.getByRole("button", { name: "Volver a datos reales" }).click();
  await page
    .getByRole("button", { name: "Dashboard general", exact: true })
    .click();
  await expect(page.getByText("Esperando primera lectura")).toHaveCount(3);
  expect(errors).toEqual([]);
});
test("metrología calcula diferencias y conserva pares", async ({ page }) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Validación metrológica", exact: true })
    .click();
  for (const [name, value] of Object.entries({
    sample: "M1",
    session: "S1",
    prototype: "7.2",
    reference: "7",
    instrument: "REF1",
    method: "Comparación directa",
    conditions: "23 °C",
    repetition: "1",
    tolerance: "0.1",
    notes: "Protocolo experimental",
  })) {
    await page.locator(`[name="${name}"]`).fill(value);
  }
  await page.getByRole("button", { name: "Guardar comparación" }).click();
  await expect(page.getByRole("status")).toContainText("0.2 pH");
  await expect(page.locator("tbody").first()).toContainText(
    "Fuera de especificación",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Validación metrológica", exact: true })
    .click();
  await expect(page.locator("tbody").first().locator("tr")).toHaveCount(1);
});
test("interfaz móvil sin desbordamiento y navegación funcional", async ({
  page,
}) => {
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
  await page.getByRole("button", { name: "Menú", exact: true }).click();
  await page
    .getByRole("button", { name: "Registro de mediciones", exact: true })
    .click();
  await expect(
    page.getByRole("heading", { name: "Nueva medición manual" }),
  ).toBeVisible();
  expect(
    await page.evaluate(
      () => document.documentElement.scrollWidth <= innerWidth,
    ),
  ).toBe(true);
});

test("criterios configurables, revisión y límites históricos", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  for (const [variable, lower, upper] of [
    ["ph", "6", "8"],
    ["temperature", "20", "25"],
    ["humidity", "40", "60"],
  ]) {
    const form = page.locator("form").nth(1);
    await form.locator('[name="product"]').fill("Producto real");
    await form.locator('[name="stage"]').fill("Producto terminado");
    await form.locator('[name="variable"]').selectOption(variable);
    await form.locator('[name="lower"]').fill(lower);
    await form.locator('[name="upper"]').fill(upper);
    await form.locator('[name="effective"]').fill("2020-01-01");
    await form
      .locator('[name="source"]')
      .fill("Protocolo aprobado del proyecto");
    await page.getByRole("button", { name: "Añadir criterio" }).click();
  }
  await fillMeasurement(page);
  await expect(page.locator("tbody")).toContainText("Pendiente de revisión");
  await page.locator("tbody .link").click();
  await page.getByRole("button", { name: "Documentar revisión" }).click();
  const review = page.getByRole("dialog", {
    name: "Documentar revisión",
    exact: true,
  });
  await review.getByLabel("Responsable *").fill("Responsable QA");
  await review.getByRole("button", { name: "Confirmar revisión" }).click();
  await expect(page.locator("tbody")).toContainText("Conforme");
  await page
    .getByRole("button", { name: "Configuración", exact: true })
    .click();
  page.once("dialog", (d) => d.accept());
  await page
    .getByRole("button", { name: "Desactivar", exact: true })
    .first()
    .click();
  await page
    .getByRole("button", { name: "Lotes e historial", exact: true })
    .click();
  await expect(page.locator("tbody")).toContainText("Conforme");
});
test("respaldo restaura datos y rechaza formato incorrecto", async ({
  page,
}) => {
  await page.goto("/");
  await fillMeasurement(page);
  await page
    .getByRole("button", { name: "Reportes y exportación", exact: true })
    .click();
  const waiting = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descargar respaldo completo" })
    .click();
  const file = await waiting,
    path = await file.path();
  await page.evaluate(() => localStorage.removeItem("qmonitor-real"));
  await page.reload();
  await page
    .getByRole("button", { name: "Reportes y exportación", exact: true })
    .click();
  page.once("dialog", (d) => d.accept());
  await page.locator('input[type="file"]').setInputFiles(path!);
  await expect(page.getByRole("status")).toContainText("restaurado");
  await page
    .getByRole("button", { name: "Lotes e historial", exact: true })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page
    .getByRole("button", { name: "Reportes y exportación", exact: true })
    .click();
  await page.locator('input[type="file"]').setInputFiles({
    name: "invalido.json",
    mimeType: "application/json",
    buffer: Buffer.from('{"version":1}'),
  });
  await expect(page.getByRole("alert")).toContainText("inválido");
});
test("gráficas analíticas y control con validación de supuestos", async ({
  page,
}) => {
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await page.goto("/");
  await page.getByRole("button", { name: "Explorar demo" }).click();
  await page
    .getByRole("button", { name: "Análisis estadístico", exact: true })
    .click();
  for (const kind of [
    "Dispersión",
    "Diagrama de caja",
    "Tendencia",
    "Control I-MR",
  ]) {
    await page.getByLabel("Visualización").selectOption(kind);
    if (kind === "Control I-MR")
      await expect(
        page.getByText("Se requieren al menos 20", { exact: false }).first(),
      ).toBeVisible();
    else expect(await page.locator("svg").count()).toBeGreaterThan(0);
  }
  expect(errors).toEqual([]);
});

test("anulación exige motivo, se puede cancelar y conserva trazabilidad al recargar", async ({
  page,
}) => {
  await page.goto("/");
  await fillMeasurement(page);
  await page.getByRole("button", { name: "Anular", exact: true }).click();
  let action = page.getByRole("dialog", {
    name: "Anular medición",
    exact: true,
  });
  await expect(action).toBeVisible();
  await expect(
    action.getByRole("button", { name: "Confirmar anulación" }),
  ).toBeDisabled();
  await action.getByLabel("Motivo de la anulación *").fill("   ");
  await expect(
    action.getByRole("button", { name: "Confirmar anulación" }),
  ).toBeDisabled();
  await page.keyboard.press("Escape");
  await expect(action).not.toBeVisible();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await page.getByRole("button", { name: "Anular", exact: true }).click();
  action = page.getByRole("dialog", { name: "Anular medición", exact: true });
  await action
    .getByLabel("Motivo de la anulación *")
    .fill("Lectura transcrita incorrectamente");
  await action.getByLabel("Responsable *").fill("Control de calidad");
  await action.getByRole("button", { name: "Confirmar anulación" }).click();
  await expect(page.locator("tbody tr")).toHaveCount(0);
  await expect(page.getByRole("status")).toContainText("anulada");
  await page.reload();
  await page
    .getByRole("button", { name: "Lotes e historial", exact: true })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(0);
  const data = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("qmonitor-real")!),
  );
  expect(data.measurements).toHaveLength(1);
  expect(data.measurements[0]).toMatchObject({
    voided: true,
    ph: 7.1,
    temperature: 24,
    humidity: 55,
  });
  expect(data.measurements[0].audit.at(-1)).toMatchObject({
    actor: "Control de calidad",
    action: "Anulación",
    reason: "Lectura transcrita incorrectamente",
  });
});

test("un fallo de almacenamiento mantiene abierto el diálogo sin anular el registro", async ({
  page,
}) => {
  await page.goto("/");
  await fillMeasurement(page);
  await page.getByRole("button", { name: "Anular", exact: true }).click();
  const action = page.getByRole("dialog", {
    name: "Anular medición",
    exact: true,
  });
  await action
    .getByLabel("Motivo de la anulación *")
    .fill("Registro duplicado");
  await page.evaluate(() => {
    Storage.prototype.setItem = () => {
      throw new DOMException("Espacio agotado", "QuotaExceededError");
    };
  });
  await action.getByRole("button", { name: "Confirmar anulación" }).click();
  await expect(action).toBeVisible();
  await expect(action.getByRole("alert")).toContainText("No se guardaron");
  const record = await page.evaluate(
    () => JSON.parse(localStorage.getItem("qmonitor-real")!).measurements[0],
  );
  expect(record.voided).toBe(false);
  expect(record.audit).toHaveLength(1);
  await action.getByRole("button", { name: "Cancelar", exact: true }).click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
});
