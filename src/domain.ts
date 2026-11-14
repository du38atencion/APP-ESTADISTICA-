import { z } from "zod";
import { rrStudySchema, validateRrReadings, type RrStudy } from "./rr";
export const variables = ["ph", "temperature", "humidity"] as const;
export type Variable = (typeof variables)[number];
export const labels: Record<Variable, string> = {
  ph: "pH",
  temperature: "Temperatura",
  humidity: "Humedad",
};
export type Rule = {
  id: string;
  product: string;
  stage: string;
  variable: Variable;
  moisture: string;
  lower: number | null;
  upper: number | null;
  resolution: number | null;
  source: string;
  effective: string;
  active: boolean;
};
export type Audit = {
  at: string;
  actor: string;
  action: string;
  reason: string;
};
export type Measurement = {
  id: string;
  product: string;
  lot: string;
  date: string;
  operator: string;
  stage: string;
  instrument: string;
  notes: string;
  ph: number | null;
  temperature: number | null;
  humidity: number | null;
  moisture: string;
  humidityUnit: string;
  location: string;
  phNotes: string;
  resolution: number | null;
  draft: boolean;
  voided: boolean;
  reviewed: boolean;
  rules: Rule[];
  audit: Audit[];
  deviations?: string;
};
export type Trial = {
  id: string;
  variable: Variable;
  moisture: string;
  unit: string;
  sample: string;
  date: string;
  prototype: number;
  reference: number;
  instrument: string;
  method: string;
  conditions: string;
  repetition: number;
  session: string;
  tolerance: number;
  notes: string;
};
export type State = {
  version: 1;
  name: string;
  organization: string;
  products: string[];
  operators: string[];
  instruments: string[];
  stages: string[];
  methods: string[];
  frequency: string;
  reportNotes: string;
  rules: Rule[];
  measurements: Measurement[];
  trials: Trial[];
  rrStudies?: RrStudy[];
  // Legacy fields retained only to preserve existing backups.
  simulation: Record<string, string>;
  economy: Record<string, string>;
};
export const initial = (): State => ({
  version: 1,
  name: "Q-MONITOR",
  organization: "Laboratorio de calidad",
  products: [],
  operators: [],
  instruments: [],
  stages: ["Producto terminado"],
  methods: [],
  frequency: "",
  reportNotes: "",
  rules: [],
  measurements: [],
  trials: [],
  simulation: {},
  economy: {},
});
export function number(value: string): number | null {
  return value.trim() === ""
    ? null
    : Number.isFinite(Number(value))
      ? Number(value)
      : null;
}
export function applicable(
  rules: Rule[],
  m: Pick<Measurement, "product" | "stage" | "date" | "moisture">,
) {
  return rules.filter(
    (r) =>
      r.active &&
      r.product === m.product &&
      r.stage === m.stage &&
      r.effective <= m.date &&
      (r.variable !== "humidity" || r.moisture === m.moisture),
  );
}
export function failures(m: Measurement) {
  return m.rules.filter(
    (r) =>
      m[r.variable] !== null &&
      ((r.lower !== null && m[r.variable]! < r.lower) ||
        (r.upper !== null && m[r.variable]! > r.upper)),
  );
}
export function status(m: Measurement) {
  if (m.voided) return "Anulado";
  if (m.draft) return "Borrador";
  if (failures(m).length) return "Fuera de especificación";
  if (
    variables.some((v) => m[v] === null) ||
    variables.some((v) => !m.rules.some((r) => r.variable === v))
  )
    return "No evaluable";
  return m.reviewed ? "Conforme" : "Pendiente de revisión";
}
export function usable(m: Measurement) {
  return !m.draft && !m.voided && variables.every((v) => m[v] !== null);
}
export function stats(values: number[]) {
  const n = values.length;
  if (!n)
    return {
      n,
      mean: null,
      median: null,
      min: null,
      max: null,
      range: null,
      sd: null,
    };
  const s = [...values].sort((a, b) => a - b),
    mean = values.reduce((a, b) => a + b, 0) / n;
  return {
    n,
    mean,
    median: n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2,
    min: s[0],
    max: s[n - 1],
    range: s[n - 1] - s[0],
    sd:
      n > 1
        ? Math.sqrt(values.reduce((a, b) => a + (b - mean) ** 2, 0) / (n - 1))
        : null,
  };
}
export function metrology(rows: Trial[]) {
  const d = rows.map((t) => t.prototype - t.reference),
    s = stats(d);
  return {
    ...s,
    mae: d.length ? d.reduce((a, b) => a + Math.abs(b), 0) / d.length : null,
    rmse: d.length
      ? Math.sqrt(d.reduce((a, b) => a + b * b, 0) / d.length)
      : null,
  };
}
export function filterRows(rows: Measurement[], f: Record<string, string>) {
  return rows.filter(
    (m) =>
      !m.voided &&
      (!f.product || m.product === f.product) &&
      (!f.lot || m.lot === f.lot) &&
      (!f.from || m.date >= f.from) &&
      (!f.to || m.date.slice(0, 10) <= f.to) &&
      (!f.status || status(m) === f.status) &&
      (!f.search ||
        [m.id, m.product, m.lot, m.operator]
          .join(" ")
          .toLowerCase()
          .includes(f.search.toLowerCase())),
  );
}
export const fmt = (n: number | null | undefined) =>
  n == null
    ? "—"
    : new Intl.NumberFormat("es-MX", { maximumFractionDigits: 3 }).format(n);
