import { useState } from "react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  BarChart,
  Bar,
} from "recharts";
import { fmt, stats } from "./domain";
import type { Measurement, Variable, Trial } from "./domain";
export function ControlChart({
  rows,
  variable,
}: {
  rows: Measurement[];
  variable: Variable;
}) {
  const [confirmed, setConfirmed] = useState(false);
  const ordered = [...rows].sort((a, b) => a.date.localeCompare(b.date)),
    values = ordered.map((m) => m[variable]!),
    mean = stats(values).mean!,
    mr = values.slice(1).map((v, i) => Math.abs(v - values[i])),
    mrMean = stats(mr).mean ?? 0,
    lower = mean - 2.66 * mrMean,
    upper = mean + 2.66 * mrMean;
  return (
    <>
      <label className="check-label">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
        />
        Confirmo muestreo individual secuencial comparable, independencia y un
        periodo base apropiado para estimar límites.
      </label>
      {!confirmed || rows.length < 20 ? (
        <p className="info-strip">
          Se requieren al menos 20 observaciones del mismo grupo y validación de
          los supuestos. Los límites de control describen variación del proceso;
          no son criterios de aceptación.
        </p>
      ) : (
        <>
          <p>
            Estimación exploratoria I-MR · n={values.length} · Media {fmt(mean)}{" "}
            · MR̄ {fmt(mrMean)} · LIC {fmt(lower)} · LSC {fmt(upper)}.
          </p>
          {[false, true].map((moving) => (
            <div key={String(moving)}>
              <h3>{moving ? "Rangos móviles" : "Valores individuales"}</h3>
              <ResponsiveContainer width="100%" height={230}>
                <LineChart
                  data={values.map((value, i) => ({
                    orden: i + 1,
                    valor: moving ? (i ? mr[i - 1] : null) : value,
                  }))}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="orden" />
                  <YAxis domain={["auto", "auto"]} />
                  <Tooltip />
                  <ReferenceLine y={moving ? mrMean : mean} stroke="#619980" />
                  <ReferenceLine
                    y={moving ? 3.267 * mrMean : upper}
                    stroke="#c26756"
                    label="LSC"
                  />
                  <ReferenceLine
                    y={moving ? 0 : lower}
                    stroke="#c26756"
                    label="LIC"
                  />
                  <Line dataKey="valor" stroke="#137dce" dot={{ r: 2 }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          ))}
          <p className="footnote">
            I: media ± 2.66 MR̄. MR: LIC=0, LSC=3.267 MR̄ (rangos de dos
            observaciones).{" "}
            {values.filter((v) => v < lower || v > upper).length} puntos
            individuales fuera de límites estimados. No se aplican reglas de
            rachas ni se demuestra estabilidad automáticamente.
          </p>
        </>
      )}
    </>
  );
}
export function Repeatability({ trials }: { trials: Trial[] }) {
  const groups = Object.entries(
    trials.reduce<Record<string, Trial[]>>((a, t) => {
      const k = [
        t.session,
        t.sample,
        t.instrument,
        t.method,
        t.conditions,
        t.reference,
      ].join(" / ");
      (a[k] ??= []).push(t);
      return a;
    }, {}),
  );
  const diffs = trials.map((t) => t.prototype - t.reference),
    min = Math.min(...diffs),
    max = Math.max(...diffs),
    count = Math.max(1, Math.ceil(Math.sqrt(diffs.length))),
    width = (max - min || 1) / count,
    bins = Array.from({ length: count }, (_, i) => ({
      intervalo: `${fmt(min + i * width)} a ${fmt(min + (i + 1) * width)}`,
      frecuencia: diffs.filter(
        (v) =>
          v >= min + i * width &&
          (i === count - 1
            ? v <= min + (i + 1) * width
            : v < min + (i + 1) * width),
      ).length,
    }));
  return (
    <>
      <h3>Distribución de diferencias</h3>
      <ResponsiveContainer width="100%" height={220}>
        <BarChart data={bins}>
          <CartesianGrid vertical={false} />
          <XAxis dataKey="intervalo" tick={{ fontSize: 10 }} />
          <YAxis allowDecimals={false} />
          <Tooltip />
          <Bar dataKey="frecuencia" fill="#40a99b" />
        </BarChart>
      </ResponsiveContainer>
      <h3>Repetibilidad por condiciones declaradas</h3>
      <p className="footnote">
        s muestral de lecturas del prototipo con misma sesión, muestra,
        referencia, instrumento, método y condiciones. El operador debe asegurar
        que esas condiciones se mantuvieron.
      </p>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Grupo experimental</th>
              <th>Repeticiones</th>
              <th>s de lecturas</th>
            </tr>
          </thead>
          <tbody>
            {groups.map(([g, ts]) => (
              <tr key={g}>
                <td>{g}</td>
                <td>{ts.length}</td>
                <td>
                  {ts.length > 1
                    ? fmt(stats(ts.map((t) => t.prototype)).sd)
                    : "Se necesitan ≥ 2"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
