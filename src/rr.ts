import { z } from "zod";

export const rrReadingSchema = z.object({
  id: z.string().min(1),
  part: z.string().trim().min(1),
  operator: z.string().trim().min(1),
  repetition: z.number().int().min(1).max(10),
  value: z.number().finite(),
});
export const rrStudySchema = z.object({
  id: z.string().min(1),
  name: z.string().trim().min(1),
  date: z.string(),
  reportedBy: z.string(),
  characteristic: z.string().trim().min(1),
  unit: z.string().trim().min(1),
  tolerance: z.number().finite().positive().nullable(),
  notes: z.string(),
  readings: z.array(rrReadingSchema),
});
export type RrReading = z.infer<typeof rrReadingSchema>;
export type RrStudy = z.infer<typeof rrStudySchema>;
export type AnovaRow = {
  source: string;
  ss: number;
  df: number;
  ms: number | null;
  f: number | null;
  p: number | null;
};
export const cellKey = (
  r: Pick<RrReading, "part" | "operator" | "repetition">,
) => JSON.stringify([r.part.trim(), r.operator.trim(), r.repetition]);
export function validateRrReadings(rows: RrReading[]) {
  const ids = new Set<string>(),
    cells = new Set<string>();
  for (const row of rows) {
    if (!rrReadingSchema.safeParse(row).success)
      throw Error(
        "Completa parte, operador, repetición entera de 1 a 10 y lectura numérica finita.",
      );
    if (ids.has(row.id) || cells.has(cellKey(row)))
      throw Error(
        `Lectura duplicada: parte ${row.part}, operador ${row.operator}, repetición ${row.repetition}.`,
      );
    ids.add(row.id);
    cells.add(cellKey(row));
  }
}

// Lanczos log-gamma and regularized incomplete beta (continued fraction).
// F upper tail is I[d2/(d2+d1*F)](d2/2, d1/2), avoiding 1-CDF cancellation.
function logGamma(z: number): number {
  const c = [
    676.5203681218851, -1259.1392167224028, 771.3234287776531,
    -176.6150291621406, 12.507343278686905, -0.13857109526572012,
    9.984369578019572e-6, 1.5056327351493116e-7,
  ];
  if (z < 0.5)
    return (
      Math.log(Math.PI) - Math.log(Math.sin(Math.PI * z)) - logGamma(1 - z)
    );
  z -= 1;
  let x = 0.9999999999998099;
  c.forEach((v, i) => {
    x += v / (z + i + 1);
  });
  const t = z + c.length - 0.5;
  return (
    0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x)
  );
}
function betaFraction(a: number, b: number, x: number) {
  const tiny = 1e-300;
  const safe = (v: number) => (Math.abs(v) < tiny ? (v < 0 ? -tiny : tiny) : v);
  let c = 1,
    d = 1 / safe(1 - ((a + b) * x) / (a + 1)),
    h = d;
  for (let m = 1; m <= 500; m++) {
    let aa = (m * (b - m) * x) / ((a + 2 * m - 1) * (a + 2 * m));
    d = 1 / safe(1 + aa * d);
    c = safe(1 + aa / c);
    h *= d * c;
    aa = (-(a + m) * (a + b + m) * x) / ((a + 2 * m) * (a + 2 * m + 1));
    d = 1 / safe(1 + aa * d);
    c = safe(1 + aa / c);
    const delta = d * c;
    h *= delta;
    if (Math.abs(delta - 1) < 3e-14) return h;
  }
  throw Error("No convergió el cálculo del valor p.");
}
function beta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const factor = Math.exp(
    logGamma(a + b) -
      logGamma(a) -
      logGamma(b) +
      a * Math.log(x) +
      b * Math.log1p(-x),
  );
  return x < (a + 1) / (a + b + 2)
    ? (factor * betaFraction(a, b, x)) / a
    : 1 - (factor * betaFraction(b, a, 1 - x)) / b;
}
export function fSurvival(f: number, df1: number, df2: number) {
  if (df1 <= 0 || df2 <= 0 || f < 0 || Number.isNaN(f)) return null;
  if (f === Infinity) return 0;
  return Math.min(
    1,
    Math.max(0, beta(df2 / (df2 + df1 * f), df2 / 2, df1 / 2)),
  );
}
const mean = (xs: number[]) => xs.reduce((a, b) => a + b, 0) / xs.length;
const order = (xs: string[]) =>
  [...new Set(xs)].sort((a, b) => a.localeCompare(b, "es", { numeric: true }));
