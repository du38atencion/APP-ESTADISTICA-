import { test, expect, type Page } from "@playwright/test";
import { demo } from "../src/domain";

const data = [-2, 0, 2].flatMap((part, i) =>
  [-0.5, 0.5].flatMap((operator, j) =>
    [-1, 1].map((e, k) => ({
      part: `P${i + 1}`,
      operator: j ? "B" : "A",
      repetition: k + 1,
      value: 10 + part + operator + (i - 1) * (j === 0 ? 1 : -1) + e * 0.2,
    })),
  ),
);
const table = data
  .map((r) => [r.part, r.operator, r.repetition, r.value].join(";"))
  .join("\n");
async function analysis(page: Page) {
  await page
    .getByRole("button", { name: "Análisis estadístico", exact: true })
    .click();
}
async function createStudy(page: Page) {
  await analysis(page);
  await page
    .getByLabel("Nombre del sistema de medición", { exact: false })
    .fill("Calibrador R&R");
  await page.getByLabel("Notificado por").fill("Responsable QA");
  await page.getByLabel("Característica medida").fill("Diámetro");
  await page.getByLabel("Unidad *", { exact: true }).fill("mm");
  await page.getByLabel("Amplitud de tolerancia").fill("10");
  await page
    .getByRole("button", { name: "Guardar estudio", exact: true })
    .click();
}
async function pasteTable(page: Page, text: string) {
  const details = page.locator("details").filter({
    has: page.getByText("Agregar varias lecturas desde Excel o una tabla", {
      exact: true,
    }),
  });
  if (!(await details.getAttribute("open").then((v) => v !== null)))
    await details.locator("summary").click();
  await page.getByLabel("Tabla de lecturas R&R").fill(text);
  await page
    .getByRole("button", { name: "Agregar tabla de lecturas", exact: true })
    .click();
}
test("R&R: conserva historial 1.0.x, calcula ANOVA, actualiza seis gráficas, persiste y respalda", async ({
  page,
}) => {
  const legacy = demo();
  legacy.simulation = { source: "legado" };
  legacy.economy = { cost: "123" };
  await page.goto("/");
  await page.evaluate(
    (s) => localStorage.setItem("qmonitor-real", JSON.stringify(s)),
    legacy,
  );
  await page.reload();
  const errors: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  await expect(
    page.getByRole("button", { name: "Simulación de procesos", exact: true }),
  ).toHaveCount(0);
  await expect(
    page.getByRole("button", { name: "Evaluación económica", exact: true }),
  ).toHaveCount(0);
  await createStudy(page);
  await pasteTable(page, "Parte;Operador;Repetición;Medición\n" + table);
  await expect(page.getByTestId("rr-count")).toHaveText("12");
  await expect(page.getByTestId("rr-verdict")).toContainText("63.621 %");
  await expect(page.getByTestId("rr-components")).toContainText("2.04");
  const charts = page.locator(".rr-chart");
  await expect(charts).toHaveCount(6);
  for (const c of await charts.all())
    await expect(c.locator("svg").first()).toBeVisible();
  for (const label of [
    "Gráfica R por operadores",
    "Gráfica Xbarra por operadores",
  ]) {
    await expect(
      page
        .locator(`.rr-chart[aria-label="${label}"]`)
        .getByText("LCS", { exact: true }),
    ).toBeVisible();
  }
  const before = await page.getByTestId("rr-verdict").innerText();
  const oldPath = await page
    .locator(
      '.rr-chart[aria-label="Interacción partes por operadores"] .recharts-line-curve',
    )
    .first()
    .getAttribute("d");
  await page
    .getByText("Datos guardados del estudio (12)", { exact: true })
    .click();
  await page
    .getByRole("button", { name: "Corregir lectura P1 / A / 1", exact: true })
    .click();
  await page.getByLabel("Medición (mm) *", { exact: true }).fill("9.9");
  await page
    .getByRole("button", { name: "Guardar corrección R&R", exact: true })
    .click();
  await expect(page.getByTestId("rr-verdict")).not.toHaveText(before);
  await expect(
    page
      .locator(
        '.rr-chart[aria-label="Interacción partes por operadores"] .recharts-line-curve',
      )
      .first(),
  ).not.toHaveAttribute("d", oldPath!);
  const saved = await page.evaluate(() =>
    JSON.parse(localStorage.getItem("qmonitor-real")!),
  );
  expect(saved.measurements).toEqual(legacy.measurements);
  expect(saved.rules).toEqual(legacy.rules);
  expect(saved.trials).toEqual(legacy.trials);
  expect(saved.simulation).toEqual(legacy.simulation);
  expect(saved.economy).toEqual(legacy.economy);
  const updated = await page.getByTestId("rr-verdict").innerText();
  await page.reload();
  await analysis(page);
  await expect(page.getByTestId("rr-verdict")).toHaveText(updated);
  await pasteTable(page, table.split("\n")[0]);
  await expect(page.getByRole("alert")).toContainText("duplicada");
  await expect(page.getByTestId("rr-count")).toHaveText("12");
  await page
    .getByRole("button", { name: "Reportes y exportación", exact: true })
    .click();
  const download = page.waitForEvent("download");
  await page
    .getByRole("button", { name: "Descargar respaldo completo", exact: true })
    .click();
  const file = await download;
  const fs = await import("node:fs/promises");
  const backup = JSON.parse(await fs.readFile((await file.path())!, "utf8"));
  expect(backup).toEqual(saved);
  await analysis(page);
  await page.emulateMedia({ media: "print" });
  await expect(page.getByTestId("rr-report")).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Exploración gráfica", exact: true }),
  ).not.toBeVisible();
  expect(errors).toEqual([]);
});
test("R&R incompleto no calcula hasta guardar la última réplica; importación inválida es atómica", async ({
  page,
}) => {
  await page.goto("/");
  await createStudy(page);
  await pasteTable(page, table.split("\n").slice(0, -1).join("\n"));
  await expect(page.getByTestId("rr-report")).toHaveCount(0);
  await expect(page.locator(".rr-analysis")).toContainText("Diseño incompleto");
  const last = data[data.length - 1];
  await page.getByLabel("Parte *", { exact: true }).fill(last.part);
  await page.getByLabel("Operador R&R *", { exact: true }).fill(last.operator);
  await page
    .getByLabel("Repetición *", { exact: true })
    .fill(String(last.repetition));
  await page
    .getByLabel("Medición (mm) *", { exact: true })
    .fill(String(last.value));
  await page
    .getByRole("button", { name: "Guardar lectura R&R", exact: true })
    .click();
  await expect(page.getByTestId("rr-count")).toHaveText("12");
  const before = await page.evaluate(() =>
    localStorage.getItem("qmonitor-real"),
  );
  await pasteTable(page, "P4;A;1;25\nP4;A;2;no-numérico");
  await expect(page.getByRole("alert")).toContainText("finita");
  expect(
    await page.evaluate(() => localStorage.getItem("qmonitor-real")),
  ).toEqual(before);
  await page.setViewportSize({ width: 390, height: 844 });
  await expect(page.getByTestId("rr-report")).toBeVisible();
  expect(
    await page.evaluate(() => document.documentElement.scrollWidth),
  ).toBeLessThanOrEqual(390);
});
test("R&R no confirma una lectura si falla el almacenamiento", async ({
  page,
}) => {
  await page.goto("/");
  await createStudy(page);
  await pasteTable(page, table);
  const before = await page.evaluate(() =>
    localStorage.getItem("qmonitor-real"),
  );
  await page.evaluate(() => {
    Storage.prototype.setItem = function () {
      throw Error("Disco lleno");
    };
  });
  await page.getByLabel("Parte *", { exact: true }).fill("P4");
  await page.getByLabel("Operador R&R *", { exact: true }).fill("A");
  await page.getByLabel("Medición (mm) *", { exact: true }).fill("25");
  await page
    .getByRole("button", { name: "Guardar lectura R&R", exact: true })
    .click();
  await expect(page.getByRole("alert")).toContainText("No se guardaron");
  await expect(page.getByTestId("rr-count")).toHaveText("12");
  expect(
    await page.evaluate(() => localStorage.getItem("qmonitor-real")),
  ).toEqual(before);
});
