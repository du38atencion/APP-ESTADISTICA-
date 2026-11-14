import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
} from "recharts";
import { stats, fmt } from "./domain";
import { RrReport } from "./RrReport";
import { rrAnova } from "./rr";
import {
  datasetFromRows,
  parseDelimited,
  parseJsonRows,
  automaticRrStudy,
  type AnalysisDataset,
  type AnalysisSeries,
} from "./analysis-data";

export function DataUpload({
  onLoad,
}: {
  onLoad: (dataset: AnalysisDataset) => boolean;
}) {
  const [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  return (
    <section
      className="panel no-print"
      aria-label="Carga automática de valores"
    >
      <div className="section-heading">
        <div>
          <h2>Cargar datos y obtener resultados</h2>
          <p>
            Selecciona un archivo con valores. Las gráficas y estadísticas
            aparecen automáticamente, sin capturar un estudio ni volver a
            escribir las mediciones.
          </p>
        </div>
      </div>
      <label className="file-button">
        {busy ? "Leyendo archivo…" : "Cargar archivo de valores"}
        <input
          type="file"
          disabled={busy}
          accept=".csv,.tsv,.txt,.xlsx,.json"
          aria-label="Cargar archivo de valores"
          onChange={async (e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const input = e.currentTarget;
            setBusy(true);
            setError("");
            try {
              if (file.size > 20_000_000)
                throw Error("El archivo supera 20 MB.");
              let rows: unknown[][];
              if (/\.xlsx$/i.test(file.name)) {
                const { readSheet: read } =
                  await import("read-excel-file/universal");
                rows = await read(file);
              } else if (/\.json$/i.test(file.name))
                rows = parseJsonRows(JSON.parse(await file.text()));
              else
                rows = parseDelimited(
                  await file.text(),
                  /\.txt$/i.test(file.name),
                );
              const dataset = datasetFromRows(rows, file.name);
              if (!onLoad(dataset))
                setError(
                  "No se guardó el archivo. Los datos anteriores se conservan.",
                );
            } catch (error) {
              setError((error as Error).message);
            } finally {
              setBusy(false);
              input.value = "";
            }
          }}
        />
      </label>
      <p className="footnote">
        CSV, TXT, TSV, Excel XLSX (primera hoja) o JSON. Se reconoce cada
        columna numérica y se analiza por separado; encabezados opcionales. Los
        archivos cargados se guardan en el respaldo, sin reemplazar tus
        mediciones anteriores.
      </p>
      {error && (
        <div className="error" role="alert">
          {error}
        </div>
      )}
    </section>
  );
}
function Distribution({ series }: { series: AnalysisSeries }) {
  const values = series.points.map((p) => p.value),
    st = stats(values),
    sorted = [...values].sort((a, b) => a - b);
  const min = st.min!,
    max = st.max!,
    count = Math.max(1, Math.min(30, Math.ceil(Math.sqrt(values.length)))),
    width = (max - min || 1) / count;
  const bins = Array.from({ length: count }, (_, i) => ({
    intervalo: `${fmt(min + i * width)}–${fmt(min + (i + 1) * width)}`,
    frecuencia: 0,
  }));
  for (const value of values)
    bins[Math.min(count - 1, Math.floor((value - min) / width))].frecuencia++;
  const quant = (p: number) => {
    const n = (values.length - 1) * p,
      i = Math.floor(n);
    return (
      sorted[i] +
      (sorted[Math.min(i + 1, values.length - 1)] - sorted[i]) * (n - i)
    );
  };
  const q1 = quant(0.25),
    median = quant(0.5),
    q3 = quant(0.75),
    x = (v: number) => 45 + ((v - min) / (max - min || 1)) * 510;
  const ordered = series.points
    .slice(0, 2000)
    .map((p, i) => ({ orden: i + 1, valor: p.value }));
  const differences = values.slice(1).map((v, i) => Math.abs(v - values[i])),
    mr = stats(differences).mean ?? 0;
  const lower = st.mean! - 2.66 * mr,
    upper = st.mean! + 2.66 * mr;
  return (
    <>
      <div className="rr-details auto-stats" data-testid="auto-stats">
        {[
          ["Lecturas", st.n],
          ["Media", st.mean],
          ["Mediana", st.median],
          ["Desviación estándar", st.sd],
          ["Mínimo", st.min],
          ["Máximo", st.max],
          ["Rango", st.range],
          ["Celdas vacías omitidas", series.missing],
        ].map(([name, value]) => (
          <div key={String(name)}>
            <span>{name}</span>
            <strong>{value === null ? "—" : fmt(Number(value))}</strong>
          </div>
        ))}
      </div>
      <div className="rr-chart-grid" data-testid="auto-charts">
        <section className="rr-chart" aria-label="Tendencia automática">
          <h3>Tendencia de valores</h3>
          <ResponsiveContainer width="100%" height={260}>
            <LineChart data={ordered}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="orden" name="Orden del archivo" />
              <YAxis domain={["auto", "auto"]} width={60} />
              <Tooltip />
              <Line
                name={series.name}
                dataKey="valor"
                stroke="#137dce"
                dot={values.length < 80 ? { r: 3 } : false}
                isAnimationActive={false}
              />
            </LineChart>
          </ResponsiveContainer>
        </section>
        <section className="rr-chart" aria-label="Histograma automático">
          <h3>Histograma de valores</h3>
          <ResponsiveContainer width="100%" height={260}>
            <BarChart data={bins} margin={{ bottom: 35 }}>
              <CartesianGrid vertical={false} strokeDasharray="3 3" />
              <XAxis
                dataKey="intervalo"
                tick={{ fontSize: 10 }}
                angle={-25}
                textAnchor="end"
              />
              <YAxis allowDecimals={false} />
              <Tooltip />
              <Bar
                dataKey="frecuencia"
                name="Frecuencia"
                fill="#137dce"
                isAnimationActive={false}
              />
            </BarChart>
          </ResponsiveContainer>
        </section>
        <section className="rr-chart" aria-label="Caja automática">
          <h3>Diagrama de caja</h3>
          <svg
            viewBox="0 0 600 200"
            role="img"
            aria-label={`Mínimo ${fmt(min)}, Q1 ${fmt(q1)}, mediana ${fmt(median)}, Q3 ${fmt(q3)}, máximo ${fmt(max)}`}
          >
            <line x1={45} x2={555} y1={80} y2={80} stroke="#7a91a4" />
            <rect
              x={x(q1)}
              y={45}
              width={Math.max(2, x(q3) - x(q1))}
              height={70}
              fill="#a8c9e5"
              stroke="#137dce"
            />
            <line
              x1={x(median)}
              x2={x(median)}
              y1={45}
              y2={115}
              stroke="#183348"
              strokeWidth={3}
            />
            {[min, max].map((v, i) => (
              <g key={i}>
                <line x1={x(v)} x2={x(v)} y1={60} y2={100} stroke="#7a91a4" />
                <text x={x(v)} y={145} textAnchor="middle" fontSize={12}>
                  {fmt(v)}
                </text>
              </g>
            ))}
          </svg>
          <p className="footnote">
            Q1 {fmt(q1)} · Mediana {fmt(median)} · Q3 {fmt(q3)}. Bigotes
            mínimo–máximo.
          </p>
        </section>
        <section className="rr-chart" aria-label="Control automático">
          <h3>Control individual I–MR</h3>
          {values.length < 20 ? (
            <p>
              Se necesitan al menos 20 valores para estimar límites de control
              individuales. Las demás gráficas ya están disponibles.
            </p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={ordered} margin={{ right: 32 }}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="orden" />
                  <YAxis domain={["auto", "auto"]} width={60} />
                  <Tooltip />
                  <ReferenceLine y={st.mean!} stroke="#2b9477" />
                  <ReferenceLine
                    y={lower}
                    ifOverflow="extendDomain"
                    stroke="#b9534b"
                    label="LCI"
                  />
                  <ReferenceLine
                    y={upper}
                    ifOverflow="extendDomain"
                    stroke="#b9534b"
                    label="LCS"
                  />
                  <Line
                    dataKey="valor"
                    stroke="#137dce"
                    dot={false}
                    isAnimationActive={false}
                  />
                </LineChart>
              </ResponsiveContainer>
              <p className="footnote">
                LCI {fmt(lower)} · Media {fmt(st.mean)} · LCS {fmt(upper)} · MR̄{" "}
                {fmt(mr)}. Estimación exploratoria según el orden de carga;
                requiere muestreo secuencial comparable e independencia. No es
                R&R ni un criterio de aceptación.
              </p>
            </>
          )}
        </section>
      </div>
      <p className="footnote">
        Unidad: {series.unit}. Cada columna se analiza por separado.{" "}
        {values.length > 2000
          ? "Las tendencias muestran las primeras 2000 lecturas; los resúmenes, cajas, histogramas y límites usan todas las lecturas."
          : ""}
      </p>
    </>
  );
}
export function AutomaticAnalysis({
  series,
  onUpload,
}: {
  series: AnalysisSeries[];
  onUpload: (dataset: AnalysisDataset) => boolean;
}) {
  const [selected, setSelected] = useState("");
  const active = series.find((s) => s.id === selected) ?? series[0];
  const candidate = active ? automaticRrStudy(active, active.name) : null;
  let result: ReturnType<typeof rrAnova> | null = null,
    rrIssue = "";
  if (candidate)
    try {
      result = rrAnova(candidate.readings);
    } catch (e) {
      rrIssue = (e as Error).message;
    }
  return (
    <>
      <DataUpload
        onLoad={(dataset) => {
          if (onUpload(dataset)) {
            setSelected(dataset.series[0].id);
            return true;
          }
          return false;
        }}
      />
      <section
        className="panel automatic-analysis"
        aria-label="Resultados automáticos"
      >
        <div className="section-heading">
          <div>
            <h2>Gráficas y resultados automáticos</h2>
            <p>
              Se actualizan al cargar datos o guardar mediciones. No necesitas
              volver a introducir valores.
            </p>
          </div>
          {active && (
            <button className="no-print" onClick={() => window.print()}>
              Imprimir resultados / PDF
            </button>
          )}
        </div>
        {active ? (
          <>
            <label className="no-print">
              Datos analizados
              <select
                aria-label="Datos analizados"
                value={active.id}
                onChange={(e) => setSelected(e.target.value)}
              >
                {series.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <h3>{active.name}</h3>
            <Distribution series={active} />
            {result && candidate ? (
              <RrReport study={candidate} result={result} />
            ) : (
              <p className="info-strip" data-testid="rr-unavailable">
                {rrIssue
                  ? `R&R por ANOVA no calculable: ${rrIssue}`
                  : "R&R por ANOVA no estimable con solo valores: no se puede separar la variación entre operadores de la repetibilidad. Las gráficas y estadísticas anteriores se calculan automáticamente con tus datos."}
              </p>
            )}
          </>
        ) : (
          <p className="info-strip">
            Carga un archivo de valores o utiliza tus mediciones guardadas. No
            se necesitan formularios de parte, operador ni repetición.
          </p>
        )}
      </section>
    </>
  );
}
