import { z } from "zod";
import type { Measurement } from "./domain";
import type { RrStudy } from "./rr";

export const analysisPointSchema = z.object({
  id: z.string(),
  value: z.number().finite(),
  part: z.string().min(1).optional(),
  operator: z.string().min(1).optional(),
  repetition: z.number().int().min(1).max(10).optional(),
});
export const analysisSeriesSchema = z.object({
  id: z.string(),
  name: z.string(),
  unit: z.string(),
  points: z.array(analysisPointSchema).min(1),
  missing: z.number().int().nonnegative(),
  tolerance: z.number().finite().positive().nullable().optional(),
});
export const analysisDatasetSchema = z.object({
  id: z.string(),
  name: z.string(),
  loadedAt: z.string(),
  series: z.array(analysisSeriesSchema).min(1),
});
export type AnalysisPoint = z.infer<typeof analysisPointSchema>;
export type AnalysisSeries = z.infer<typeof analysisSeriesSchema>;
export type AnalysisDataset = z.infer<typeof analysisDatasetSchema>;
const clean = (value: unknown) => String(value ?? "").trim();
const key = (value: unknown) =>
  clean(value)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");
const identity = (header: unknown) =>
  /^(parte|part|pieza|muestra|sample|operador|operator|repeticion|repetition|replica|replicate|rep|id|codigo|fecha|date|lote|lot)$/.test(
    key(header),
  );
