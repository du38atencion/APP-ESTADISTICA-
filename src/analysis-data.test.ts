import { describe, it, expect } from "vitest";
import {
  datasetFromRows,
  parseDelimited,
  parseJsonRows,
  seriesFromMeasurements,
  automaticRrStudy,
  seriesFromRrStudies,
} from "./analysis-data";
import { initial, demo, validBackup } from "./domain";
import { rrAnova } from "./rr";
describe("análisis automático sin recaptura", () => {
  it("lee listas y columnas numéricas independientes sin fabricar identificadores", () => {
    const dataset = datasetFromRows(
      parseDelimited("Temperatura (°C);pH\n25,1;7\n26,2;7,2\n;7,1"),
      "datos.csv",
    );
    expect(dataset.series).toHaveLength(2);
    expect(dataset.series[0].points.map((p) => p.value)).toEqual([25.1, 26.2]);
    expect(dataset.series[0].missing).toBe(1);
    expect(dataset.series[0].unit).toBe("°C");
    expect(automaticRrStudy(dataset.series[0], "datos")).toBeNull();
  });
  it("admite TXT con coma decimal, CSV con comillas y JSON", () => {
    expect(
      datasetFromRows(
        parseDelimited("25,1\n26,3", true),
        "datos.txt",
      ).series[0].points.map((p) => p.value),
    ).toEqual([25.1, 26.3]);
    expect(
      datasetFromRows(
        parseDelimited('"Valor"\n"1,2"\n"2,3"'),
        "csv",
      ).series[0].points.map((p) => p.value),
    ).toEqual([1.2, 2.3]);
    expect(
      datasetFromRows(parseJsonRows([1, null, 3]), "json").series[0].points.map(
        (p) => p.value,
      ),
    ).toEqual([1, 3]);
    expect(
      datasetFromRows(parseJsonRows([{ pH: 7 }, { pH: 8 }]), "json").series[0]
        .points,
    ).toHaveLength(2);
  });
  it("rechaza archivos inválidos de forma atómica", () => {
    expect(() =>
      datasetFromRows(parseDelimited("Valor\n1\nerror"), "csv"),
    ).toThrow(/no numéricos/);
    expect(() => datasetFromRows([], "csv")).toThrow(/vacío/);
    expect(() => datasetFromRows([["Sin números"]], "csv")).toThrow(
      /No se encontraron/,
    );
    expect(() => parseDelimited('"sin cerrar')).toThrow(/comillas/);
  });
  it("reconoce identificación solo si existe y calcula R&R sin formularios", () => {
    const rows = [
      ["Parte", "Operador", "Repetición", "Medición"],
      ...[1, 2, 3].flatMap((p) =>
        ["Ana", "Luis"].flatMap((o, j) =>
          [1, 2].map((r) => [p, o, r, 10 + p + j * 0.1 + r * 0.05]),
        ),
      ),
    ];
    const series = datasetFromRows(rows, "datos").series;
    expect(series).toHaveLength(1);
    const study = automaticRrStudy(series[0], "cargado")!;
    expect(study.readings).toHaveLength(12);
    expect(rrAnova(study.readings).percent).toBeGreaterThan(0);
    expect(
      automaticRrStudy(
        {
          ...series[0],
          points: series[0].points.map((p) => ({ ...p, part: undefined })),
        },
        "datos",
      ),
    ).toBeNull();
  });
  it("lee mediciones históricas sin mezclar producto, lote, instrumento ni magnitudes", () => {
    const s = demo(),
      before = JSON.stringify(s);
    const series = seriesFromMeasurements(s.measurements);
    expect(series).toHaveLength(6);
    expect(series.every((s) => s.points.length === 12)).toBe(true);
    expect(series.every((s) => automaticRrStudy(s, "historial") === null)).toBe(
      true,
    );
    expect(JSON.stringify(s)).toBe(before);
    expect(
      seriesFromMeasurements(
        s.measurements.map((m) => ({ ...m, draft: true })),
      ),
    ).toEqual([]);
  });
  it("conserva respaldos anteriores y archivos cargados nuevos", () => {
    const dataset = datasetFromRows([[1], [2], [3]], "datos");
    const legacy = demo();
    expect(validBackup(legacy)).toBe(true);
    expect(validBackup({ ...legacy, analysisDatasets: [dataset] })).toBe(true);
    expect(
      validBackup({
        ...initial(),
        analysisDatasets: [
          {
            ...dataset,
            series: [
              { ...dataset.series[0], points: [{ id: "x", value: Infinity }] },
            ],
          },
        ],
      }),
    ).toBe(false);
    const old = {
      id: "s",
      name: "Guardado",
      date: "2026-11-14",
      reportedBy: "QA",
      characteristic: "Diámetro",
      unit: "mm",
      tolerance: 10,
      notes: "",
      readings: [
        { id: "r", part: "A", operator: "Ana", repetition: 1, value: 2 },
      ],
    };
    expect(
      automaticRrStudy(seriesFromRrStudies([old])[0], "guardado")!.tolerance,
    ).toBe(10);
  });
});