export const uid = () => crypto.randomUUID();
export function csv(rows: Record<string, unknown>[]) {
  if (!rows.length) return "";
  const cell = (v: unknown) =>
    '"' +
    String(v ?? "")
      .replace(/^[=+@\-\t\r]/, "'$&")
      .replaceAll('"', '""') +
    '"';
  return (
    "\uFEFF" +
    [
      Object.keys(rows[0]).map(cell).join(","),
      ...rows.map((r) => Object.values(r).map(cell).join(",")),
    ].join("\r\n")
  );
}
export function exportRows(rows: Measurement[]) {
  return rows.map((m) => ({
    Código: m.id,
    Fecha: m.date,
    Producto: m.product,
    Lote: m.lot,
    pH: m.ph,
    "Temperatura °C": m.temperature,
    Humedad: m.humidity,
    "Tipo humedad": m.moisture,
    "Unidad humedad": m.humidityUnit,
    Operador: m.operator,
    Etapa: m.stage,
    Instrumento: m.instrument,
    Estado: status(m),
    Observaciones: m.notes,
  }));
}
export function demo(): State {
  const s = initial();
  s.products = ["Solución de limpieza"];
  s.operators = ["Operador de demostración"];
  s.instruments = ["PRO-01"];
  s.rules = variables.map((v, i) => ({
    id: uid(),
    product: s.products[0],
    stage: s.stages[0],
    variable: v,
    moisture: "Relativa ambiental",
    lower: [6, 18, 35][i],
    upper: [8, 28, 65][i],
    resolution: null,
    source: "Criterio ficticio exclusivo de demostración",
    effective: "2020-01-01",
    active: true,
  }));
  s.measurements = Array.from({ length: 24 }, (_, i) => {
    const date = new Date(Date.now() - (23 - i) * 3600000)
      .toISOString()
      .slice(0, 16);
    return {
      id: "DEMO-" + String(i + 1).padStart(4, "0"),
      product: s.products[0],
      lot: i < 12 ? "DEMO-A" : "DEMO-B",
      date,
      operator: s.operators[0],
      stage: s.stages[0],
      instrument: "PRO-01",
      notes: "DATOS DE DEMOSTRACIÓN",
      ph: 6.6 + (i % 7) * 0.17,
      temperature: 21 + (i % 5) * 1.2,
      humidity: 45 + (i % 8) * 3.3,
      moisture: "Relativa ambiental",
      humidityUnit: "% HR",
      location: "",
      phNotes: "",
      resolution: null,
      draft: false,
      voided: false,
      reviewed: i % 4 !== 0,
      rules: structuredClone(s.rules),
      audit: [],
    };
  });
  return s;
}
export function validateMeasurement(m: Measurement) {
  if (
    !m.product.trim() ||
    !m.lot.trim() ||
    !m.operator.trim() ||
    !m.stage ||
    !m.instrument.trim() ||
    !m.date ||
    !Number.isFinite(Date.parse(m.date))
  )
    throw Error(
      "Completa producto, lote, fecha, operador, etapa e instrumento.",
    );
  if (!m.draft && variables.some((v) => m[v] === null))
    throw Error("Completa las tres lecturas o guarda un borrador.");
  if (m.ph !== null && (m.ph < 0 || m.ph > 14))
    throw Error("El pH debe estar entre 0 y 14 en este prototipo.");
  if (m.temperature !== null && m.temperature < -273.15)
    throw Error("La temperatura no puede ser menor que −273.15 °C.");
  if (
    m.humidity !== null &&
    (m.humidity < 0 || (!m.moisture.includes("seca") && m.humidity > 100))
  )
    throw Error(
      "La humedad debe ser no negativa; la relativa y la de base húmeda no pueden superar 100 %.",
    );
  if (m.resolution !== null && m.resolution <= 0)
    throw Error("La resolución debe ser positiva.");
  for (const v of variables) {
    const resolution =
      v === "ph"
        ? (m.resolution ?? m.rules.find((r) => r.variable === v)?.resolution)
        : m.rules.find((r) => r.variable === v)?.resolution;
    if (
      resolution &&
      m[v] !== null &&
      Math.abs(m[v]! / resolution - Math.round(m[v]! / resolution)) > 1e-7
    )
      throw Error(
        `${labels[v]} no es compatible con la resolución ${resolution}.`,
      );
  }
}
const finite = z.number().finite();
const variableSchema = z.enum(variables);
const ruleSchema = z.object({
  id: z.string(),
  product: z.string(),
  stage: z.string(),
  variable: variableSchema,
  moisture: z.string(),
  lower: finite.nullable(),
  upper: finite.nullable(),
  resolution: finite.positive().nullable(),
  source: z.string(),
  effective: z.string(),
  active: z.boolean(),
});
const auditSchema = z.object({
  at: z.string(),
  actor: z.string(),
  action: z.string(),
  reason: z.string(),
});
const measurementSchema = z.object({
  id: z.string(),
  product: z.string(),
  lot: z.string(),
  date: z.string(),
  operator: z.string(),
  stage: z.string(),
  instrument: z.string(),
  notes: z.string(),
  ph: finite.nullable(),
  temperature: finite.nullable(),
  humidity: finite.nullable(),
  moisture: z.string(),
  humidityUnit: z.string(),
  location: z.string(),
  phNotes: z.string(),
  resolution: finite.positive().nullable(),
  draft: z.boolean(),
  voided: z.boolean(),
  reviewed: z.boolean(),
  rules: z.array(ruleSchema),
  audit: z.array(auditSchema),
  deviations: z.string().optional(),
});
const trialSchema = z.object({
  id: z.string(),
  variable: variableSchema,
  moisture: z.string(),
  unit: z.string(),
  sample: z.string(),
  date: z.string(),
  prototype: finite,
  reference: finite,
  instrument: z.string(),
  method: z.string(),
  conditions: z.string(),
  repetition: finite.int().positive(),
  session: z.string(),
  tolerance: finite.nonnegative(),
  notes: z.string(),
});
const stateSchema = z.object({
  version: z.literal(1),
  name: z.string(),
  organization: z.string(),
  products: z.array(z.string()),
  operators: z.array(z.string()),
  instruments: z.array(z.string()),
  stages: z.array(z.string()),
  methods: z.array(z.string()),
  frequency: z.string(),
  reportNotes: z.string(),
  rules: z.array(ruleSchema),
  measurements: z.array(measurementSchema),
  trials: z.array(trialSchema),
  rrStudies: z.array(rrStudySchema).optional(),
  simulation: z.record(z.string(), z.string()),
  economy: z.record(z.string(), z.string()),
});
export function validBackup(x: unknown): x is State {
  const parsed = stateSchema.safeParse(x);
  if (!parsed.success) return false;
  const s = parsed.data;
  try {
    for (const study of s.rrStudies ?? []) validateRrReadings(study.readings);
    if (
      new Set((s.rrStudies ?? []).map((t) => t.id)).size !==
      (s.rrStudies ?? []).length
    )
      return false;
  } catch {
    return false;
  }
  return (
    new Set(s.measurements.map((m) => m.id)).size === s.measurements.length &&
    new Set(s.trials.map((t) => t.id)).size === s.trials.length
  );
}
