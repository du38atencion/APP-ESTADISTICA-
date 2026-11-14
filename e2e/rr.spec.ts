import { test, expect, type Page } from "@playwright/test";
import { demo } from "../src/domain";
import writeExcel from "write-excel-file/node";
const upload = async (page: Page, name: string, values: string) =>
  page
    .getByLabel("Cargar archivo de valores", { exact: true })
    .setInputFiles({
      name,
      mimeType: "text/plain",
      buffer: Buffer.from(values),
    });
const readStat = (page: Page, label: string) =>
  page
    .getByTestId("auto-stats")
    .locator("div")
    .filter({ has: page.getByText(label, { exact: true }) })
    .locator("strong");
test("cargar solo valores genera resultados sin campos R&R y conserva datos anteriores", async ({
  page,
}) => {
  const legacy = demo();
  legacy.simulation = { source: "legado" };
  await page.goto("/");
  await page.evaluate(
    (s) => localStorage.setItem("qmonitor-real", JSON.stringify(s)),
    legacy,
  );
  await page.reload();
  await page.getByRole("button", { name: "Cargar datos", exact: true }).click();
  await expect(
    page.getByRole("heading", { name: "Nueva medición manual", exact: true }),
  ).not.toBeVisible();
  await upload(
    page,
    "temperatura.csv",
    "Temperatura (°C)\n" +
      Array.from({ length: 24 }, (_, i) => 20 + i).join("\n"),
  );
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: "Análisis estadístico",
      exact: true,
    }),
  ).toBeVisible();
  await expect(readStat(page, "Lecturas")).toHaveText("24");
  await expect(readStat(page, "Media")).toHaveText("31.5");
  await expect(
    page.getByTestId("auto-charts").locator(".rr-chart"),
  ).toHaveCount(4);
  await expect(page.getByLabel("Parte *", { exact: true })).toHaveCount(0);
  await expect(page.getByLabel("Operador R&R *", { exact: true })).toHaveCount(
    0,
  );
  await expect(page.getByLabel("Repetición *", { exact: true })).toHaveCount(0);
  await expect(page.getByTestId("rr-unavailable")).toContainText(
    "no estimable",
  );
  await page.reload();
  await page
    .getByRole("button", { name: "Análisis estadístico", exact: true })
    .click();
  await expect(readStat(page, "Media")).toHaveText("31.5");
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("qmonitor-real")!),
  );
  expect(saved.measurements).toEqual(legacy.measurements);
  expect(saved.rules).toEqual(legacy.rules);
  expect(saved.trials).toEqual(legacy.trials);
  expect(saved.simulation).toEqual(legacy.simulation);
  await page
    .getByRole("button", { name: "Reportes y exportación", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descargar respaldo completo", exact: true })
    .click();
  const file = await download;
  const fs = await import("node:fs/promises");
  expect(
    JSON.parse(await fs.readFile((await file.path())!, "utf8"))
      .analysisDatasets,
  ).toEqual(saved.analysisDatasets);
});
test("las gráficas se actualizan al cargar otro archivo, sin botón calcular; importación inválida conserva datos", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Análisis estadístico", exact: true })
    .click();
  await upload(page, "primero.json", "[1,2,3]");
  await expect(readStat(page, "Media")).toHaveText("2");
  const curve = page.locator(
    '[aria-label="Tendencia automática"] .recharts-line-curve',
  );
  const before = await curve.getAttribute("d");
  await upload(page, "segundo.csv", "Valor\n10\n20\n40\n80");
  await expect(readStat(page, "Media")).toHaveText("37.5");
  await expect(curve).not.toHaveAttribute("d", before!);
  const stored = await page.evaluate(() =>
    localStorage.getItem("qmonitor-real"),
  );
  await upload(page, "invalido.csv", "Valor\n10\nno-numérico");
  await expect(page.getByRole("alert")).toContainText("no numéricos");
  expect(
    await page.evaluate(() => localStorage.getItem("qmonitor-real")),
  ).toEqual(stored);
  await page.setViewportSize({ width: 390, height: 844 });
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
  await page.emulateMedia({ media: "print" });
  await expect(page.getByTestId("auto-stats")).toBeVisible();
  await expect(
    page.getByLabel("Cargar archivo de valores", { exact: true }),
  ).not.toBeVisible();
});
test("Excel XLSX se carga sin escribir valores ni metadatos", async ({
  page,
}) => {
  const buffer = await writeExcel([
    [{ value: "Temperatura (°C)" }],
    [{ value: 20, type: Number }],
    [{ value: 22, type: Number }],
    [{ value: 24, type: Number }],
  ]).toBuffer();
  await page.goto("/");
  await page
    .getByRole("button", { name: "Análisis estadístico", exact: true })
    .click();
  await page
    .getByLabel("Cargar archivo de valores", { exact: true })
    .setInputFiles({
      name: "datos.xlsx",
      mimeType:
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      buffer,
    });
  await expect(readStat(page, "Lecturas")).toHaveText("3");
  await expect(readStat(page, "Media")).toHaveText("22");
});
test("R&R se calcula automáticamente solo si el archivo ya contiene identificación, sin mostrar formularios", async ({
  page,
}) => {
  const rows = [1, 2, 3].flatMap((part) =>
    ["Ana", "Luis"].flatMap((op, j) =>
      [1, 2].map((rep) =>
        [part, op, rep, 10 + part + j * 0.1 + rep * 0.05].join(";"),
      ),
    ),
  );
  await page.goto("/");
  await page
    .getByRole("button", { name: "Análisis estadístico", exact: true })
    .click();
  await upload(
    page,
    "rr.csv",
    "Parte;Operador;Repetición;Medición\n" + rows.join("\n"),
  );
  await expect(page.getByTestId("rr-count")).toHaveText("12");
  await expect(page.getByTestId("rr-report")).toBeVisible();
  await expect(page.getByLabel("Parte *", { exact: true })).toHaveCount(0);
  await page.emulateMedia({ media: "print" });
  await expect(page.getByTestId("rr-report")).toBeVisible();
});
test("un fallo de almacenamiento no confirma la carga ni pierde los datos existentes", async ({
  page,
}) => {
  await page.goto("/");
  await page
    .getByRole("button", { name: "Análisis estadístico", exact: true })
    .click();
  await upload(page, "original.json", "[1,2,3]");
  const stored = await page.evaluate(() =>
    localStorage.getItem("qmonitor-real"),
  );
  await page.evaluate(() => {
    Storage.prototype.setItem = function () {
      throw Error("Disco lleno");
    };
  });
  await upload(page, "nuevo.json", "[10,20,30]");
  await expect(
    page.getByRole("alert").filter({ hasText: "No se guardó el archivo" }),
  ).toBeVisible();
  await expect(readStat(page, "Media")).toHaveText("2");
  expect(
    await page.evaluate(() => localStorage.getItem("qmonitor-real")),
  ).toEqual(stored);
});
