import { describe, it, expect } from "vitest";
import {
  stats,
  metrology,
  status,
  usable,
  filterRows,
  applicable,
  validateMeasurement,
  csv,
  exportRows,
  initial,
  validBackup,
} from "./domain";
import type { Measurement, Rule, Trial } from "./domain";
const rule: Rule = {
  id: "r",
  product: "Producto A",
  stage: "Final",
  variable: "ph",
  moisture: "Relativa ambiental",
  lower: 6,
  upper: 8,
  resolution: 0.1,
  source: "Ensayo documentado",
  effective: "2026-01-01",
  active: true,
};
const measurement = (over: Partial<Measurement> = {}): Measurement => ({
  id: "QM-001",
  product: "Producto A",
  lot: "L1",
  date: "2026-10-26T10:00",
  operator: "Ana",
  stage: "Final",
  instrument: "P1",
  notes: "",
  ph: 7,
  temperature: 23,
  humidity: 50,
  moisture: "Relativa ambiental",
  humidityUnit: "% HR",
  location: "",
  phNotes: "",
  resolution: null,
  draft: false,
  voided: false,
  reviewed: false,
  rules: [],
  audit: [],
  ...over,
});
describe("integridad y estadísticas", () => {
  it("estado vacío sin datos inventados", () =>
    expect(stats([])).toMatchObject({ n: 0, mean: null, sd: null }));
  it("media, mediana, rango y s muestral conocidos", () =>
    expect(stats([1, 2, 3, 4, 5])).toMatchObject({
      n: 5,
      mean: 3,
      median: 3,
      min: 1,
      max: 5,
      range: 4,
      sd: Math.sqrt(2.5),
    }));
  it("mediana par y desviación indefinida n=1", () => {
    expect(stats([2, 4]).median).toBe(3);
    expect(stats([5]).sd).toBeNull();
  });
  it("no declara conforme sin reglas", () =>
    expect(status(measurement())).toBe("No evaluable"));
  it("límites inclusivos y revisión separada", () => {
    const rules = [
      rule,
      {
        ...rule,
        id: "t",
        variable: "temperature" as const,
        lower: 20,
        upper: 25,
      },
      { ...rule, id: "h", variable: "humidity" as const, lower: 40, upper: 60 },
    ];
    expect(status(measurement({ ph: 6, rules }))).toBe("Pendiente de revisión");
    expect(status(measurement({ ph: 8, rules, reviewed: true }))).toBe(
      "Conforme",
    );
    expect(status(measurement({ ph: 8.1, rules }))).toBe(
      "Fuera de especificación",
    );
  });
  it("no utiliza borradores, incompletos ni anulados", () => {
    expect(usable(measurement({ draft: true }))).toBe(false);
    expect(usable(measurement({ ph: null }))).toBe(false);
    expect(usable(measurement({ voided: true }))).toBe(false);
    expect(usable(measurement())).toBe(true);
  });
  it("no sustituye lectura faltante por cero", () => {
    expect(() => validateMeasurement(measurement({ ph: null }))).toThrow();
    expect(() =>
      validateMeasurement(measurement({ ph: null, draft: true })),
    ).not.toThrow();
  });
  it("valida magnitudes y resolución", () => {
    expect(() => validateMeasurement(measurement({ ph: 15 }))).toThrow();
    expect(() =>
      validateMeasurement(measurement({ ph: 7.13, resolution: 0.1 })),
    ).toThrow();
    expect(() => validateMeasurement(measurement({ humidity: 120 }))).toThrow();
    expect(() =>
      validateMeasurement(
        measurement({
          humidity: 120,
          moisture: "Contenido de humedad · base seca",
        }),
      ),
    ).not.toThrow();
  });
  it("combina producto, lote, fechas y texto", () => {
    const list = [
      measurement(),
      measurement({ id: "2", lot: "L2" }),
      measurement({ id: "3", date: "2026-10-25T10:00" }),
    ];
    expect(
      filterRows(list, {
        lot: "L1",
        from: "2026-10-26",
        to: "2026-10-26",
        search: "Ana",
      }).map((m) => m.id),
    ).toEqual(["QM-001"]);
  });
  it("respeta fecha, etapa y tipo de humedad de las reglas", () => {
    const m = measurement();
    expect(applicable([rule], m)).toHaveLength(1);
    expect(applicable([{ ...rule, effective: "2027-01-01" }], m)).toHaveLength(
      0,
    );
    expect(applicable([{ ...rule, stage: "Otra" }], m)).toHaveLength(0);
    expect(
      applicable([{ ...rule, variable: "humidity", moisture: "Otro" }], m),
    ).toHaveLength(0);
  });
  it("una copia de reglas conserva criterios históricos", () => {
    const rules = structuredClone([rule]);
    rule.active = false;
    expect(rules[0].active).toBe(true);
    rule.active = true;
  });
  it("exporta filas reales y neutraliza fórmulas CSV", () => {
    const exported = exportRows([measurement({ lot: "=1+1", ph: null })]);
    expect(exported[0].pH).toBeNull();
    expect(csv(exported)).toContain("'=1+1");
    expect(exported[0].Fecha).toBe("2026-10-26T10:00");
  });
  it("calcula sesgo, MAE y RMSE", () => {
    const r = [
      { prototype: 11, reference: 10 },
      { prototype: 8, reference: 10 },
    ] as Trial[];
    const x = metrology(r);
    expect(x.mean).toBe(-0.5);
    expect(x.mae).toBe(1.5);
    expect(x.rmse).toBe(Math.sqrt(2.5));
  });
  it("valida formato de respaldo", () => {
    expect(validBackup(initial())).toBe(true);
    expect(validBackup({ version: 1 })).toBe(false);
    expect(validBackup({ ...initial(), measurements: [{ id: "roto" }] })).toBe(
      false,
    );
  });
});