const numberValue = (value: unknown): number | null => {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  const text = clean(value);
  if (!/^[+-]?(?:\d+(?:[.,]\d*)?|[.,]\d+)(?:e[+-]?\d+)?$/i.test(text))
    return null;
  const n = Number(text.replace(",", "."));
  return Number.isFinite(n) ? n : null;
};
export function parseDelimited(text: string, plainText = false): unknown[][] {
  text = text.replace(/^\uFEFF/, "");
  const first = text.split(/\r?\n/).find((line) => line.trim()) ?? "";
  const delimiter = first.includes("\t")
    ? "\t"
    : first.includes(";")
      ? ";"
      : first.includes(",") && !plainText
        ? ","
        : "\0";
  // A one-column decimal-comma file is ambiguous; use a header or semicolons.
  const rows: string[][] = [],
    row: string[] = [];
  let cell = "",
    quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      if (quoted && text[i + 1] === '"') {
        cell += '"';
        i++;
      } else quoted = !quoted;
    } else if (!quoted && c === delimiter) {
      row.push(cell);
      cell = "";
    } else if (!quoted && (c === "\n" || c === "\r")) {
      if (c === "\r" && text[i + 1] === "\n") i++;
      row.push(cell);
      if (row.some((v) => v.trim())) rows.push([...row]);
      row.length = 0;
      cell = "";
    } else cell += c;
  }
  if (quoted) throw Error("El archivo contiene comillas sin cerrar.");
  row.push(cell);
  if (row.some((v) => v.trim())) rows.push([...row]);
  return rows;
}
export function parseJsonRows(value: unknown): unknown[][] {
  if (!Array.isArray(value) || !value.length)
    throw Error(
      "El JSON debe contener una lista de valores, filas u objetos con columnas numéricas.",
    );
  if (value.every((row) => typeof row === "number" || row === null))
    return value.map((v) => [v]);
  if (value.every(Array.isArray)) return value as unknown[][];
  if (
    value.every((row) => row && typeof row === "object" && !Array.isArray(row))
  ) {
    const headers = [...new Set(value.flatMap((row) => Object.keys(row)))];
    return [
      headers,
      ...value.map((row) =>
        headers.map((h) => (row as Record<string, unknown>)[h]),
      ),
    ];
  }
  throw Error("El JSON mezcla formatos de filas incompatibles.");
}
export function datasetFromRows(
  input: unknown[][],
  name: string,
  id = crypto.randomUUID(),
): AnalysisDataset {
  const rows = input.filter((row) => row.some((value) => clean(value) !== ""));
  if (rows.length > 100001) throw Error("El archivo supera 100000 filas.");
  if (!rows.length) throw Error("El archivo está vacío.");
  const first = rows[0];
  const hasHeader =
    first.some(identity) ||
    first.every((v) => clean(v) === "" || numberValue(v) === null);
  const width = Math.max(...rows.map((row) => row.length));
  if (width > 200) throw Error("El archivo supera 200 columnas.");
  const headers = Array.from({ length: width }, (_, i) =>
    hasHeader ? clean(first[i]) || `Serie ${i + 1}` : `Serie ${i + 1}`,
  );
  const data = hasHeader ? rows.slice(1) : rows;
  const column = (aliases: string[]) =>
    headers.findIndex((h) => aliases.includes(key(h)));
  const part = column(["parte", "part", "pieza", "muestra", "sample"]),
    operator = column(["operador", "operator"]),
    rep = column(["repeticion", "repetition", "replica", "replicate", "rep"]);
  const series: AnalysisSeries[] = [];
  headers.forEach((header, col) => {
    if (hasHeader && identity(header)) return;
    const present = data.map((row) => row[col]).filter((v) => clean(v) !== "");
    if (!present.length) return;
    const valid = present.filter((v) => numberValue(v) !== null);
    if (!valid.length) return; // Textual context columns are not measurements.
    if (valid.length !== present.length)
      throw Error(
        `La columna «${header}» contiene valores no numéricos. Corrige el archivo; no se importó ninguna fila.`,
      );
    const points: AnalysisPoint[] = [];
    data.forEach((row, i) => {
      const value = numberValue(row[col]);
      if (value === null) return;
      const point: AnalysisPoint = { id: `${id}-${col}-${i}`, value };
      if (part >= 0 && clean(row[part])) point.part = clean(row[part]);
      if (operator >= 0 && clean(row[operator]))
        point.operator = clean(row[operator]);
      if (rep >= 0 && numberValue(row[rep]) !== null) {
        const repetition = numberValue(row[rep])!;
        if (!Number.isInteger(repetition) || repetition < 1 || repetition > 10)
          throw Error(
            "La columna de repeticiones debe contener enteros de 1 a 10.",
          );
        point.repetition = repetition;
      }
      points.push(point);
    });
    const match = header.match(/\(([^)]+)\)|\[([^\]]+)\]/);
    series.push({
      id: `${id}-${col}`,
      name: header,
      unit: match?.[1] ?? match?.[2] ?? "unidad del archivo",
      points,
      missing: data.length - points.length,
    });
  });
  if (!series.length)
    throw Error(
      "No se encontraron columnas con valores numéricos. Usa CSV, TXT, TSV, XLSX o una lista JSON.",
    );
  return { id, name, loadedAt: new Date().toISOString(), series };
}
export function seriesFromMeasurements(rows: Measurement[]): AnalysisSeries[] {
  const result = new Map<string, AnalysisSeries>();
  const variables = [
    ["ph", "pH", "pH"],
    ["temperature", "Temperatura", "°C"],
    ["humidity", "Humedad", "%"],
  ] as const;
  for (const m of [...rows].sort((a, b) => a.date.localeCompare(b.date))) {
    if (m.draft || m.voided) continue;
    for (const [variable, label, unit] of variables) {
      const group = JSON.stringify([
        m.product,
        m.lot,
        m.stage,
        m.instrument,
        variable,
        variable === "humidity" ? m.moisture : "",
      ]);
      const series = result.get(group) ?? {
        id: group,
        name: `${label} · ${m.product} / ${m.lot} · ${m.instrument}${variable === "humidity" ? " · " + m.moisture : ""}`,
        unit: variable === "humidity" ? m.humidityUnit : unit,
        points: [],
        missing: 0,
      };
      const value = m[variable];
      if (value === null) series.missing++;
      else series.points.push({ id: m.id, value });
      result.set(group, series);
    }
  }
  return [...result.values()].filter((s) => s.points.length > 0);
}
export function seriesFromRrStudies(studies: RrStudy[]): AnalysisSeries[] {
  return studies
    .map((study) => ({
      id: study.id,
      name: `${study.name} · ${study.characteristic}`,
      unit: study.unit,
      tolerance: study.tolerance,
      points: study.readings.map((r) => ({ ...r })),
      missing: 0,
    }))
    .filter((s) => s.points.length > 0);
}
export function automaticRrStudy(
  series: AnalysisSeries,
  name: string,
): RrStudy | null {
  if (
    !series.points.length ||
    series.points.some((p) => !p.part || !p.operator || !p.repetition)
  )
    return null;
  return {
    id: series.id,
    name,
    date: "",
    reportedBy: "",
    characteristic: series.name,
    unit: series.unit,
    tolerance: series.tolerance ?? null,
    notes:
      "Calculado automáticamente a partir de las columnas identificadas en los datos cargados.",
    readings: series.points.map((p) => ({
      id: p.id,
      part: p.part!,
      operator: p.operator!,
      repetition: p.repetition!,
      value: p.value,
    })),
  };
}
