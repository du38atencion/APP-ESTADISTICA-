import { describe, it, expect } from "vitest";
import {
  rrAnova,
  fSurvival,
  validateRrReadings,
  type RrReading,
  type RrStudy,
} from "./rr";
import { demo, initial, validBackup } from "./domain";
function fixture(interaction = true): RrReading[] {
  return [-2, 0, 2].flatMap((part, i) =>
    [-0.5, 0.5].flatMap((operator, j) =>
      [-1, 1].map((e, k) => ({
        id: `${i}-${j}-${k}`,
        part: `P${i + 1}`,
        operator: j ? "B" : "A",
        repetition: k + 1,
        value:
          10 +
          part +
          operator +
          (interaction ? (i - 1) * (j === 0 ? 1 : -1) : 0) +
          e * (interaction ? 0.2 : 1),
      })),
    ),
  );
}
const study = (readings = fixture()): RrStudy => ({
  id: "study",
  name: "Calibrador",
  date: "2026-11-14",
  reportedBy: "QA",
  characteristic: "Diámetro",
  unit: "mm",
  tolerance: 10,
  notes: "",
  readings,
});
describe("R&R ANOVA cruzado", () => {
  it("reproduce SC, GL, varianzas y valores p de un diseño con interacción (referencia scipy.stats.f.sf)", () => {
    const x = rrAnova(fixture(), 10);
    expect(x.pooled).toBe(false);
    expect(x.fullTable.map((r) => r.df)).toEqual([2, 1, 2, 6, 11]);
    [32, 3, 8, 0.48, 43.48].forEach((v, i) =>
      expect(x.fullTable[i].ss).toBeCloseTo(v, 10),
    );
    expect(x.fullTable[2].f).toBeCloseTo(50, 10);
    expect(x.interactionP).toBeCloseTo(0.0001813577651349772, 10);
    expect(x.components[1].variance).toBeCloseTo(0.08, 10);
    expect(x.components[2].variance).toBeCloseTo(1.96, 10);
    expect(x.components[3].variance).toBe(0); // negative method-of-moments estimate is truncated
    expect(x.components[5].variance).toBeCloseTo(3, 10);
    expect(x.components[6].variance).toBeCloseTo(5.04, 10);
    expect(x.percent).toBeCloseTo(100 * Math.sqrt(2.04 / 5.04), 10);
    expect(x.components[0].tolerancePercent).toBeCloseTo(
      60 * Math.sqrt(2.04),
      10,
    );
    expect(x.verdict).toBe("Inaceptable");
    expect(x.ndc).toBe(1);
    expect(x.limits).toMatchObject({ rLower: 0 });
    expect(x.limits.rbar).toBeCloseTo(0.4);
    expect(x.limits.rUpper).toBeCloseTo(1.3068);
    expect(x.limits.xUpper).toBeCloseTo(10.752);
  });
  it("agrupa interacción no significativa y usa GL y CM del error agrupado", () => {
    const x = rrAnova(fixture(false));
    expect(x.pooled).toBe(true);
    expect(x.interactionP).toBe(1);
    expect(x.table.map((r) => r.df)).toEqual([2, 1, 8, 11]);
    expect(x.table[2].ms).toBeCloseTo(1.5);
    expect(x.table[0].p).toBeCloseTo(0.005532408988457076, 10);
    expect(x.components[1].variance).toBeCloseTo(1.5);
    expect(x.components[3].variance).toBeCloseTo(0.25);
    expect(x.components[4].variance).toBe(0);
    expect(x.components[5].variance).toBeCloseTo(3.625);
    expect(x.percent).toBeCloseTo(100 * Math.sqrt(1.75 / 5.375));
    expect(x.components[0].tolerancePercent).toBeNull();
  });
  it("rechaza combinaciones faltantes, repeticiones con huecos y duplicados", () => {
    const rows = fixture();
    expect(() => rrAnova(rows.slice(1))).toThrow(/incompleto/);
    expect(() =>
      rrAnova(rows.map((r) => ({ ...r, repetition: r.repetition + 1 }))),
    ).toThrow(/incompleto/);
    expect(() => rrAnova([...rows, { ...rows[0], id: "duplicate" }])).toThrow(
      /duplicada/,
    );
    expect(() => rrAnova(rows.filter((r) => r.operator === "A"))).toThrow(
      /al menos/,
    );
    expect(() => rrAnova(rows.map((r) => ({ ...r, value: NaN })))).toThrow(
      /finita/,
    );
    expect(() => rrAnova(rows, 0)).toThrow(/tolerancia/);
    expect(() =>
      validateRrReadings([{ ...rows[0], repetition: 1.5 }]),
    ).toThrow();
  });
  it("no declara aceptable un estudio sin variación y maneja repetibilidad cero", () => {
    const x = rrAnova(fixture().map((r) => ({ ...r, value: 25 })));
    expect(x.percent).toBeNull();
    expect(x.verdict).toBe("No evaluable");
    expect(x.ndc).toBeNull();
    const perfect = rrAnova(
      fixture().map((r) => ({ ...r, value: Number(r.part.slice(1)) })),
    );
    expect(perfect.percent).toBe(0);
    expect(perfect.perfectSeparation).toBe(true);
  });
  it("resultados independientes del orden y de las etiquetas", () => {
    const rows = fixture();
    const renamed = rows
      .map((r) => ({
        ...r,
        part: "Parte / " + r.part,
        operator: "Operador." + r.operator,
      }))
      .reverse();
    expect(rrAnova(renamed).percent).toBeCloseTo(rrAnova(rows).percent!, 10);
  });
  it("calcula colas F de referencia y casos degenerados", () => {
    expect(fSurvival(1, 1, 1)).toBeCloseTo(0.5, 12);
    expect(fSurvival(50, 2, 6)).toBeCloseTo(0.0001813577651349772, 10);
    expect(fSurvival(Infinity, 2, 6)).toBe(0);
    expect(fSurvival(0, 2, 6)).toBe(1);
    expect(fSurvival(-1, 2, 6)).toBeNull();
  });
  it("mantiene respaldos 1.0.x y valida estudios nuevos sin borrar datos legados", () => {
    const legacy = demo();
    legacy.simulation = { source: "dato legado" };
    legacy.economy = { cost: "42" };
    expect(validBackup(legacy)).toBe(true);
    const next = { ...legacy, rrStudies: [study()] };
    expect(validBackup(next)).toBe(true);
    expect(JSON.parse(JSON.stringify(next)).measurements).toEqual(
      legacy.measurements,
    );
    expect(next.simulation).toEqual(legacy.simulation);
    expect(next.economy).toEqual(legacy.economy);
    expect(
      validBackup({
        ...initial(),
        rrStudies: [study([{ ...fixture()[0], value: Infinity }])],
      }),
    ).toBe(false);
    expect(validBackup({ ...initial(), rrStudies: [study(), study()] })).toBe(
      false,
    );
    expect(
      validBackup({
        ...initial(),
        rrStudies: [study([...fixture(), { ...fixture()[0], id: "d" }])],
      }),
    ).toBe(false);
  });
});