export function rrAnova(rows: RrReading[], tolerance: number | null = null) {
  validateRrReadings(rows);
  rows = rows.map((row) => ({
    ...row,
    part: row.part.trim(),
    operator: row.operator.trim(),
  }));
  if (tolerance !== null && (!Number.isFinite(tolerance) || tolerance <= 0))
    throw Error("La tolerancia debe ser una amplitud positiva (LSE − LIE).");
  const parts = order(rows.map((r) => r.part)),
    operators = order(rows.map((r) => r.operator));
  const repetitions = [...new Set(rows.map((r) => r.repetition))].sort(
    (a, b) => a - b,
  );
  const p = parts.length,
    o = operators.length,
    r = repetitions.length;
  if (p < 2 || o < 2 || r < 2)
    throw Error(
      "Se necesitan al menos 2 partes, 2 operadores y 2 repeticiones por combinación.",
    );
  const byCell = new Map<string, RrReading[]>();
  for (const row of rows) {
    const key = JSON.stringify([row.part, row.operator]);
    const cell = byCell.get(key) ?? [];
    cell.push(row);
    byCell.set(key, cell);
  }
  const cells = operators.flatMap((operator) =>
    parts.map((part) => {
      const values = (byCell.get(JSON.stringify([part, operator])) ?? []).sort(
        (a, b) => a.repetition - b.repetition,
      );
      if (values.length !== r || values.some((v, i) => v.repetition !== i + 1))
        throw Error(
          `Diseño incompleto: parte ${part}, operador ${operator}. Cada combinación requiere las repeticiones 1 a ${r}, sin huecos.`,
        );
      const vs = values.map((v) => v.value);
      return {
        part,
        operator,
        values,
        mean: mean(vs),
        range: Math.max(...vs) - Math.min(...vs),
      };
    }),
  );
  const grand = mean(rows.map((v) => v.value));
  const partMeans = parts.map((part) => ({
    part,
    mean: mean(cells.filter((c) => c.part === part).map((c) => c.mean)),
  }));
  const operatorMeans = operators.map((operator) => ({
    operator,
    mean: mean(cells.filter((c) => c.operator === operator).map((c) => c.mean)),
  }));
  const ssPart =
    o * r * partMeans.reduce((s, c) => s + (c.mean - grand) ** 2, 0);
  const ssOperator =
    p * r * operatorMeans.reduce((s, c) => s + (c.mean - grand) ** 2, 0);
  const ssInteraction =
    r *
    cells.reduce(
      (s, c) =>
        s +
        (c.mean -
          partMeans.find((v) => v.part === c.part)!.mean -
          operatorMeans.find((v) => v.operator === c.operator)!.mean +
          grand) **
          2,
      0,
    );
  const ssError = cells.reduce(
    (s, c) => s + c.values.reduce((a, v) => a + (v.value - c.mean) ** 2, 0),
    0,
  );
  if (![ssPart, ssOperator, ssInteraction, ssError].every(Number.isFinite))
    throw Error(
      "Las magnitudes superan el rango numérico del análisis. Revisa lecturas y unidades.",
    );
  const dfPart = p - 1,
    dfOperator = o - 1,
    dfInteraction = (p - 1) * (o - 1),
    dfError = p * o * (r - 1);
  const msPart = ssPart / dfPart,
    msOperator = ssOperator / dfOperator,
    msInteraction = ssInteraction / dfInteraction,
    msError = ssError / dfError;
  function tested(
    source: string,
    ss: number,
    df: number,
    denominator: number,
    denominatorDf: number,
  ): AnovaRow {
    const ms = ss / df,
      f = denominator > 0 ? ms / denominator : ms > 0 ? Infinity : null;
    return {
      source,
      ss,
      df,
      ms,
      f,
      p: f === null ? null : fSurvival(f, df, denominatorDf),
    };
  }
  const interactionTest = tested(
    "Parte × operador",
    ssInteraction,
    dfInteraction,
    msError,
    dfError,
  );
  const total: AnovaRow = {
    source: "Total",
    ss: ssPart + ssOperator + ssInteraction + ssError,
    df: rows.length - 1,
    ms: null,
    f: null,
    p: null,
  };
  const fullTable = [
    tested("Parte", ssPart, dfPart, msInteraction, dfInteraction),
    tested("Operador", ssOperator, dfOperator, msInteraction, dfInteraction),
    interactionTest,
    {
      source: "Repetibilidad",
      ss: ssError,
      df: dfError,
      ms: msError,
      f: null,
      p: null,
    },
    total,
  ];
  const pooled = interactionTest.p !== null && interactionTest.p >= 0.05;
  const error = pooled
    ? (ssError + ssInteraction) / (dfError + dfInteraction)
    : msError;
  const table: AnovaRow[] = pooled
    ? [
        tested("Parte", ssPart, dfPart, error, dfError + dfInteraction),
        tested(
          "Operador",
          ssOperator,
          dfOperator,
          error,
          dfError + dfInteraction,
        ),
        {
          source: "Repetibilidad (agrupada)",
          ss: ssError + ssInteraction,
          df: dfError + dfInteraction,
          ms: error,
          f: null,
          p: null,
        },
        total,
      ]
    : fullTable;
  const interactionVariance = pooled
    ? 0
    : Math.max(0, (msInteraction - msError) / r);
  const operatorVariance = Math.max(
    0,
    (msOperator - (pooled ? error : msInteraction)) / (p * r),
  );
  const partVariance = Math.max(
    0,
    (msPart - (pooled ? error : msInteraction)) / (o * r),
  );
  const reproducibility = operatorVariance + interactionVariance,
    grr = error + reproducibility,
    totalVariance = grr + partVariance;
  const components = [
    ["R&R del sistema", grr],
    ["Repetibilidad", error],
    ["Reproducibilidad", reproducibility],
    ["Operador", operatorVariance],
    ["Parte × operador", interactionVariance],
    ["Parte a parte", partVariance],
    ["Variación total", totalVariance],
  ].map(([name, variance]) => {
    const v = variance as number,
      sd = Math.sqrt(v);
    return {
      name: name as string,
      variance: v,
      sd,
      studyVariation: 6 * sd,
      contribution: totalVariance > 0 ? (100 * v) / totalVariance : null,
      studyPercent:
        totalVariance > 0 ? 100 * Math.sqrt(v / totalVariance) : null,
      tolerancePercent: tolerance !== null ? (100 * 6 * sd) / tolerance : null,
    };
  });
  const percent = components[0].studyPercent;
  const verdict =
    percent === null
      ? "No evaluable"
      : percent <= 10
        ? "Aceptable"
        : percent <= 30
          ? "Marginal"
          : "Inaceptable";
  // Standard Xbar/R factors for subgroup size = repetitions, 2..10.
  const factors: Record<number, [number, number, number]> = {
    2: [1.88, 0, 3.267],
    3: [1.023, 0, 2.574],
    4: [0.729, 0, 2.282],
    5: [0.577, 0, 2.114],
    6: [0.483, 0, 2.004],
    7: [0.419, 0.076, 1.924],
    8: [0.373, 0.136, 1.864],
    9: [0.337, 0.184, 1.816],
    10: [0.308, 0.223, 1.777],
  };
  const [a2, d3, d4] = factors[r],
    rbar = mean(cells.map((c) => c.range));
  return {
    parts,
    operators,
    repetitions: r,
    cells,
    partMeans,
    operatorMeans,
    grand,
    fullTable,
    table,
    pooled,
    interactionP: interactionTest.p,
    components,
    percent,
    verdict,
    ndc:
      grr > 0
        ? Math.max(1, Math.floor(1.41 * Math.sqrt(partVariance / grr)))
        : null,
    perfectSeparation: grr === 0 && partVariance > 0,
    limits: {
      rbar,
      rLower: d3 * rbar,
      rUpper: d4 * rbar,
      xLower: grand - a2 * rbar,
      xUpper: grand + a2 * rbar,
    },
  };
}
export type RrResult = ReturnType<typeof rrAnova>;
