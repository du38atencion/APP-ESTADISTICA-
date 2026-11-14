import { test, expect } from "@playwright/test";
import { resolve } from "node:path";
import { readFileSync } from "node:fs";

test("HTML empaquetado: sin recursos externos, guarda y exporta", async ({
  browser,
}) => {
  const context = await browser.newContext({
    offline: true,
    acceptDownloads: true,
  });
  const page = await context.newPage();
  const errors: string[] = [];
  const network: string[] = [];
  page.on("pageerror", (e) => errors.push(e.message));
  page.on("request", (r) => {
    if (/^https?:/.test(r.url())) network.push(r.url());
  });
  const html = readFileSync(resolve("portable/index.html"), "utf8");
  await context.route("http://localhost:48123/**", (route) =>
    route.fulfill({ status: 200, contentType: "text/html", body: html }),
  );
  await page.goto("http://localhost:48123/");
  await expect(
    page.getByRole("heading", { name: "Dashboard general", exact: true }),
  ).toBeVisible();
  await page.getByRole("button", { name: "Cargar datos", exact: true }).click();
  await page.getByText("Captura manual opcional", { exact: true }).click();
  for (const [name, value] of Object.entries({
    product: "Prueba portátil",
    lot: "PC-01",
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
  await page.reload();
  await page
    .getByRole("button", { name: "Lotes e historial", exact: true })
    .click();
  await expect(page.locator("tbody tr")).toHaveCount(1);
  await expect(page.locator("tbody")).toContainText("PC-01");
  await page
    .getByRole("button", { name: "Reportes y exportación", exact: true })
    .click();
  for (const name of ["CSV", "Excel", "Descargar respaldo completo"]) {
    const download = page.waitForEvent("download");
    await page.getByRole("button", { name, exact: true }).click();
    const file = await download;
    expect(await file.failure()).toBeNull();
  }
  await page
    .getByRole("button", { name: "Dashboard general", exact: true })
    .click();
  await page.getByRole("button", { name: "Explorar demo" }).click();
  await expect(page.locator(".recharts-line")).not.toHaveCount(0);
  expect(errors).toEqual([]);
  expect(network.every((url) => url === "http://localhost:48123/")).toBe(true);
  await context.close();
});
