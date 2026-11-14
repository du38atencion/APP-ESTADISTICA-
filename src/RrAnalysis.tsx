import { useState } from "react";
import {
  rrAnova,
  rrStudySchema,
  validateRrReadings,
  type RrReading,
  type RrStudy,
} from "./rr";
import { RrReport } from "./RrReport";
import { csv, fmt, uid } from "./domain";

const localDate = () =>
  new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 10);
function downloadReadings(study: RrStudy) {
  const content = csv(
    study.readings.map((r) => ({
      Estudio: study.name,
      Característica: study.characteristic,
      Unidad: study.unit,
      Parte: r.part,
      Operador: r.operator,
      Repetición: r.repetition,
      Medición: r.value,
    })),
  );
  const url = URL.createObjectURL(
    new Blob([content], { type: "text/csv;charset=utf-8" }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = "q-monitor-rr.csv";
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
export function RrAnalysis({
  studies,
  onSave,
}: {
  studies: RrStudy[];
  onSave: (studies: RrStudy[]) => boolean;
}) {
  const [validationError, setValidationError] = useState("");
  const [selected, setSelected] = useState(studies[0]?.id ?? "");
  const [creating, setCreating] = useState(!studies.length),
    [editingStudy, setEditingStudy] = useState(false);
  const [editing, setEditing] = useState<RrReading | null>(null),
    [formVersion, setFormVersion] = useState(0);
  const [paste, setPaste] = useState(""),
    [message, setMessage] = useState("");
  const study = studies.find((s) => s.id === selected) ?? studies[0];
  const showStudyForm = creating || editingStudy || !study;
  const commit = (next: RrStudy) =>
    onSave(studies.map((s) => (s.id === next.id ? next : s)));
  let result: ReturnType<typeof rrAnova> | null = null,
    pending = "";
  if (study && study.readings.length) {
    try {
      result = rrAnova(study.readings, study.tolerance);
    } catch (e) {
      pending = (e as Error).message;
    }
  }
  return (
    <section className="panel rr-analysis" aria-label="R&R por ANOVA">
      <div className="section-heading no-print">
        <div>
          <span className="section-kicker">SISTEMA DE MEDICIÓN</span>
          <h2>R&R por ANOVA</h2>
          <p>
            Estudio cruzado de repetibilidad y reproducibilidad. Cada parte debe
            medirse por cada operador.
          </p>
        </div>
        <button
          onClick={() => {
            setCreating(true);
            setEditingStudy(false);
            setMessage("");
          }}
        >
          Nuevo estudio R&R
        </button>
      </div>
      <div className="filters no-print">
        {studies.length > 0 && (
          <label>
            Estudio R&R
            <select
              value={study?.id ?? ""}
              onChange={(e) => {
                setSelected(e.target.value);
                setCreating(false);
                setEditingStudy(false);
                setEditing(null);
                setPaste("");
                setMessage("");
                setValidationError("");
              }}
            >
              {studies.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {study && !showStudyForm && (
          <>
            <button onClick={() => setEditingStudy(true)}>
              Editar información del estudio
            </button>
            <button
              disabled={!study.readings.length}
              onClick={() => downloadReadings(study)}
            >
              Exportar lecturas R&R (CSV)
            </button>
            <button disabled={!result} onClick={() => window.print()}>
              Imprimir R&R / PDF
            </button>
          </>
        )}
      </div>
      {validationError && (
        <div role="alert" className="error no-print">
          {validationError}
        </div>
      )}
      {message && (
        <div className="success no-print" role="status">
          {message}
        </div>
      )}
      {showStudyForm && (
        <form
          key={creating ? "new-study" : study?.id}
          className="rr-study-form no-print"
          onSubmit={(e) => {
            e.preventDefault();
            setMessage("");
            const data = new FormData(e.currentTarget),
              g = (key: string) => String(data.get(key) ?? "").trim();
            const tolerance =
              g("tolerance") === "" ? null : Number(g("tolerance"));
            if (
              tolerance !== null &&
              (!Number.isFinite(tolerance) || tolerance <= 0)
            )
              return;
            const next: RrStudy = {
              id: creating || !study ? uid() : study.id,
              name: g("name"),
              date: g("date"),
              reportedBy: g("reportedBy"),
              characteristic: g("characteristic"),
              unit: g("unit"),
              tolerance,
              notes: g("notes"),
              readings: creating || !study ? [] : study.readings,
            };
            const parsed = rrStudySchema.safeParse(next);
            if (!parsed.success) {
              setValidationError(
                "Completa el nombre, la característica y la unidad del estudio.",
              );
              return;
            }
            if (
              onSave(
                creating || !study
                  ? [...studies, next]
                  : studies.map((s) => (s.id === next.id ? next : s)),
              )
            ) {
              setSelected(next.id);
              setValidationError("");
              setCreating(false);
              setEditingStudy(false);
              setEditing(null);
              setMessage("Información del estudio guardada.");
            }
          }}
        >
          <h3>
            {creating ? "Identificar nuevo estudio" : "Información del estudio"}
          </h3>
          <div className="form-grid">
            <label>
              Nombre del sistema de medición *
              <input
                name="name"
                required
                maxLength={120}
                defaultValue={creating ? "" : study?.name}
              />
            </label>
            <label>
              Fecha del estudio *
              <input
                name="date"
                type="date"
                required
                defaultValue={creating ? localDate() : study?.date}
              />
            </label>
            <label>
              Notificado por
              <input
                name="reportedBy"
                defaultValue={creating ? "" : study?.reportedBy}
              />
            </label>
            <label>
              Característica medida *
              <input
                name="characteristic"
                placeholder="Ej. Diámetro"
                required
                defaultValue={creating ? "" : study?.characteristic}
              />
            </label>
            <label>
              Unidad *
              <input
                name="unit"
                placeholder="Ej. mm, °C, pH"
                required
                defaultValue={creating ? "" : study?.unit}
              />
            </label>
            <label>
              Amplitud de tolerancia (LSE − LIE)
              <input
                name="tolerance"
                type="number"
                step="any"
                min="0.000000000001"
                defaultValue={creating ? "" : (study?.tolerance ?? "")}
              />
            </label>
          </div>
          <label>
            Observaciones del estudio
            <textarea
              name="notes"
              defaultValue={creating ? "" : study?.notes}
            />
          </label>
          <div className="button-row">
            <button className="primary">Guardar estudio</button>
            {study && (
              <button
                type="button"
                onClick={() => {
                  setCreating(false);
                  setEditingStudy(false);
                }}
              >
                Cancelar
              </button>
            )}
          </div>
        </form>
      )}
      {study && !showStudyForm && (
        <>
          <div className="rr-entry no-print">
            <h3>
              Lecturas de {study.characteristic} ({study.unit})
            </h3>
            <p>
              Estas lecturas pertenecen solo al estudio seleccionado. Las
              mediciones del historial permanecen intactas. Identifica la misma
              parte y el mismo operador de forma consistente.
            </p>
            <form
              key={`${study.id}-${editing?.id ?? "new"}-${formVersion}`}
              onSubmit={(e) => {
                e.preventDefault();
                setMessage("");
                const data = new FormData(e.currentTarget),
                  g = (k: string) => String(data.get(k) ?? "").trim();
                const next: RrReading = {
                  id: editing?.id ?? uid(),
                  part: g("part"),
                  operator: g("operator"),
                  repetition: Number(g("repetition")),
                  value: g("value") === "" ? NaN : Number(g("value")),
                };
                const readings = editing
                  ? study.readings.map((r) => (r.id === editing.id ? next : r))
                  : [...study.readings, next];
                try {
                  validateRrReadings(readings);
                  if (commit({ ...study, readings })) {
                    setEditing(null);
                    setValidationError("");
                    setFormVersion((n) => n + 1);
                    setMessage(
                      "Lectura R&R guardada. Resultados y gráficas actualizados.",
                    );
                  }
                } catch (error) {
                  setMessage("");
                  setValidationError((error as Error).message);
                }
              }}
            >
              <div className="rr-reading-grid">
                <label>
                  Parte *
                  <input
                    name="part"
                    list="rr-parts"
                    required
                    defaultValue={editing?.part}
                    placeholder="Ej. P01"
                  />
                </label>
                <label>
                  Operador R&R *
                  <input
                    name="operator"
                    list="rr-operators"
                    required
                    defaultValue={editing?.operator}
                    placeholder="Ej. Ana"
                  />
                </label>
                <label>
                  Repetición *
                  <input
                    name="repetition"
                    type="number"
                    min={1}
                    max={10}
                    step={1}
                    required
                    defaultValue={editing?.repetition ?? 1}
                  />
                </label>
                <label>
                  Medición ({study.unit}) *
                  <input
                    name="value"
                    type="number"
                    step="any"
                    required
                    defaultValue={editing?.value}
                  />
                </label>
                <button className="primary">
                  {editing ? "Guardar corrección R&R" : "Guardar lectura R&R"}
                </button>
              </div>
              {editing && (
                <button type="button" onClick={() => setEditing(null)}>
                  Cancelar corrección
                </button>
              )}
            </form>
            <datalist id="rr-parts">
              {[...new Set(study.readings.map((r) => r.part))].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </datalist>
            <datalist id="rr-operators">
              {[...new Set(study.readings.map((r) => r.operator))].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </datalist>
            <details>
              <summary>Agregar varias lecturas desde Excel o una tabla</summary>
              <p>
                Una fila por lectura: Parte; Operador; Repetición; Medición. Se
                aceptan tabuladores o punto y coma, con punto o coma decimal.
                Encabezado opcional: Parte; Operador; Repetición; Medición. La
                importación agrega filas; no reemplaza datos.
              </p>
              <label>
                Tabla de lecturas R&R
                <textarea
                  rows={6}
                  value={paste}
                  onChange={(e) => setPaste(e.target.value)}
                  placeholder={"P01; Ana; 1; 25.02\nP01; Ana; 2; 25.04"}
                />
              </label>
              <button
                disabled={!paste.trim()}
                onClick={() => {
                  setMessage("");
                  try {
                    const lines = paste
                      .trim()
                      .split(/\r?\n/)
                      .filter((v) => v.trim());
                    if (lines.length > 5001)
                      throw Error(
                        "Importa como máximo 5000 lecturas por operación.",
                      );
                    if (/^parte\s*[;\t]/i.test(lines[0]?.trim())) lines.shift();
                    const added = lines.map((line, i) => {
                      const columns = line
                        .split(line.includes("\t") ? "\t" : ";")
                        .map((v) => v.trim());
                      if (columns.length !== 4 || columns.some((v) => !v))
                        throw Error(
                          `Fila ${i + 1}: se necesitan cuatro columnas completas.`,
                        );
                      return {
                        id: uid(),
                        part: columns[0],
                        operator: columns[1],
                        repetition: Number(columns[2]),
                        value: Number(columns[3].replace(",", ".")),
                      };
                    });
                    if (!added.length)
                      throw Error("La tabla no contiene lecturas.");
                    const readings = [...study.readings, ...added];
                    validateRrReadings(readings);
                    if (commit({ ...study, readings })) {
                      setPaste("");
                      setValidationError("");
                      setMessage(
                        `${added.length} lecturas R&R guardadas. Resultados y gráficas actualizados.`,
                      );
                    }
                  } catch (error) {
                    setValidationError((error as Error).message);
                    setMessage("");
                  }
                }}
              >
                Agregar tabla de lecturas
              </button>
            </details>
            <details>
              <summary>
                Datos guardados del estudio ({study.readings.length})
              </summary>
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      {[
                        "Parte",
                        "Operador",
                        "Repetición",
                        `Medición (${study.unit})`,
                        "Acciones",
                      ].map((v) => (
                        <th key={v}>{v}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {study.readings.map((row) => (
                      <tr key={row.id}>
                        <td>{row.part}</td>
                        <td>{row.operator}</td>
                        <td>{row.repetition}</td>
                        <td>{fmt(row.value)}</td>
                        <td>
                          <button
                            onClick={() => {
                              setEditing(row);
                              setValidationError("");
                              setMessage("");
                            }}
                          >
                            Corregir lectura {row.part} / {row.operator} /{" "}
                            {row.repetition}
                          </button>
                          <button
                            onClick={() => {
                              if (
                                confirm(
                                  `¿Eliminar solo la lectura R&R ${row.part} / ${row.operator} / ${row.repetition}?`,
                                )
                              )
                                if (
                                  commit({
                                    ...study,
                                    readings: study.readings.filter(
                                      (r) => r.id !== row.id,
                                    ),
                                  })
                                ) {
                                  setMessage(
                                    "Lectura R&R eliminada. Resultados actualizados.",
                                  );
                                  if (editing?.id === row.id) setEditing(null);
                                }
                            }}
                          >
                            Eliminar lectura
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </details>
          </div>
          {result ? (
            <RrReport study={study} result={result} />
          ) : (
            <div className="info-strip" role="status">
              {pending || "Registra lecturas para calcular R&R por ANOVA."} Se
              recomiendan 10 partes × 3 operadores × 2 réplicas. No se calculan
              resultados con combinaciones faltantes.
            </div>
          )}
        </>
      )}
    </section>
  );
}
