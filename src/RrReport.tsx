import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  LineChart,
  Line,
  ComposedChart,
  Scatter,
} from "recharts";
import { fmt } from "./domain";
import type { RrStudy, RrResult, AnovaRow } from "./rr";
const colors = [
  "#137dce",
  "#b9534b",
  "#2b9477",
  "#946ecc",
  "#c17e24",
  "#4b7280",
];
const numeric = (v: number | null) =>
  v === Infinity
    ? "∞"
    : v !== null && v !== 0 && (Math.abs(v) >= 1e6 || Math.abs(v) < 0.001)
      ? v.toExponential(4)
      : fmt(v);
const pValue = (p: number | null) =>
  p === null ? "—" : p < 0.001 ? "<0.001" : p.toFixed(4);
function AnovaTable({ rows }: { rows: AnovaRow[] }) {
  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            {["Fuente", "GL", "SC", "CM", "F", "Valor p"].map((s) => (
              <th key={s}>{s}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.source}>
              <td>{row.source}</td>
              <td>{row.df}</td>
              <td>{numeric(row.ss)}</td>
              <td>{numeric(row.ms)}</td>
              <td>{numeric(row.f)}</td>
              <td>{pValue(row.p)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function RangeChart({
  result,
  average = false,
}: {
  result: RrResult;
  average?: boolean;
}) {
  const { cells, limits, operators, parts, grand } = result;
  const data = cells.map((c, i) => ({
    index: i,
    value: average ? c.mean : c.range,
  }));
  const center = average ? grand : limits.rbar,
    lower = average ? limits.xLower : limits.rLower,
    upper = average ? limits.xUpper : limits.rUpper;
  return (
    <>
      <ResponsiveContainer width="100%" height={260}>
        <LineChart
          data={data}
          margin={{ top: 24, right: 35, bottom: 25, left: 0 }}
        >
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis
            type="number"
            dataKey="index"
            domain={[-0.5, cells.length - 0.5]}
            ticks={data.map((d) => d.index)}
            tickFormatter={(i) => cells[i]?.part ?? ""}
            tick={{ fontSize: 10 }}
            angle={-35}
            textAnchor="end"
          />
          <YAxis
            domain={average ? ["auto", "auto"] : [0, "auto"]}
            width={55}
            tick={{ fontSize: 10 }}
          />
          <Tooltip
            labelFormatter={(i) =>
              cells[Number(i)]
                ? `${cells[Number(i)].operator} · Parte ${cells[Number(i)].part}`
                : i
            }
            formatter={(v) => [fmt(Number(v)), average ? "Media" : "Rango"]}
          />
          <ReferenceLine
            y={center}
            stroke="#2b9477"
            label={{
              value: average ? "X̄" : "R̄",
              position: "right",
              fontSize: 10,
            }}
          />
          <ReferenceLine
            y={lower}
            ifOverflow="extendDomain"
            stroke="#b9534b"
            label={{ value: "LCI", position: "right", fontSize: 10 }}
          />
          <ReferenceLine
            y={upper}
            ifOverflow="extendDomain"
            stroke="#b9534b"
            label={{ value: "LCS", position: "right", fontSize: 10 }}
          />
          {operators.map((op, i) => (
            <ReferenceLine
              key={op}
              x={i * parts.length - 0.5}
              stroke="#9bacbd"
              strokeDasharray="4 4"
              label={{ value: op, position: "insideTopRight", fontSize: 10 }}
            />
          ))}
          <Line
            name={average ? "Media" : "Rango"}
            dataKey="value"
            stroke="#137dce"
            isAnimationActive={false}
            dot={{ r: 3 }}
          />
        </LineChart>
      </ResponsiveContainer>
      <p className="footnote">
        LCI {fmt(lower)} · Centro {fmt(center)} · LCS {fmt(upper)}. Subgrupo:
        repeticiones de cada parte por cada operador.
      </p>
    </>
  );
}
function OperatorBoxes({
  study,
  result,
}: {
  study: RrStudy;
  result: RrResult;
}) {
  const all = study.readings.map((r) => r.value),
    min = Math.min(...all),
    max = Math.max(...all),
    padding = (max - min || 1) * 0.12;
  const low = min - padding,
    high = max + padding,
    y = (v: number) => 225 - ((v - low) / (high - low)) * 185;
  const width = Math.max(520, result.operators.length * 100);
  return (
    <div className="rr-box-scroll">
      <svg
        viewBox={`0 0 ${width} 280`}
        role="img"
        aria-label="Cajas de mediciones por operador: mediana, cuartiles, bigotes de Tukey y media"
      >
        {[0, 1, 2, 3, 4].map((i) => {
          const v = low + ((high - low) * i) / 4;
          return (
            <g key={i}>
              <line
                x1={55}
                x2={width - 15}
                y1={y(v)}
                y2={y(v)}
                stroke="#e8edf1"
              />
              <text x={48} y={y(v) + 4} textAnchor="end" fontSize={11}>
                {fmt(v)}
              </text>
            </g>
          );
        })}
        <line
          x1={55}
          x2={width - 15}
          y1={y(result.grand)}
          y2={y(result.grand)}
          stroke="#8a9aaa"
          strokeDasharray="4 3"
        />
        {result.operators.map((op, i) => {
          const values = study.readings
            .filter((r) => r.operator === op)
            .map((r) => r.value)
            .sort((a, b) => a - b);
          const quant = (p: number) => {
            const n = (values.length - 1) * p,
              k = Math.floor(n);
            return (
              values[k] +
              (values[Math.min(k + 1, values.length - 1)] - values[k]) * (n - k)
            );
          };
          const q1 = quant(0.25),
            median = quant(0.5),
            q3 = quant(0.75),
            iqr = q3 - q1;
          const within = values.filter(
              (v) => v >= q1 - 1.5 * iqr && v <= q3 + 1.5 * iqr,
            ),
            bottom = within[0],
            top = within[within.length - 1];
          const x = 55 + ((width - 70) * (i + 0.5)) / result.operators.length,
            box = Math.min(54, ((width - 70) / result.operators.length) * 0.65);
          return (
            <g key={op}>
              <title>
                {op}: Q1 {fmt(q1)}, mediana {fmt(median)}, Q3 {fmt(q3)}
              </title>
              <line x1={x} x2={x} y1={y(bottom)} y2={y(top)} stroke="#426781" />
              {[bottom, top].map((v, k) => (
                <line
                  key={k}
                  x1={x - box / 3}
                  x2={x + box / 3}
                  y1={y(v)}
                  y2={y(v)}
                  stroke="#426781"
                />
              ))}
              <rect
                x={x - box / 2}
                y={y(q3)}
                width={box}
                height={Math.max(1, y(q1) - y(q3))}
                fill="#a8c9e5"
                stroke="#426781"
              />
              <line
                x1={x - box / 2}
                x2={x + box / 2}
                y1={y(median)}
                y2={y(median)}
                stroke="#183348"
                strokeWidth={2}
              />
              <circle
                cx={x}
                cy={y(result.operatorMeans[i].mean)}
                r={4}
                fill="white"
                stroke="#137dce"
              />
              {values
                .filter((v) => v < bottom || v > top)
                .map((v, k) => (
                  <circle key={k} cx={x} cy={y(v)} r={3} fill="#b9534b" />
                ))}
              <text x={x} y={250} textAnchor="middle" fontSize={12}>
                {op.length > 16 ? op.slice(0, 15) + "…" : op}
              </text>
            </g>
          );
        })}
        <text x={width / 2} y={275} textAnchor="middle" fontSize={11}>
          Operadores · círculo: media · línea discontinua: media global
        </text>
      </svg>
    </div>
  );
}
export function RrReport({
  study,
  result,
}: {
  study: RrStudy;
  result: RrResult;
}) {
  const { components, percent, verdict } = result;
  const variation = components
    .filter((_, i) => [0, 1, 2, 5].includes(i))
    .map((c) => ({
      fuente: c.name,
      contribution: c.contribution,
      study: c.studyPercent,
    }));
  const partData = study.readings.map((r) => ({
    x: result.parts.indexOf(r.part),
    value: r.value,
  }));
  const meanData = result.partMeans.map((p, i) => ({ x: i, value: p.mean }));
  const interaction = result.parts.map((part) => ({
    part,
    values: Object.fromEntries(
      result.cells
        .filter((c) => c.part === part)
        .map((c) => [c.operator, c.mean]),
    ),
  }));
  return (
    <div className="rr-report" data-testid="rr-report">
      <div className="section-heading">
        <div>
          <h2>Estudio R&R del sistema de medición — {study.name}</h2>
          <p>
            Informe de resumen · ANOVA cruzado · {study.characteristic} (
            {study.unit})
          </p>
        </div>
      </div>
      <div className="rr-summary">
        <section>
          <h3>¿Puede evaluar bien el rendimiento del proceso?</h3>
          <div className="rr-gauge-labels">
            <span>0 %</span>
            <span>10 %</span>
            <span>30 %</span>
            <span>100 %</span>
          </div>
          <div
            className="rr-gauge"
            role="img"
            aria-label={`R&R: ${percent === null ? "no evaluable" : fmt(percent) + " %"}`}
          >
            {percent !== null && (
              <span
                className="rr-marker"
                style={{ left: `${Math.min(100, percent)}%` }}
              />
            )}
          </div>
          <p className="rr-verdict" data-testid="rr-verdict">
            {verdict} · <strong>{fmt(percent)} %</strong> de variación de
            estudio
          </p>
          <p>
            La variación del sistema de medición equivale al {fmt(percent)} % de
            la variación total estimada con las partes de este estudio.
          </p>
          <p className="footnote">
            ≤10 %: aceptable · &gt;10–30 %: marginal · &gt;30 %: inaceptable.
            Orientación general; confirma los requisitos de tu aplicación.
          </p>
        </section>
        <section>
          <h3>Información sobre el estudio</h3>
          <dl className="rr-details">
            <dt>Sistema de medición</dt>
            <dd>{study.name}</dd>
            <dt>Fecha</dt>
            <dd>{study.date || "Sin documentar"}</dd>
            <dt>Notificado por</dt>
            <dd>{study.reportedBy || "Sin documentar"}</dd>
            <dt>Número de partes</dt>
            <dd>{result.parts.length}</dd>
            <dt>Número de operadores</dt>
            <dd>{result.operators.length}</dd>
            <dt>Número de réplicas por parte y operador</dt>
            <dd>{result.repetitions}</dd>
            <dt>Lecturas guardadas</dt>
            <dd data-testid="rr-count">{study.readings.length}</dd>
            <dt>Amplitud de tolerancia (LSE − LIE)</dt>
            <dd>
              {fmt(study.tolerance)}{" "}
              {study.tolerance === null ? "" : study.unit}
            </dd>
            <dt>Categorías distintas (ndc)</dt>
            <dd>
              {result.perfectSeparation
                ? "Sin límite (R&R = 0)"
                : (result.ndc ?? "No evaluable")}
            </dd>
          </dl>
        </section>
      </div>
      <div className="rr-chart-grid">
        <section className="rr-chart" aria-label="Componentes de variación">
          <h3>Componentes de variación</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart
              data={variation}
              margin={{ top: 10, right: 8, bottom: 45, left: 0 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="fuente"
                interval={0}
                tick={{ fontSize: 10 }}
                angle={-15}
                textAnchor="end"
              />
              <YAxis domain={[0, 100]} unit="%" width={48} />
              <Tooltip formatter={(v) => fmt(Number(v)) + " %"} />
              <Legend verticalAlign="top" />
              <ReferenceLine y={10} stroke="#2b9477" strokeDasharray="3 3" />
              <ReferenceLine y={30} stroke="#b9534b" strokeDasharray="3 3" />
              <Bar
                dataKey="contribution"
                name="% Contribución"
                fill="#83b4d9"
                isAnimationActive={false}
              />
              <Bar
                dataKey="study"
                name="% Var. estudio"
                fill="#b9534b"
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </section>
        <section className="rr-chart" aria-label="Mediciones por partes">
          <h3>Mediciones por partes</h3>
          <ResponsiveContainer width="100%" height={280}>
            <ComposedChart margin={{ top: 20, right: 15, bottom: 15, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis
                type="number"
                dataKey="x"
                domain={[-0.3, result.parts.length - 0.7]}
                ticks={result.parts.map((_, i) => i)}
                tickFormatter={(i) => result.parts[i] ?? ""}
              />
              <YAxis dataKey="value" domain={["auto", "auto"]} width={55} />
              <Tooltip
                labelFormatter={(i) =>
                  "Parte " + (result.parts[Number(i)] ?? i)
                }
                formatter={(v) => [fmt(Number(v)), study.unit]}
              />
              <Legend />
              <Scatter
                data={partData}
                name="Lecturas"
                fill="#89939b"
                opacity={0.55}
                isAnimationActive={false}
              />
              <Line
                data={meanData}
                dataKey="value"
                name="Media por parte"
                stroke="#137dce"
                dot={{ r: 4 }}
                isAnimationActive={false}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </section>
        <section className="rr-chart" aria-label="Gráfica R por operadores">
          <h3>Gráfica R por operadores</h3>
          <RangeChart result={result} />
        </section>
        <section className="rr-chart" aria-label="Mediciones por operadores">
          <h3>Mediciones por operadores</h3>
          <OperatorBoxes study={study} result={result} />
        </section>
        <section
          className="rr-chart"
          aria-label="Gráfica Xbarra por operadores"
        >
          <h3>Gráfica X̄ por operadores</h3>
          <RangeChart result={result} average />
        </section>
        <section
          className="rr-chart"
          aria-label="Interacción partes por operadores"
        >
          <h3>Interacción partes × operadores</h3>
          <ResponsiveContainer width="100%" height={280}>
            <LineChart
              data={interaction}
              margin={{ top: 20, right: 15, bottom: 15, left: 0 }}
            >
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="part" />
              <YAxis domain={["auto", "auto"]} width={55} />
              <Tooltip formatter={(v) => fmt(Number(v)) + " " + study.unit} />
              <Legend />
              {result.operators.map((op, i) => (
                <Line
                  key={op}
                  name={op}
                  dataKey={(row) => row.values[op]}
                  stroke={colors[i % colors.length]}
                  strokeDasharray={i % 2 ? "5 3" : undefined}
                  dot={{ r: 3 }}
                  isAnimationActive={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        </section>
      </div>
      <div className="rr-summary">
        <section aria-label="Fuentes de variación">
          <h3>Fuentes de variación</h3>
          <ResponsiveContainer width="100%" height={235}>
            <BarChart
              data={variation.slice(0, 3)}
              margin={{ top: 15, right: 20, bottom: 18, left: 0 }}
            >
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis dataKey="fuente" tick={{ fontSize: 10 }} />
              <YAxis domain={[0, 100]} unit="%" width={48} />
              <Tooltip formatter={(v) => fmt(Number(v)) + " %"} />
              <Legend />
              <ReferenceLine y={10} stroke="#2b9477" strokeDasharray="3 3" />
              <ReferenceLine y={30} stroke="#b9534b" strokeDasharray="3 3" />
              <Bar
                dataKey="study"
                name="% Var. estudio"
                fill="#137dce"
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </section>
        <section>
          <h3>Interpretación de las fuentes</h3>
          <p>
            La repetibilidad representa{" "}
            {fmt(
              components[0].sd > 0
                ? (100 * components[1].sd) / components[0].sd
                : null,
            )}{" "}
            % de la variación del sistema de medición y{" "}
            {fmt(components[1].studyPercent)} % de la variación total del
            estudio.
          </p>
          <p>
            La reproducibilidad representa{" "}
            {fmt(
              components[0].sd > 0
                ? (100 * components[2].sd) / components[0].sd
                : null,
            )}{" "}
            % de la variación del sistema de medición y{" "}
            {fmt(components[2].studyPercent)} % de la variación total del
            estudio.
          </p>
          <p className="footnote">
            Porcentajes calculados con desviaciones estándar, no aditivos.
            Examina rangos, diferencias entre operadores e interacción para
            orientar las mejoras.
          </p>
        </section>
      </div>
      <h3>Comentarios</h3>
      <p>
        Repetibilidad: variación al repetir la medición de la misma parte con el
        mismo operador. Reproducibilidad: variación entre operadores e
        interacción parte–operador cuando se conserva en el modelo. Los
        porcentajes de contribución usan varianzas; los de estudio usan
        desviaciones estándar y no se suman.
      </p>
      <p>
        {result.pooled
          ? "La interacción no es significativa (p ≥ 0.05): se agrupa con el error para el modelo final."
          : "Se conserva la interacción parte–operador en el modelo final."}{" "}
        Valor p de interacción: {pValue(result.interactionP)}.
      </p>
      {percent === null && (
        <p className="error">
          Sin variación total: el estudio no permite evaluar el sistema de
          medición.
        </p>
      )}
      {result.ndc !== null && result.ndc < 5 && (
        <p className="info-strip">
          ndc &lt; 5: el sistema distingue pocas categorías de partes.
        </p>
      )}
      <h3>Tabla ANOVA con interacción</h3>
      <AnovaTable rows={result.fullTable} />
      {result.pooled && (
        <>
          <h3>Tabla ANOVA final sin interacción</h3>
          <AnovaTable rows={result.table} />
        </>
      )}
      <h3>Componentes y evaluación del sistema</h3>
      <div className="table-wrap">
        <table data-testid="rr-components">
          <thead>
            <tr>
              {[
                "Fuente",
                "Varianza",
                "% Contribución",
                "Desv. est.",
                "Var. estudio (6s)",
                "% Var. estudio",
                "% Tolerancia",
              ].map((t) => (
                <th key={t}>{t}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {components.map((c) => (
              <tr key={c.name}>
                <td>{c.name}</td>
                <td>{numeric(c.variance)}</td>
                <td>{fmt(c.contribution)}</td>
                <td>{numeric(c.sd)}</td>
                <td>{numeric(c.studyVariation)}</td>
                <td>{fmt(c.studyPercent)}</td>
                <td>{fmt(c.tolerancePercent)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="footnote">
        Modelo de efectos aleatorios, cruzado y balanceado; α de interacción =
        0.05. Componentes negativos de varianza se estiman como cero. Variación
        de estudio = 6s; % tolerancia = 100 × 6s / (LSE − LIE), solo si se
        documenta tolerancia. ndc = máx(1, entero inferior de 1.41 × s_parte /
        s_R&R). Límites X̄–R con A₂, D₃ y D₄, de 2 a 10 réplicas. Requiere
        mediciones independientes, orden aleatorizado y partes representativas;
        las gráficas no prueban estos supuestos. Se recomiendan al menos 10
        partes, 3 operadores y 2 réplicas. Unidad de todas las gráficas de
        lecturas: {study.unit}.
      </p>
      {study.notes && <p>Observaciones: {study.notes}</p>}
    </div>
  );
}
