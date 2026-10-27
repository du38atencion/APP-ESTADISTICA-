import { ControlChart, Repeatability } from "./AdvancedCharts";
import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import {
  Activity,
  LayoutDashboard,
  Plus,
  FlaskConical,
  Layers,
  ChartNoAxesCombined,
  ShieldCheck,
  TriangleAlert,
  Workflow,
  Wallet,
  FileDown,
  Settings,
  ArrowUpRight,
  ChevronRight,
  Search,
  Download,
  Menu,
  Check,
  X,
  Database,
  Clock,
  ArrowRight,
} from "lucide-react";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  BarChart,
  Bar,
  ScatterChart,
  Scatter,
  ReferenceLine,
  Legend,
} from "recharts";

import {
  variables,
  labels,
  initial,
  uid,
  fmt,
  status,
  usable,
  stats,
  metrology,
  filterRows,
  applicable,
  failures,
  exportRows,
  csv,
  simulation,
  economics,
  investmentKeys,
  recurringKeys,
  demo,
  validateMeasurement,
  validBackup,
  number,
} from "./domain";
import type { State, Measurement, Variable, Rule, Trial } from "./domain";
import "./style.css";
const pages = [
  "Dashboard general",
  "Registro de mediciones",
  "Lotes e historial",
  "Análisis estadístico",
  "Validación metrológica",
  "Alertas y desviaciones",
  "Simulación de procesos",
  "Evaluación económica",
  "Reportes y exportación",
  "Configuración",
];
const icons = [
  LayoutDashboard,
  Plus,
  Layers,
  ChartNoAxesCombined,
  ShieldCheck,
  TriangleAlert,
  Workflow,
  Wallet,
  FileDown,
  Settings,
];
const moistureTypes = [
  "Relativa ambiental",
  "Contenido de humedad · base húmeda",
  "Contenido de humedad · base seca",
];
const units = (v: Variable, m = "Relativa ambiental") =>
  v === "ph"
    ? "pH"
    : v === "temperature"
      ? "°C"
      : m === "Relativa ambiental"
        ? "% HR"
        : m.includes("seca")
          ? "% b.s."
          : "% b.h.";
const time = (d: string) => new Date(d).toLocaleString("es-MX");
const now = () => {
  const d = new Date();
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000)
    .toISOString()
    .slice(0, 16);
};
function load(key: string) {
  try {
    const text = localStorage.getItem(key);
    if (!text) return initial();
    const s = JSON.parse(text);
    if (!validBackup(s)) throw Error();
    return s;
  } catch {
    throw Error(
      "No se pudieron leer los datos locales. Exporta el almacenamiento original antes de restablecerlo.",
    );
  }
}
function download(name: string, data: BlobPart, type = "text/plain") {
  const a = document.createElement("a"),
    url = URL.createObjectURL(new Blob([data], { type }));
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
const Select = ({
  label,
  value,
  onChange,
  options,
  empty = "Todos",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: string[];
  empty?: string;
}) => (
  <label>
    {label}
    <select value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{empty}</option>
      {options.map((o) => (
        <option key={o}>{o}</option>
      ))}
    </select>
  </label>
);
const Field = ({
  label,
  ...props
}: React.InputHTMLAttributes<HTMLInputElement> & { label: string }) => (
  <label>
    {label}
    <input {...props} />
  </label>
);
const Empty = ({
  text = "Aún no hay mediciones",
  detail = "Los datos que registres aparecerán aquí.",
  action,
}: {
  text?: string;
  detail?: string;
  action?: () => void;
}) => (
  <div className="empty">
    <div className="empty-icon">
      <ChartNoAxesCombined size={29} />
    </div>
    <h3>{text}</h3>
    <p>{detail}</p>
    {action && (
      <button className="primary" onClick={action}>
        <Plus size={16} /> Registrar primera medición
      </button>
    )}
  </div>
);
function Badge({ value }: { value: string }) {
  return (
    <span
      className={
        "badge " +
        (value === "Conforme"
          ? "good"
          : value === "Fuera de especificación"
            ? "bad"
            : value === "Pendiente de revisión"
              ? "warning"
              : "neutral")
      }
    >
      <i />
      {value}
    </span>
  );
}
function Trend({
  rows,
  v,
  moisture = "Relativa ambiental",
}: {
  rows: Measurement[];
  v: Variable;
  moisture?: string;
}) {
  const readings = rows
    .filter(usable)
    .filter((m) => v !== "humidity" || m.moisture === moisture)
    .sort((a, b) => a.date.localeCompare(b.date));
  const groups = [...new Set(readings.map((m) => m.product + " / " + m.lot))];
  const data = readings.map((m) => ({
    fecha: time(m.date),
    [m.product + " / " + m.lot]: m[v],
  }));
  return data.length < 2 ? (
    <Empty
      text="Se necesitan al menos dos lecturas completas"
      detail="Los borradores y registros anulados se excluyen del análisis."
    />
  ) : (
    <ResponsiveContainer width="100%" height={235}>
      <LineChart
        data={data}
        margin={{ top: 12, right: 18, bottom: 0, left: 0 }}
      >
        <CartesianGrid
          strokeDasharray="3 5"
          vertical={false}
          stroke="#e8edf1"
        />
        <XAxis dataKey="fecha" tick={{ fontSize: 10 }} minTickGap={70} />
        <YAxis domain={["auto", "auto"]} tick={{ fontSize: 11 }} width={42} />
        <Tooltip />
        <Legend wrapperStyle={{ fontSize: 9 }} />
        {groups.map((g, i) => (
          <Line
            key={g}
            name={g + " · " + units(v, moisture)}
            type="linear"
            dataKey={g}
            connectNulls
            stroke={["#137dce", "#40a99b", "#d88b40", "#946ecc"][i % 4]}
            strokeWidth={2.5}
            dot={{ r: 3 }}
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

function App() {
  const [fatal] = useState(() => {
    try {
      load("qmonitor-real");
      return "";
    } catch (e) {
      return String(e);
    }
  });
  const [mode, setMode] = useState(false);
  const [real, setReal] = useState<State>(() => {
    try {
      return load("qmonitor-real");
    } catch {
      return initial();
    }
  });
  const [sample, setSample] = useState<State>(() => {
    try {
      return load("qmonitor-demo");
    } catch {
      return initial();
    }
  });
  const s = mode ? sample : real;
  const [page, setPage] = useState(0),
    [menu, setMenu] = useState(false),
    [notice, setNotice] = useState(""),
    [error, setError] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({}),
    [variable, setVariable] = useState<Variable>("ph"),
    [moisture, setMoisture] = useState(moistureTypes[0]);
  const [editing, setEditing] = useState<Measurement | null>(null),
    [detail, setDetail] = useState<Measurement | null>(null),
    [sort, setSort] = useState("date"),
    [ascending, setAscending] = useState(false),
    [pagination, setPagination] = useState(0);
  const [selectedLots, setSelectedLots] = useState<string[]>([]),
    [chart, setChart] = useState("Histograma"),
    [axis, setAxis] = useState<Variable>("temperature"),
    [trialVariable, setTrialVariable] = useState<Variable>("ph"),
    [trialSession, setTrialSession] = useState(""),
    [trialInstrument, setTrialInstrument] = useState(""),
    [report, setReport] = useState("Historial de registros");
  function save(next: State) {
    try {
      if (fatal && !mode) throw Error(fatal);
      localStorage.setItem(
        mode ? "qmonitor-demo" : "qmonitor-real",
        JSON.stringify(next),
      );
      mode ? setSample(next) : setReal(next);
      setError("");
      return true;
    } catch (e) {
      setError("No se guardaron los cambios: " + String(e));
      return false;
    }
  }
  function go(p: number) {
    setPage(p);
    setMenu(false);
    setNotice("");
    setError("");
  }
  const rows = filterRows(s.measurements, filters),
    complete = rows.filter(usable),
    lots = [
      ...new Set(s.measurements.filter((m) => !m.voided).map((m) => m.lot)),
    ],
    sorted = [...rows].sort(
      (a, b) =>
        String(a[sort as keyof Measurement] ?? "").localeCompare(
          String(b[sort as keyof Measurement] ?? ""),
          undefined,
          { numeric: true },
        ) * (ascending ? 1 : -1),
    );
  const latest = [...rows]
    .filter((m) => !m.draft)
    .sort((a, b) => b.date.localeCompare(a.date))[0];
  const out = rows.filter((m) => status(m) === "Fuera de especificación");
  const f = (k: string, v: string) => {
    setFilters({ ...filters, [k]: v });
    setPagination(0);
  };
  const FilterBar = () => (
    <div className="filters">
      <div className="search">
        <Search size={16} />
        <input
          aria-label="Buscar registros"
          placeholder="Buscar lote, producto…"
          value={filters.search || ""}
          onChange={(e) => f("search", e.target.value)}
        />
      </div>
      <Select
        label="Producto"
        value={filters.product || ""}
        onChange={(v) => f("product", v)}
        options={[...new Set(s.measurements.map((m) => m.product))]}
      />
      <Select
        label="Lote"
        value={filters.lot || ""}
        onChange={(v) => f("lot", v)}
        options={lots}
      />
      <Field
        label="Desde"
        type="date"
        value={filters.from || ""}
        onChange={(e) => f("from", e.target.value)}
      />
      <Field
        label="Hasta"
        type="date"
        value={filters.to || ""}
        onChange={(e) => f("to", e.target.value)}
      />
      <Select
        label="Estado"
        value={filters.status || ""}
        onChange={(v) => f("status", v)}
        options={[
          "Conforme",
          "Fuera de especificación",
          "Pendiente de revisión",
          "No evaluable",
          "Borrador",
        ]}
      />
      <button
        className="text-button"
        onClick={() => {
          setFilters({});
          setPagination(0);
        }}
      >
        Limpiar
      </button>
    </div>
  );
  function exportFile(
    kind: string,
    data: Record<string, unknown>[] = exportRows(rows),
  ) {
    if (!data.length) {
      setError("No hay datos para exportar.");
      return;
    }
    if (kind === "csv")
      download("q-monitor.csv", csv(data), "text/csv;charset=utf-8");
    else {
      const cells = [
        Object.keys(data[0]).map((value) => ({
          value,
          fontWeight: "bold" as const,
        })),
        ...data.map((r) =>
          Object.values(r).map((v) =>
            typeof v === "number"
              ? { value: v, type: Number }
              : { value: String(v ?? ""), type: String },
          ),
        ),
      ];
      import("write-excel-file/browser")
        .then(({ default: writeXlsxFile }) =>
          writeXlsxFile(cells).toFile("q-monitor.xlsx"),
        )
        .catch((e: unknown) => setError("No se pudo exportar: " + String(e)));
    }
  }
  function measurementForm() {
    const m = editing;
    return (
      <section className="panel form-panel">
        <div className="section-heading">
          <div>
            <h2>{m ? "Corregir medición" : "Nueva medición manual"}</h2>
            <p>
              Registra las lecturas del instrumento. Los campos con * son
              obligatorios.
            </p>
          </div>
          <span className="tag">CAPTURA MANUAL</span>
        </div>
        <form
          key={m?.id || "new"}
          onSubmit={(e) => {
            e.preventDefault();
            const fd = new FormData(e.currentTarget),
              get = (k: string) => String(fd.get(k) || "");
            const draft =
              (e.nativeEvent as SubmitEvent).submitter?.getAttribute(
                "value",
              ) === "draft";
            const item: Measurement = {
              id: m?.id || "QM-" + uid().slice(0, 8).toUpperCase(),
              product: get("product").trim(),
              lot: get("lot").trim(),
              date: get("date"),
              operator: get("operator").trim(),
              stage: get("stage"),
              instrument: get("instrument").trim(),
              notes: get("notes"),
              ph: number(get("ph")),
              temperature: number(get("temperature")),
              humidity: number(get("humidity")),
              moisture: get("moisture"),
              humidityUnit: units("humidity", get("moisture")),
              location: get("location"),
              phNotes: get("phNotes"),
              resolution: number(get("resolution")),
              draft,
              voided: false,
              reviewed: false,
              rules: [],
              audit: m?.audit || [],
            };
            try {
              item.rules = m
                ? m.rules
                : structuredClone(applicable(s.rules, item));
              validateMeasurement(item);
              if (m && !get("reason").trim())
                throw Error("Escribe el motivo de la corrección.");
              if (
                s.measurements.some(
                  (r) =>
                    r.id !== item.id &&
                    !r.voided &&
                    r.product === item.product &&
                    r.lot === item.lot &&
                    r.date === item.date &&
                    variables.every((v) => r[v] === item[v]),
                )
              )
                throw Error(
                  "Ya existe una medición con el mismo producto, lote, fecha y lecturas.",
                );
              item.audit = [
                ...item.audit,
                {
                  at: new Date().toISOString(),
                  actor: item.operator,
                  action: m
                    ? "Corrección · valores anteriores: " +
                      JSON.stringify({ ...m, audit: undefined })
                    : "Creación",
                  reason: get("reason") || "Registro manual",
                },
              ];
              if (
                save({
                  ...s,
                  measurements: m
                    ? s.measurements.map((r) => (r.id === m.id ? item : r))
                    : [...s.measurements, item],
                })
              ) {
                setNotice(
                  `Guardado ${item.id} · Lote ${item.lot} · pH ${fmt(item.ph)} · ${fmt(item.temperature)} °C · ${fmt(item.humidity)} ${item.humidityUnit} · ${status(item)}`,
                );
                setEditing(null);
                setPage(2);
              }
            } catch (e) {
              setError((e as Error).message);
            }
          }}
        >
          <h3 className="form-title">
            01 <span>Identificación y trazabilidad</span>
          </h3>
          <div className="form-grid">
            <Field
              label="Código de medición"
              value={m?.id || "Generado al guardar"}
              disabled
            />
            <Field
              label="Producto *"
              name="product"
              list="products"
              defaultValue={m?.product}
              required
            />
            <Field
              label="Número de lote *"
              name="lot"
              defaultValue={m?.lot}
              required
            />
            <Field
              label="Fecha y hora local *"
              name="date"
              type="datetime-local"
              defaultValue={m?.date || now()}
              required
            />
            <Field
              label="Operador *"
              name="operator"
              list="operators"
              defaultValue={m?.operator}
              required
            />
            <Field
              label="Etapa productiva *"
              name="stage"
              list="stages"
              defaultValue={m?.stage || s.stages[0]}
              required
            />
            <Field
              label="Instrumento / prototipo *"
              name="instrument"
              list="instruments"
              defaultValue={m?.instrument}
              required
            />
          </div>
          <h3 className="form-title">
            02 <span>Lecturas del instrumento</span>
          </h3>
          <div className="reading-grid">
            <div>
              <span className="reading-label">ACIDEZ / ALCALINIDAD</span>
              <h3>
                pH <small>unidades de pH</small>
              </h3>
              <Field
                label="Valor medido"
                name="ph"
                type="number"
                step="any"
                min="0"
                max="14"
                placeholder="—"
                defaultValue={m?.ph ?? ""}
              />
              <Field
                label="Resolución conocida"
                name="resolution"
                type="number"
                step="any"
                min="0.000001"
                placeholder="Opcional"
                defaultValue={m?.resolution ?? ""}
              />
              <Field
                label="Observaciones de pH"
                name="phNotes"
                defaultValue={m?.phNotes}
              />
            </div>
            <div>
              <span className="reading-label">CONDICIÓN TÉRMICA</span>
              <h3>
                Temperatura <small>°C</small>
              </h3>
              <Field
                label="Valor medido"
                name="temperature"
                type="number"
                step="any"
                min="-273.15"
                placeholder="—"
                defaultValue={m?.temperature ?? ""}
              />
              <Field
                label="Ubicación / condición"
                name="location"
                defaultValue={m?.location}
              />
            </div>
            <div>
              <span className="reading-label">HUMEDAD</span>
              <h3>
                Humedad <small>unidad según método</small>
              </h3>
              <Field
                label="Valor medido (%)"
                name="humidity"
                type="number"
                step="any"
                min="0"
                placeholder="—"
                defaultValue={m?.humidity ?? ""}
              />
              <label>
                Tipo de humedad
                <select
                  name="moisture"
                  defaultValue={m?.moisture || moistureTypes[0]}
                >
                  {moistureTypes.map((t) => (
                    <option key={t}>{t}</option>
                  ))}
                </select>
              </label>
            </div>
          </div>
          <label>
            Observaciones generales
            <textarea name="notes" defaultValue={m?.notes} />
          </label>
          {m && (
            <Field label="Motivo de la corrección *" name="reason" required />
          )}
          <div className="form-footer">
            <p>
              <ShieldCheck size={16} /> Los datos se guardan en este equipo.
            </p>
            <button
              type="button"
              onClick={() => {
                setEditing(null);
                go(2);
              }}
            >
              Cancelar
            </button>
            <button name="save" value="draft">
              Guardar borrador
            </button>
            <button className="primary" name="save" value="complete">
              <Check size={16} /> Guardar medición
            </button>
          </div>
        </form>
      </section>
    );
  }
  function table(data = sorted, paged = true) {
    return (
      <>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                {[
                  ["id", "Código"],
                  ["date", "Fecha y hora"],
                  ["product", "Producto / lote"],
                  ["ph", "pH"],
                  ["temperature", "Temp. °C"],
                  ["humidity", "Humedad"],
                  ["operator", "Operador"],
                ].map(([k, l]) => (
                  <th key={k}>
                    <button
                      onClick={() => {
                        setAscending(sort === k ? !ascending : true);
                        setSort(k);
                      }}
                    >
                      {l} ↕
                    </button>
                  </th>
                ))}
                <th>Estado</th>
                <th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {(paged
                ? data.slice(pagination * 10, pagination * 10 + 10)
                : data
              ).map((m) => (
                <tr key={m.id}>
                  <td>
                    <button className="link" onClick={() => setDetail(m)}>
                      {m.id}
                    </button>
                  </td>
                  <td>{time(m.date)}</td>
                  <td>
                    <strong>{m.product}</strong>
                    <small>{m.lot}</small>
                  </td>
                  <td>{fmt(m.ph)}</td>
                  <td>{fmt(m.temperature)}</td>
                  <td>
                    {fmt(m.humidity)}
                    <small>{m.humidityUnit}</small>
                  </td>
                  <td>{m.operator}</td>
                  <td>
                    <Badge value={status(m)} />
                  </td>
                  <td>
                    <button
                      className="text-button"
                      onClick={() => {
                        setEditing(m);
                        go(1);
                      }}
                    >
                      Editar
                    </button>
                    <button
                      className="text-button danger"
                      onClick={() => {
                        const reason = prompt(
                          "Motivo obligatorio de anulación (se conserva el historial):",
                        );
                        if (
                          !reason?.trim() ||
                          !confirm(
                            "¿Anular esta medición? Se excluirá de los análisis.",
                          )
                        )
                          return;
                        save({
                          ...s,
                          measurements: s.measurements.map((r) =>
                            r.id === m.id
                              ? {
                                  ...r,
                                  voided: true,
                                  audit: [
                                    ...r.audit,
                                    {
                                      at: new Date().toISOString(),
                                      actor: m.operator,
                                      action: "Anulación",
                                      reason,
                                    },
                                  ],
                                }
                              : r,
                          ),
                        });
                      }}
                    >
                      Anular
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {!data.length && <Empty action={() => go(1)} />}
        {paged && (
          <div className="pagination">
            <span>
              {data.length} registros · Página {pagination + 1} de{" "}
              {Math.max(1, Math.ceil(data.length / 10))}
            </span>
            <button
              disabled={!pagination}
              onClick={() => setPagination(pagination - 1)}
            >
              Anterior
            </button>
            <button
              disabled={(pagination + 1) * 10 >= data.length}
              onClick={() => setPagination(pagination + 1)}
            >
              Siguiente
            </button>
          </div>
        )}
      </>
    );
  }
  const grouped = Object.entries(
    complete.reduce<Record<string, Measurement[]>>((acc, m) => {
      const key = [m.product, m.lot, m.moisture].join(" / ");
      (acc[key] ??= []).push(m);
      return acc;
    }, {}),
  );
  const trials = s.trials.filter(
    (t) =>
      t.variable === trialVariable &&
      (!trialSession || t.session === trialSession) &&
      (!trialInstrument || t.instrument === trialInstrument) &&
      (t.variable !== "humidity" || t.moisture === moisture),
  );
  const metric = metrology(trials);
  return (
    <div className="shell">
      <aside className={menu ? "open" : ""}>
        <a className="brand" onClick={() => go(0)}>
          <span className="brand-symbol">
            <Activity size={25} />
          </span>
          <div>
            {s.name}
            <small>INDUSTRIAL QUALITY INTELLIGENCE</small>
          </div>
        </a>
        <div className="workspace-label">
          ESPACIO DE TRABAJO <span>01</span>
        </div>
        <nav>
          {pages.map((p, i) => {
            const Icon = icons[i];
            return (
              <React.Fragment key={p}>
                {i === 6 && (
                  <div className="nav-separator">INGENIERÍA Y GESTIÓN</div>
                )}
                <button
                  aria-label={p}
                  className={page === i ? "active" : ""}
                  onClick={() => go(i)}
                >
                  <Icon size={18} />
                  {p}
                  {i === 5 && out.length > 0 && <b>{out.length}</b>}
                </button>
              </React.Fragment>
            );
          })}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-status">
            <i /> Almacenamiento local
          </div>
          <p>Captura manual · Sin conexión a sensores</p>
          <div className="profile">
            <span>QA</span>
            <div>
              Espacio de calidad<small>{s.organization}</small>
            </div>
          </div>
        </div>
      </aside>
      <main>
        <header>
          <div>
            <button
              className="mobile-menu"
              aria-label="Menú"
              onClick={() => setMenu(!menu)}
            >
              <Menu />
            </button>
            <span>Espacio de trabajo</span>
            <ChevronRight size={14} />
            <strong>{pages[page]}</strong>
          </div>
          <div className="header-right">
            <span className="local-chip">
              <Database size={13} /> LOCAL
            </span>
            <span>
              {new Date().toLocaleDateString("es-MX", {
                day: "numeric",
                month: "short",
                year: "numeric",
              })}
            </span>
          </div>
        </header>
        <div className="content">
          {mode && (
            <div className="demo-banner">
              <FlaskConical size={18} />
              <strong>DATOS DE DEMOSTRACIÓN</strong> · Criterios y mediciones
              ficticios, separados de los reales.
              <button
                onClick={() => {
                  setMode(false);
                  setFilters({});
                }}
              >
                Volver a datos reales
              </button>
              <button
                onClick={() => {
                  if (
                    confirm("¿Eliminar solamente los datos de demostración?")
                  ) {
                    save(initial());
                    setMode(false);
                  }
                }}
              >
                Eliminar demo
              </button>
            </div>
          )}
          {fatal && <div className="error">{fatal}</div>}
          {error && (
            <div role="alert" className="error">
              {error}
              <button aria-label="Cerrar error" onClick={() => setError("")}>
                <X size={15} />
              </button>
            </div>
          )}
          {notice && (
            <div role="status" className="success">
              {notice}
            </div>
          )}
          <div className="page-heading">
            <div>
              <div className="eyebrow">
                CONTROL DE CALIDAD / {String(page + 1).padStart(2, "0")}
              </div>
              <h1>{pages[page]}</h1>
              <p>
                {
                  [
                    "Una visión clara de tus mediciones. Decisiones respaldadas por datos.",
                    "Captura precisa, trazabilidad en cada lectura.",
                    "Cada lote, cada lectura, en un solo lugar.",
                    "Transforma tus mediciones en evidencia.",
                    "Compara el prototipo con un método de referencia.",
                    "Identifica, investiga y documenta las desviaciones.",
                    "Explora el impacto bajo supuestos explícitos.",
                    "Evalúa costos y proyecciones con datos documentados.",
                    "Comparte evidencia con contexto y trazabilidad.",
                    "Define los criterios de tu espacio de calidad.",
                  ][page]
                }
              </p>
            </div>
            <div className="heading-actions">
              {page === 0 && (
                <button
                  onClick={() => {
                    if (!sample.measurements.length) {
                      const d = demo();
                      localStorage.setItem("qmonitor-demo", JSON.stringify(d));
                      setSample(d);
                    }
                    setMode(!mode);
                    setFilters({});
                  }}
                >
                  <FlaskConical size={15} />
                  {mode ? "Datos reales" : "Explorar demo"}
                </button>
              )}
              {page !== 1 && (
                <button
                  className="primary"
                  onClick={() => {
                    setEditing(null);
                    go(1);
                  }}
                >
                  <Plus size={17} /> Nueva medición
                </button>
              )}
            </div>
          </div>
          {[0, 2, 3, 5, 8].includes(page) && FilterBar()}
          {page === 0 && (
            <>
              <div className="section-inline">
                <span className="section-kicker">RESUMEN DEL PROCESO</span>
                <span className="muted">
                  <Clock size={13} />{" "}
                  {latest
                    ? "Último registro: " + time(latest.date)
                    : "Sin registros todavía"}
                </span>
              </div>
              <div className="kpi-grid">
                {variables.map((v, i) => (
                  <div className="kpi" key={v}>
                    <div className="kpi-top">
                      <span>
                        {
                          ["Último pH", "Última temperatura", "Última humedad"][
                            i
                          ]
                        }
                      </span>
                      <span className={"metric-icon m" + i}>
                        {["pH", "°C", "%"][i]}
                      </span>
                    </div>
                    <div className="kpi-value">
                      {fmt(latest?.[v])}
                      <small>{units(v, latest?.moisture)}</small>
                    </div>
                    <div className="kpi-foot">
                      {latest ? time(latest.date) : "Esperando primera lectura"}
                      <ArrowUpRight size={14} />
                    </div>
                  </div>
                ))}
                <div className="kpi navy">
                  <div className="kpi-top">
                    Mediciones registradas
                    <Layers size={19} />
                  </div>
                  <div className="kpi-value">
                    {rows.length}
                    <small>registros</small>
                  </div>
                  <div className="kpi-foot">
                    {new Set(rows.map((m) => m.lot)).size} lotes en el periodo
                    <ArrowRight size={14} />
                  </div>
                </div>
              </div>
              <div className="mini-grid">
                {[
                  [
                    "Pendientes de revisión",
                    rows.filter((m) => status(m) === "Pendiente de revisión")
                      .length,
                  ],
                  ["Fuera de especificación", out.length],
                  [
                    "Registros completos",
                    rows.length
                      ? fmt((complete.length / rows.length) * 100) + " %"
                      : "—",
                  ],
                  ["Lotes registrados", new Set(rows.map((m) => m.lot)).size],
                ].map(([l, v]) => (
                  <div key={l}>
                    <span>{l}</span>
                    <strong>{v}</strong>
                    <small>
                      {latest ? time(latest.date) : "Sin actualización"}
                    </small>
                  </div>
                ))}
              </div>
              <div className="dashboard-grid">
                <section className="panel">
                  <div className="section-heading">
                    <div>
                      <h2>Tendencia de mediciones</h2>
                      <p>Lecturas cronológicas · registros completos</p>
                    </div>
                    <div className="segmented">
                      {variables.map((v) => (
                        <button
                          className={v === variable ? "selected" : ""}
                          key={v}
                          onClick={() => setVariable(v)}
                        >
                          {labels[v]}
                        </button>
                      ))}
                    </div>
                  </div>
                  {variable === "humidity" && (
                    <Select
                      label="Tipo de humedad"
                      value={moisture}
                      onChange={setMoisture}
                      options={moistureTypes}
                    />
                  )}
                  <Trend rows={rows} v={variable} moisture={moisture} />
                  <div className="chart-note">
                    <i /> {labels[variable]} · {units(variable, moisture)}{" "}
                    <span>
                      Productos y lotes seleccionados; las series se detallan en
                      Análisis.
                    </span>
                  </div>
                </section>
                <section className="panel">
                  <div className="section-heading">
                    <div>
                      <h2>Estado de los registros</h2>
                      <p>Evaluación y revisión</p>
                    </div>
                    <ShieldCheck size={19} />
                  </div>
                  {rows.length ? (
                    <>
                      <div className="status-total">
                        <strong>{rows.length}</strong>
                        <span>mediciones en total</span>
                      </div>
                      {[
                        "Conforme",
                        "Fuera de especificación",
                        "Pendiente de revisión",
                        "No evaluable",
                        "Borrador",
                      ].map((st) => (
                        <div className="status-row" key={st}>
                          <div>
                            <Badge value={st} />
                            <strong>
                              {rows.filter((m) => status(m) === st).length}
                            </strong>
                          </div>
                          <div className="progress">
                            <i
                              style={{
                                width:
                                  (rows.filter((m) => status(m) === st).length /
                                    rows.length) *
                                    100 +
                                  "%",
                                background:
                                  st === "Conforme"
                                    ? "#3aa888"
                                    : st === "Fuera de especificación"
                                      ? "#d35e5e"
                                      : "#e4ae55",
                              }}
                            />
                          </div>
                        </div>
                      ))}
                    </>
                  ) : (
                    <Empty
                      text="Sin resultados para evaluar"
                      detail="Configura criterios y registra lecturas."
                    />
                  )}
                </section>
              </div>
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>Mediciones recientes</h2>
                    <p>La trazabilidad empieza con cada registro.</p>
                  </div>
                  <button className="text-button" onClick={() => go(2)}>
                    Ver historial <ArrowRight size={15} />
                  </button>
                </div>
                {table(sorted.slice(0, 5), false)}
              </section>
              <div className="info-strip">
                <ShieldCheck size={20} />
                <div>
                  <strong>Tu criterio de calidad, documentado.</strong>
                  <p>
                    {s.rules.length
                      ? "Los registros conservan una copia de los criterios aplicados al capturarlos."
                      : "Sin criterio de aceptación configurado. Define límites documentados para evaluar tus mediciones."}
                  </p>
                </div>
                <button onClick={() => go(9)}>
                  Configurar criterios <ChevronRight size={16} />
                </button>
              </div>
            </>
          )}
          {page === 1 && measurementForm()}
          {page === 2 && (
            <>
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>Historial de mediciones</h2>
                    <p>Selecciona un código para consultar su trazabilidad.</p>
                  </div>
                  <button onClick={() => exportFile("csv")}>
                    <Download size={15} /> Exportar CSV
                  </button>
                </div>
                {table()}
              </section>
              <section className="panel">
                <h2>Comparación de lotes</h2>
                <p>
                  Selecciona dos o más lotes. Se conservan productos, variables
                  y unidades separados.
                </p>
                <div className="chips">
                  {lots.map((l) => (
                    <label key={l}>
                      <input
                        type="checkbox"
                        checked={selectedLots.includes(l)}
                        onChange={(e) =>
                          setSelectedLots(
                            e.target.checked
                              ? [...selectedLots, l]
                              : selectedLots.filter((x) => x !== l),
                          )
                        }
                      />
                      {l}
                    </label>
                  ))}
                </div>
                {selectedLots.length < 2 ? (
                  <p className="muted">Selecciona al menos dos lotes.</p>
                ) : (
                  grouped
                    .filter(([, ms]) => selectedLots.includes(ms[0].lot))
                    .map(([g, ms]) => (
                      <div className="group-block" key={g}>
                        <h3>{g}</h3>
                        <p>
                          {ms.length} mediciones completas ·{" "}
                          {ms.filter((m) => failures(m).length).length}{" "}
                          desviaciones
                        </p>
                        <div className="reading-grid">
                          {variables.map((v) => (
                            <div key={v}>
                              <h3>
                                {labels[v]} · media{" "}
                                {fmt(stats(ms.map((m) => m[v]!)).mean)}{" "}
                                {units(v, ms[0].moisture)}
                              </h3>
                              <Trend
                                rows={ms}
                                v={v}
                                moisture={ms[0].moisture}
                              />
                            </div>
                          ))}
                        </div>
                      </div>
                    ))
                )}
              </section>
            </>
          )}
          {page === 3 && (
            <>
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>Estadística descriptiva por producto y lote</h2>
                    <p>
                      Se excluyen borradores, anulados y registros incompletos.
                      No se mezclan tipos de humedad.
                    </p>
                  </div>
                  <Select
                    label="Variable"
                    value={variable}
                    onChange={(v) => setVariable(v as Variable)}
                    options={[...variables]}
                    empty="Selecciona"
                  />
                </div>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        {[
                          "Producto / lote / tipo",
                          "n",
                          "Faltantes¹",
                          "Media",
                          "Mediana",
                          "Mín.",
                          "Máx.",
                          "Rango",
                          "s muestral",
                          "CV²",
                          "Fuera / %",
                        ].map((x) => (
                          <th key={x}>{x}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {grouped.map(([g, ms]) => {
                        const st = stats(ms.map((m) => m[variable]!)),
                          evaluated = ms.filter((m) =>
                            m.rules.some((r) => r.variable === variable),
                          ),
                          bad = evaluated.filter((m) =>
                            failures(m).some((r) => r.variable === variable),
                          ).length;
                        return (
                          <tr key={g}>
                            <td>
                              {g}
                              <small>{units(variable, ms[0].moisture)}</small>
                            </td>
                            <td>{st.n}</td>
                            <td>
                              {
                                rows.filter(
                                  (m) =>
                                    !m.draft &&
                                    [m.product, m.lot, m.moisture].join(
                                      " / ",
                                    ) === g &&
                                    m[variable] === null,
                                ).length
                              }
                            </td>
                            {[
                              st.mean,
                              st.median,
                              st.min,
                              st.max,
                              st.range,
                              st.sd,
                            ].map((v, i) => (
                              <td key={i}>{fmt(v)}</td>
                            ))}
                            <td>
                              {variable === "humidity" &&
                              st.mean &&
                              st.sd !== null
                                ? fmt((st.sd / st.mean) * 100) + " %"
                                : "No aplica"}
                            </td>
                            <td>
                              {bad} /{" "}
                              {evaluated.length
                                ? fmt((bad / evaluated.length) * 100) + " %"
                                : "Sin criterio"}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {!grouped.length && <Empty />}
                <p className="footnote">
                  ¹ Lecturas faltantes en registros no borrador del grupo. ² El
                  CV se ofrece para humedad porcentual con media positiva; no se
                  aplica al pH logarítmico ni a °C. s requiere n ≥ 2.
                </p>
              </section>
              <section className="panel">
                <div className="section-heading">
                  <h2>Exploración gráfica</h2>
                  <Select
                    label="Visualización"
                    value={chart}
                    onChange={setChart}
                    options={[
                      "Histograma",
                      "Dispersión",
                      "Diagrama de caja",
                      "Tendencia",
                      "Control I-MR",
                    ]}
                  />
                </div>
                {chart === "Dispersión" && (
                  <Select
                    label="Eje X"
                    value={axis}
                    onChange={(v) => setAxis(v as Variable)}
                    options={[...variables]}
                  />
                )}
                {grouped.map(([g, ms]) => {
                  const vals = ms
                      .map((m) => m[variable]!)
                      .sort((a, b) => a - b),
                    st = stats(vals),
                    min = st.min!,
                    max = st.max!,
                    bins = Array.from(
                      {
                        length: Math.max(1, Math.ceil(Math.sqrt(vals.length))),
                      },
                      (_, i) => {
                        const width =
                            (max - min || 1) /
                            Math.max(1, Math.ceil(Math.sqrt(vals.length))),
                          lo = min + i * width,
                          hi = lo + width;
                        return {
                          intervalo: `${fmt(lo)}–${fmt(hi)}`,
                          frecuencia: vals.filter(
                            (v) =>
                              v >= lo &&
                              (i === Math.ceil(Math.sqrt(vals.length)) - 1
                                ? v <= hi
                                : v < hi),
                          ).length,
                        };
                      },
                    );
                  const quart = (p: number) => {
                    const ix = (vals.length - 1) * p,
                      i = Math.floor(ix);
                    return (
                      vals[i] +
                      (vals[Math.min(i + 1, vals.length - 1)] - vals[i]) *
                        (ix - i)
                    );
                  };
                  return (
                    <div className="group-block" key={g}>
                      <h3>
                        {g}{" "}
                        <small>
                          {labels[variable]} · {units(variable, ms[0].moisture)}{" "}
                          · n={ms.length}
                        </small>
                      </h3>
                      {chart === "Tendencia" ? (
                        <Trend
                          rows={ms}
                          v={variable}
                          moisture={ms[0].moisture}
                        />
                      ) : chart === "Control I-MR" ? (
                        <ControlChart rows={ms} variable={variable} />
                      ) : chart === "Diagrama de caja" ? (
                        <>
                          <svg
                            className="boxplot"
                            viewBox="0 0 600 90"
                            role="img"
                            aria-label={`Caja: mínimo ${min}, Q1 ${quart(0.25)}, mediana ${quart(0.5)}, Q3 ${quart(0.75)}, máximo ${max}`}
                          >
                            <line
                              x1="40"
                              y1="35"
                              x2="560"
                              y2="35"
                              stroke="#7a91a4"
                            />
                            <rect
                              x={
                                40 +
                                ((quart(0.25) - min) / (max - min || 1)) * 520
                              }
                              y="15"
                              width={Math.max(
                                2,
                                ((quart(0.75) - quart(0.25)) /
                                  (max - min || 1)) *
                                  520,
                              )}
                              height="40"
                              fill="#dceefa"
                              stroke="#137dce"
                            />
                            <line
                              x1={
                                40 +
                                ((quart(0.5) - min) / (max - min || 1)) * 520
                              }
                              x2={
                                40 +
                                ((quart(0.5) - min) / (max - min || 1)) * 520
                              }
                              y1="15"
                              y2="55"
                              stroke="#112c42"
                              strokeWidth="3"
                            />
                            <text x="40" y="80">
                              {fmt(min)}
                            </text>
                            <text x="500" y="80">
                              {fmt(max)}
                            </text>
                          </svg>
                          <p>
                            Bigotes mín.–máx. · Q1 {fmt(quart(0.25))} · Mediana{" "}
                            {fmt(quart(0.5))} · Q3 {fmt(quart(0.75))}. Cuantiles
                            por interpolación lineal.
                          </p>
                        </>
                      ) : (
                        <ResponsiveContainer width="100%" height={240}>
                          {chart === "Dispersión" ? (
                            <ScatterChart>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis
                                type="number"
                                dataKey={axis}
                                name={labels[axis]}
                                unit={" " + units(axis, ms[0].moisture)}
                              />
                              <YAxis
                                type="number"
                                dataKey={variable}
                                name={labels[variable]}
                                unit={" " + units(variable, ms[0].moisture)}
                              />
                              <Tooltip cursor={{ strokeDasharray: "3 3" }} />
                              <Scatter data={ms} fill="#137dce" />
                            </ScatterChart>
                          ) : (
                            <BarChart data={bins}>
                              <CartesianGrid
                                vertical={false}
                                strokeDasharray="3 3"
                              />
                              <XAxis
                                dataKey="intervalo"
                                tick={{ fontSize: 11 }}
                              />
                              <YAxis allowDecimals={false} />
                              <Tooltip />
                              <Bar
                                dataKey="frecuencia"
                                fill="#137dce"
                                radius={[4, 4, 0, 0]}
                              />
                            </BarChart>
                          )}
                        </ResponsiveContainer>
                      )}
                      <p className="footnote">
                        {
                          ms.filter((m) =>
                            failures(m).some((r) => r.variable === variable),
                          ).length
                        }{" "}
                        registros fuera de límites documentados.{" "}
                        {ms.length < 5
                          ? "Pocas observaciones: evita conclusiones generales."
                          : "Las asociaciones observadas no demuestran causalidad."}
                      </p>
                    </div>
                  );
                })}
                {!grouped.length && <Empty />}
              </section>
            </>
          )}
          {page === 4 && (
            <>
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>Nueva comparación de referencia</h2>
                    <p>
                      Define el criterio antes de registrar la prueba. Captura
                      manual.
                    </p>
                  </div>
                  <ShieldCheck size={22} />
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget),
                      g = (k: string) => String(fd.get(k) || "");
                    const t: Trial = {
                      id: "VAL-" + uid().slice(0, 8),
                      variable: g("variable") as Variable,
                      moisture: g("moisture"),
                      unit: units(g("variable") as Variable, g("moisture")),
                      sample: g("sample"),
                      date: g("date"),
                      prototype: Number(g("prototype")),
                      reference: Number(g("reference")),
                      instrument: g("instrument"),
                      method: g("method"),
                      conditions: g("conditions"),
                      repetition: Number(g("repetition")),
                      session: g("session"),
                      tolerance: Number(g("tolerance")),
                      notes: g("notes"),
                    };
                    if (
                      !Number.isFinite(t.prototype) ||
                      !Number.isFinite(t.reference) ||
                      !Number.isFinite(t.tolerance) ||
                      t.tolerance < 0
                    ) {
                      setError("Introduce valores numéricos válidos.");
                      return;
                    }
                    if (
                      s.trials.some(
                        (x) =>
                          x.session === t.session &&
                          x.sample === t.sample &&
                          x.variable === t.variable &&
                          x.instrument === t.instrument &&
                          x.repetition === t.repetition,
                      )
                    ) {
                      setError(
                        "Ya existe esa repetición para la muestra, variable, instrumento y sesión.",
                      );
                      return;
                    }
                    if (save({ ...s, trials: [...s.trials, t] })) {
                      setNotice(
                        "Comparación guardada. Diferencia: " +
                          fmt(t.prototype - t.reference) +
                          " " +
                          t.unit,
                      );
                      e.currentTarget.reset();
                    }
                  }}
                >
                  <div className="form-grid">
                    <label>
                      Variable
                      <select name="variable">
                        {variables.map((v) => (
                          <option value={v} key={v}>
                            {labels[v]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Tipo de humedad
                      <select name="moisture">
                        {moistureTypes.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </label>
                    <Field label="Muestra / lote *" name="sample" required />
                    <Field
                      label="Sesión experimental *"
                      name="session"
                      required
                    />
                    <Field
                      label="Fecha y hora *"
                      name="date"
                      type="datetime-local"
                      defaultValue={now()}
                      required
                    />
                    <Field
                      label="Lectura prototipo *"
                      name="prototype"
                      type="number"
                      step="any"
                      required
                    />
                    <Field
                      label="Lectura referencia *"
                      name="reference"
                      type="number"
                      step="any"
                      required
                    />
                    <Field
                      label="Instrumento de referencia *"
                      name="instrument"
                      list="instruments"
                      required
                    />
                    <Field
                      label="Método de referencia *"
                      name="method"
                      list="methods"
                      required
                    />
                    <Field label="Condiciones *" name="conditions" required />
                    <Field
                      label="Número de repetición *"
                      name="repetition"
                      type="number"
                      min="1"
                      step="1"
                      required
                    />
                    <Field
                      label="Máxima diferencia absoluta aceptada *"
                      name="tolerance"
                      type="number"
                      min="0"
                      step="any"
                      required
                    />
                    <Field
                      label="Fuente del criterio / observaciones *"
                      name="notes"
                      required
                    />
                  </div>
                  <button className="primary">Guardar comparación</button>
                </form>
              </section>
              <section className="panel">
                <div className="section-heading">
                  <h2>Resultados metrológicos</h2>
                  <Select
                    label="Variable"
                    value={trialVariable}
                    onChange={(v) => setTrialVariable(v as Variable)}
                    options={[...variables]}
                  />
                </div>
                <div className="filters">
                  <Select
                    label="Sesión"
                    value={trialSession}
                    onChange={setTrialSession}
                    options={[...new Set(s.trials.map((t) => t.session))]}
                  />
                  <Select
                    label="Referencia"
                    value={trialInstrument}
                    onChange={setTrialInstrument}
                    options={[...new Set(s.trials.map((t) => t.instrument))]}
                  />
                  {trialVariable === "humidity" && (
                    <Select
                      label="Tipo de humedad"
                      value={moisture}
                      onChange={setMoisture}
                      options={moistureTypes}
                    />
                  )}
                </div>
                <p className="footnote">
                  Resumen de {trials.length} pares en la selección actual.
                  Filtra una sesión e instrumento para interpretar resultados
                  comparables.
                </p>
                <div className="mini-grid">
                  {[
                    ["Sesgo medio", metric.mean],
                    ["s de las diferencias", metric.sd],
                    ["Error absoluto medio", metric.mae],
                    ["RMSE", metric.rmse],
                  ].map(([k, v]) => (
                    <div key={k}>
                      <span>{k}</span>
                      <strong>{fmt(v as number | null)}</strong>
                      <small>{units(trialVariable, moisture)}</small>
                    </div>
                  ))}
                </div>
                {trials.length ? (
                  <>
                    <div className="reading-grid">
                      <div>
                        <h3>Prototipo frente a referencia</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <ScatterChart>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              type="number"
                              dataKey="reference"
                              name="Referencia"
                              domain={["auto", "auto"]}
                            />
                            <YAxis
                              type="number"
                              dataKey="prototype"
                              name="Prototipo"
                              domain={["auto", "auto"]}
                            />
                            <Tooltip />
                            <Scatter data={trials} fill="#137dce" />
                            <ReferenceLine
                              segment={[
                                {
                                  x: Math.min(
                                    ...trials.map((t) =>
                                      Math.min(t.prototype, t.reference),
                                    ),
                                  ),
                                  y: Math.min(
                                    ...trials.map((t) =>
                                      Math.min(t.prototype, t.reference),
                                    ),
                                  ),
                                },
                                {
                                  x: Math.max(
                                    ...trials.map((t) =>
                                      Math.max(t.prototype, t.reference),
                                    ),
                                  ),
                                  y: Math.max(
                                    ...trials.map((t) =>
                                      Math.max(t.prototype, t.reference),
                                    ),
                                  ),
                                },
                              ]}
                              stroke="#999"
                              label="y = x"
                            />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                      <div>
                        <h3>Diferencia frente a referencia</h3>
                        <ResponsiveContainer width="100%" height={250}>
                          <ScatterChart>
                            <CartesianGrid strokeDasharray="3 3" />
                            <XAxis
                              type="number"
                              dataKey="reference"
                              name="Referencia"
                            />
                            <YAxis
                              type="number"
                              dataKey="difference"
                              name="Diferencia"
                            />
                            <Tooltip />
                            <ReferenceLine y={0} stroke="#999" />
                            <Scatter
                              data={trials.map((t) => ({
                                ...t,
                                difference: t.prototype - t.reference,
                              }))}
                              fill="#40a99b"
                            />
                          </ScatterChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            {[
                              "Código / muestra",
                              "Sesión / referencia",
                              "Prototipo",
                              "Referencia",
                              "Diferencia",
                              "Absoluto",
                              "Relativo¹",
                              "Criterio",
                              "Resultado",
                            ].map((h) => (
                              <th key={h}>{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {trials.map((t) => {
                            const d = t.prototype - t.reference;
                            return (
                              <tr key={t.id}>
                                <td>
                                  {t.id}
                                  <small>
                                    {t.sample} · rep. {t.repetition}
                                  </small>
                                </td>
                                <td>
                                  {t.session}
                                  <small>
                                    {t.instrument} · {t.conditions}
                                  </small>
                                </td>
                                <td>{t.prototype}</td>
                                <td>{t.reference}</td>
                                <td>{fmt(d)}</td>
                                <td>{fmt(Math.abs(d))}</td>
                                <td>
                                  {trialVariable === "ph" ||
                                  Math.abs(t.reference) < 1e-8
                                    ? "No apropiado"
                                    : fmt(
                                        (Math.abs(d) / Math.abs(t.reference)) *
                                          100,
                                      ) + " %"}
                                </td>
                                <td>
                                  ±{t.tolerance}
                                  <small>{t.notes}</small>
                                </td>
                                <td>
                                  <Badge
                                    value={
                                      Math.abs(d) <= t.tolerance
                                        ? "Conforme"
                                        : "Fuera de especificación"
                                    }
                                  />
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </>
                ) : (
                  <Empty text="Sin pares de comparación" />
                )}
                {trials.length > 0 && <Repeatability trials={trials} />}
                <p className="footnote">
                  ¹ El error relativo se omite para pH y referencias cercanas a
                  cero. La desviación de diferencias no equivale a repetibilidad
                  ni incertidumbre. La repetibilidad exige misma muestra,
                  método, instrumento y condiciones; la incertidumbre y
                  certificación requieren evaluación específica.
                </p>
              </section>
            </>
          )}
          {page === 5 && (
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Desviaciones detectadas</h2>
                  <p>
                    Las alertas apoyan la revisión; no liberan ni rechazan
                    automáticamente productos.
                  </p>
                </div>
                <span className="tag">{out.length} REGISTROS</span>
              </div>
              {out.map((m) => (
                <article className="deviation" key={m.id}>
                  <div className="section-heading">
                    <div>
                      <h3>
                        {m.product} · {m.lot}
                      </h3>
                      <p>
                        {m.id} · {time(m.date)} · Prioridad: revisión requerida
                      </p>
                    </div>
                    <Badge value="Fuera de especificación" />
                  </div>
                  {failures(m).map((r) => (
                    <p key={r.id}>
                      <strong>
                        {labels[r.variable]}: {fmt(m[r.variable])}{" "}
                        {units(r.variable, m.moisture)}
                      </strong>{" "}
                      · Límite {r.lower ?? "—"} a {r.upper ?? "—"} · {r.source}
                    </p>
                  ))}
                  <form
                    onSubmit={(e) => {
                      e.preventDefault();
                      const fd = new FormData(e.currentTarget),
                        decision = String(fd.get("decision")),
                        actor = String(fd.get("actor")),
                        state = String(fd.get("state"));
                      save({
                        ...s,
                        measurements: s.measurements.map((r) =>
                          r.id === m.id
                            ? {
                                ...r,
                                deviations: state + " · " + decision,
                                audit: [
                                  ...r.audit,
                                  {
                                    at: new Date().toISOString(),
                                    actor,
                                    action: "Gestión de desviación: " + state,
                                    reason: decision,
                                  },
                                ],
                              }
                            : r,
                        ),
                      });
                      setNotice(
                        "Investigación y disposición guardadas. El resultado medido se conserva.",
                      );
                    }}
                  >
                    <div className="form-grid">
                      <Field label="Responsable *" name="actor" required />
                      <label>
                        Estado de atención
                        <select name="state">
                          <option>Abierta</option>
                          <option>En investigación</option>
                          <option>Acción correctiva</option>
                          <option>Cerrada</option>
                        </select>
                      </label>
                    </div>
                    <label>
                      Investigación, disposición y acción correctiva *
                      <textarea
                        name="decision"
                        required
                        defaultValue={m.deviations}
                      />
                    </label>
                    <button>Guardar seguimiento</button>
                  </form>
                </article>
              ))}
              {!out.length && (
                <Empty
                  text="Sin desviaciones en la selección"
                  detail="Sin límites documentados, una medición no se considera conforme automáticamente."
                />
              )}
            </section>
          )}
          {page === 6 && (
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Proceso actual vs. proceso propuesto</h2>
                  <p>
                    Minutos por inspección · periodo definido por el usuario ·
                    costos en MXN
                  </p>
                </div>
                <Workflow size={22} />
              </div>
              <div className="form-grid">
                {Object.entries({
                  lots: "Lotes por periodo",
                  inspections: "Inspecciones por lote",
                  sample: "Toma de muestra (min)",
                  measure: "Medición (min)",
                  record: "Registro manual actual (min)",
                  transcribe: "Transcripción actual (min)",
                  review: "Revisión (min)",
                  app: "Registro con aplicación (min)",
                  hourly: "Costo de personal (MXN/h)",
                }).map(([k, l]) => (
                  <Field
                    key={k}
                    label={l}
                    type="number"
                    min="0"
                    step="any"
                    value={s.simulation[k] ?? ""}
                    onChange={(e) => {
                      if (Number(e.target.value) < 0) return;
                      save({
                        ...s,
                        simulation: { ...s.simulation, [k]: e.target.value },
                      });
                    }}
                  />
                ))}
                <Field
                  label="Periodo (ej. mes de octubre)"
                  value={s.simulation.period || ""}
                  onChange={(e) =>
                    save({
                      ...s,
                      simulation: { ...s.simulation, period: e.target.value },
                    })
                  }
                />
                <label>
                  Origen de los tiempos
                  <select
                    value={s.simulation.origin || "Estimaciones"}
                    onChange={(e) =>
                      save({
                        ...s,
                        simulation: { ...s.simulation, origin: e.target.value },
                      })
                    }
                  >
                    <option>Estimaciones</option>
                    <option>Observación experimental documentada</option>
                  </select>
                </label>
                <Field
                  label="Fuente / evidencia"
                  value={s.simulation.source || ""}
                  onChange={(e) =>
                    save({
                      ...s,
                      simulation: { ...s.simulation, source: e.target.value },
                    })
                  }
                />
              </div>
              {simulation(s.simulation) ? (
                (() => {
                  const v = simulation(s.simulation)!;
                  return (
                    <>
                      <div className="mini-grid">
                        {[
                          ["Actual por lote (min)", v.oldLot],
                          ["Propuesto por lote (min)", v.nextLot],
                          ["Diferencia por periodo (h)", v.saved],
                          ["Reducción estimada (%)", v.reduction],
                          ["Costo actual / periodo MXN", v.costOld],
                          ["Costo propuesto / periodo MXN", v.costNext],
                          ["Diferencia costos MXN", v.costOld - v.costNext],
                          ["Capacidad teórica (inspecciones/h)", v.capacity],
                        ].map(([k, n]) => (
                          <div key={k}>
                            <span>{k}</span>
                            <strong>{fmt(n as number | null)}</strong>
                          </div>
                        ))}
                      </div>
                      <ResponsiveContainer width="100%" height={230}>
                        <BarChart
                          data={[
                            { escenario: "Actual", horas: v.oldPeriod },
                            { escenario: "Propuesto", horas: v.nextPeriod },
                          ]}
                        >
                          <CartesianGrid vertical={false} />
                          <XAxis dataKey="escenario" />
                          <YAxis />
                          <Tooltip />
                          <Bar dataKey="horas" fill="#137dce" />
                        </BarChart>
                      </ResponsiveContainer>
                    </>
                  );
                })()
              ) : (
                <Empty
                  text="Completa los supuestos para comparar"
                  detail="Los campos vacíos no se sustituyen por cero."
                />
              )}
              <p className="footnote">
                Modelo secuencial sin paralelismo ni tiempos muertos. Los
                resultados son proyecciones bajo los supuestos ingresados; no
                demuestran mejoras experimentales.
              </p>
            </section>
          )}
          {page === 7 && (
            <section className="panel">
              <div className="section-heading">
                <div>
                  <h2>Modelo económico</h2>
                  <p>MXN · costos recurrentes mensuales · precios constantes</p>
                </div>
                <Wallet size={22} />
              </div>
              {[
                ["Inversión inicial", investmentKeys],
                ["Costos recurrentes mensuales", recurringKeys],
                [
                  "Supuestos de evaluación",
                  [
                    "Lotes mensuales",
                    "Mediciones mensuales",
                    "Beneficio bruto mensual",
                    "Contribución por lote",
                    "Tasa anual (%)",
                    "Horizonte (años)",
                  ],
                ],
              ].map(([title, keys]) => (
                <div key={title as string}>
                  <h3 className="form-title">{title as string}</h3>
                  <div className="form-grid">
                    {(keys as string[]).map((k) => (
                      <Field
                        key={k}
                        label={k}
                        type="number"
                        min="0"
                        max={k === "Horizonte (años)" ? 50 : undefined}
                        step={k === "Horizonte (años)" ? "1" : "any"}
                        value={s.economy[k] ?? ""}
                        onChange={(e) => {
                          if (
                            Number(e.target.value) < 0 ||
                            (k === "Horizonte (años)" &&
                              (Number(e.target.value) > 50 ||
                                !Number.isInteger(Number(e.target.value))))
                          )
                            return;
                          save({
                            ...s,
                            economy: { ...s.economy, [k]: e.target.value },
                          });
                        }}
                      />
                    ))}
                  </div>
                </div>
              ))}
              <Field
                label="Fuente y justificación de supuestos"
                value={s.economy.source || ""}
                onChange={(e) =>
                  save({
                    ...s,
                    economy: { ...s.economy, source: e.target.value },
                  })
                }
              />
              {economics(s.economy) ? (
                (() => {
                  const v = economics(s.economy)!;
                  return (
                    <>
                      <div className="mini-grid">
                        {[
                          ["Inversión inicial MXN", v.investment],
                          ["Operación mensual MXN", v.monthly],
                          ["Operación anual MXN", v.annual],
                          ["Costo por lote MXN", v.perLot],
                          ["Costo por medición MXN", v.perMeasurement],
                          ["Ahorro neto mensual MXN", v.net],
                          ["Recuperación (meses)", v.payback],
                          ["Equilibrio (lotes/mes)", v.breakeven],
                          ["VPN MXN", v.npv],
                        ].map(([k, n]) => (
                          <div key={k}>
                            <span>{k}</span>
                            <strong>{fmt(n as number | null)}</strong>
                          </div>
                        ))}
                      </div>
                      <h3>Escenarios de proyección</h3>
                      <div className="table-wrap">
                        <table>
                          <thead>
                            <tr>
                              <th>Escenario</th>
                              <th>Factor de beneficio bruto</th>
                              <th>Flujo mensual neto MXN</th>
                            </tr>
                          </thead>
                          <tbody>
                            {["Conservador", "Base", "Optimista"].map(
                              (name, i) => {
                                const key = "factor" + i,
                                  factor = number(s.economy[key] ?? "");
                                return (
                                  <tr key={name}>
                                    <td>{name}</td>
                                    <td>
                                      <input
                                        aria-label={"Factor " + name}
                                        type="number"
                                        min="0"
                                        step="any"
                                        value={s.economy[key] ?? ""}
                                        onChange={(e) =>
                                          save({
                                            ...s,
                                            economy: {
                                              ...s.economy,
                                              [key]: e.target.value,
                                            },
                                          })
                                        }
                                      />
                                    </td>
                                    <td>
                                      {factor !== null
                                        ? fmt(
                                            Number(
                                              s.economy[
                                                "Beneficio bruto mensual"
                                              ],
                                            ) *
                                              factor -
                                              v.monthly,
                                          )
                                        : "Factor pendiente"}
                                    </td>
                                  </tr>
                                );
                              },
                            )}
                          </tbody>
                        </table>
                      </div>
                      <h3>Flujo de efectivo anual · escenario base</h3>
                      <p>
                        Año 0: {fmt(-v.investment)} MXN. Años 1–
                        {s.economy["Horizonte (años)"]}: {fmt(v.net * 12)} MXN
                        por año.
                      </p>
                    </>
                  );
                })()
              ) : (
                <Empty
                  text="Evaluación pendiente de datos"
                  detail="Completa los costos y supuestos; introduce cero únicamente si corresponde."
                />
              )}
              <p className="footnote">
                VPN = −inversión + Σ flujo anual / (1+tasa)^año. Recuperación
                simple sin descuento; no se alcanza con flujo neto ≤ 0.
                Equilibrio operativo = costo mensual / contribución por lote.
                Sin impuestos, inflación, valor residual ni financiación.
              </p>
            </section>
          )}
          {page === 8 && (
            <>
              <section className="panel no-print">
                <div className="section-heading">
                  <div>
                    <h2>Centro de reportes</h2>
                    <p>
                      Exporta los datos filtrados o imprime el informe como PDF
                      desde la aplicación.
                    </p>
                  </div>
                  <FileDown size={23} />
                </div>
                <div className="filters">
                  <Select
                    label="Tipo de reporte"
                    value={report}
                    onChange={setReport}
                    options={[
                      "Mediciones por lote",
                      "Historial de registros",
                      "Resumen estadístico",
                      "Validación metrológica",
                      "Desviaciones",
                      "Comparación de lotes",
                      "Simulación de tiempos",
                      "Evaluación económica",
                    ]}
                  />
                  <button
                    onClick={() =>
                      exportFile(
                        "csv",
                        report === "Validación metrológica"
                          ? trials.map((t) => ({
                              ...t,
                              diferencia: t.prototype - t.reference,
                              absoluto: Math.abs(t.prototype - t.reference),
                            }))
                          : exportRows(report === "Desviaciones" ? out : rows),
                      )
                    }
                  >
                    <Download size={16} /> CSV
                  </button>
                  <button
                    onClick={() =>
                      exportFile(
                        "xlsx",
                        report === "Validación metrológica"
                          ? trials.map((t) => ({
                              ...t,
                              diferencia: t.prototype - t.reference,
                            }))
                          : exportRows(report === "Desviaciones" ? out : rows),
                      )
                    }
                  >
                    <Download size={16} /> Excel
                  </button>
                  <button className="primary" onClick={() => window.print()}>
                    Imprimir / PDF
                  </button>
                </div>
                <p className="footnote">
                  CSV y Excel contienen las lecturas seleccionadas (o pares
                  metrológicos en ese informe). PDF incluye el informe visible.
                  Para metrología usa los filtros de su módulo antes de generar
                  el informe.
                </p>
              </section>
              <section className="panel report">
                <div className="report-heading">
                  <Activity size={30} />
                  <div>
                    <h2>{s.name}</h2>
                    <p>{s.organization} · Industrial Quality Intelligence</p>
                  </div>
                </div>
                <h2>{report}</h2>
                <p>
                  Generado: {new Date().toLocaleString("es-MX")} ·{" "}
                  {mode ? "DATOS DE DEMOSTRACIÓN" : "Registros locales"}
                </p>
                <p>
                  Filtros:{" "}
                  {Object.entries(filters)
                    .filter(([, v]) => v)
                    .map(([k, v]) => k + ": " + v)
                    .join(" · ") || "Sin restricciones"}{" "}
                  · {rows.length} registros seleccionados · {complete.length}{" "}
                  completos.
                </p>
                {[
                  "Mediciones por lote",
                  "Historial de registros",
                  "Desviaciones",
                ].includes(report) ? (
                  table(report === "Desviaciones" ? out : rows, false)
                ) : report === "Validación metrológica" ? (
                  <>
                    <p>
                      Variable: {labels[trialVariable]} · Sesión:{" "}
                      {trialSession || "Todas"} · Instrumento:{" "}
                      {trialInstrument || "Todos"} · n={trials.length}
                    </p>
                    <p>
                      Sesgo {fmt(metric.mean)} · Error absoluto medio{" "}
                      {fmt(metric.mae)} · RMSE {fmt(metric.rmse)}
                    </p>
                    <table>
                      <thead>
                        <tr>
                          <th>Muestra</th>
                          <th>Referencia</th>
                          <th>Prototipo</th>
                          <th>Diferencia</th>
                        </tr>
                      </thead>
                      <tbody>
                        {trials.map((t) => (
                          <tr key={t.id}>
                            <td>
                              {t.sample} · {t.session}
                            </td>
                            <td>{t.reference}</td>
                            <td>{t.prototype}</td>
                            <td>
                              {fmt(t.prototype - t.reference)} {t.unit}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </>
                ) : report === "Simulación de tiempos" ? (
                  <>
                    <pre>{JSON.stringify(s.simulation, null, 2)}</pre>
                    <pre>
                      {JSON.stringify(simulation(s.simulation), null, 2)}
                    </pre>
                  </>
                ) : report === "Evaluación económica" ? (
                  <>
                    <pre>{JSON.stringify(s.economy, null, 2)}</pre>
                    <pre>{JSON.stringify(economics(s.economy), null, 2)}</pre>
                  </>
                ) : (
                  grouped.map(([g, ms]) => (
                    <div key={g}>
                      <h3>{g}</h3>
                      {variables.map((v) => (
                        <div key={v}>
                          <p>
                            {labels[v]}: n={ms.length} · media{" "}
                            {fmt(stats(ms.map((m) => m[v]!)).mean)} · s{" "}
                            {fmt(stats(ms.map((m) => m[v]!)).sd)}{" "}
                            {units(v, ms[0].moisture)}
                          </p>
                          <Trend rows={ms} v={v} moisture={ms[0].moisture} />
                        </div>
                      ))}
                    </div>
                  ))
                )}
                <h3>Métodos y limitaciones</h3>
                <p>
                  Captura manual. Media aritmética y desviación estándar
                  muestral (n−1); cálculos solo sobre registros completos no
                  borrador. Error metrológico = prototipo − referencia. Las
                  alertas se basan en criterios guardados, no certifican
                  cumplimiento normativo. Los resultados económicos y de
                  simulación son proyecciones.
                </p>
                <p>{s.reportNotes}</p>
              </section>
              <section className="panel no-print">
                <h2>Respaldo y recuperación</h2>
                <p>
                  Los datos están únicamente en este espacio local, sin
                  sincronización. Exporta un respaldo JSON para conservar
                  mediciones, reglas, configuraciones e historial.
                </p>
                <div className="button-row">
                  <button
                    onClick={() =>
                      download(
                        "q-monitor-" +
                          (mode ? "demo" : "real") +
                          "-respaldo.json",
                        JSON.stringify(s, null, 2),
                        "application/json",
                      )
                    }
                  >
                    <Database size={16} /> Descargar respaldo completo
                  </button>
                  <label className="file-button">
                    Restaurar respaldo
                    <input
                      type="file"
                      accept=".json,application/json"
                      onChange={async (e) => {
                        const file = e.target.files?.[0];
                        if (!file) return;
                        try {
                          if (file.size > 20_000_000)
                            throw Error("El respaldo supera 20 MB.");
                          const data = JSON.parse(await file.text());
                          if (!validBackup(data))
                            throw Error("Formato de respaldo inválido.");
                          if (
                            !confirm(
                              "Se reemplazarán los datos del espacio " +
                                (mode ? "de demostración" : "real") +
                                ". Descarga primero un respaldo. ¿Continuar?",
                            )
                          )
                            return;
                          if (save(data)) setNotice("Respaldo restaurado.");
                        } catch (e) {
                          setError("No se restauró: " + String(e));
                        }
                      }}
                    />
                  </label>
                </div>
              </section>
            </>
          )}
          {page === 9 && (
            <>
              <section className="panel">
                <h2>Identidad y catálogos</h2>
                <p>
                  Un elemento por línea en los catálogos. Las mediciones
                  conservan sus datos originales.
                </p>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget),
                      g = (k: string) => String(fd.get(k) || "");
                    save({
                      ...s,
                      name: g("name"),
                      organization: g("organization"),
                      products: g("products")
                        .split("\n")
                        .map((x) => x.trim())
                        .filter(Boolean),
                      operators: g("operators")
                        .split("\n")
                        .map((x) => x.trim())
                        .filter(Boolean),
                      instruments: g("instruments")
                        .split("\n")
                        .map((x) => x.trim())
                        .filter(Boolean),
                      stages: g("stages")
                        .split("\n")
                        .map((x) => x.trim())
                        .filter(Boolean),
                      methods: g("methods")
                        .split("\n")
                        .map((x) => x.trim())
                        .filter(Boolean),
                      frequency: g("frequency"),
                      reportNotes: g("reportNotes"),
                    });
                    setNotice("Configuración guardada.");
                  }}
                >
                  <div className="form-grid">
                    <Field
                      label="Nombre de la aplicación"
                      name="name"
                      defaultValue={s.name}
                      required
                    />
                    <Field
                      label="Organización"
                      name="organization"
                      defaultValue={s.organization}
                    />
                    {[
                      ["products", "Productos"],
                      ["operators", "Operadores"],
                      ["instruments", "Instrumentos"],
                      ["stages", "Etapas"],
                      ["methods", "Métodos de referencia"],
                    ].map(([k, l]) => (
                      <label key={k}>
                        {l}
                        <textarea
                          name={k}
                          defaultValue={(s[k as keyof State] as string[]).join(
                            "\n",
                          )}
                        />
                      </label>
                    ))}
                    <Field
                      label="Frecuencia esperada de captura"
                      name="frequency"
                      defaultValue={s.frequency}
                    />
                    <label>
                      Notas de los reportes
                      <textarea
                        name="reportNotes"
                        defaultValue={s.reportNotes}
                      />
                    </label>
                  </div>
                  <p className="footnote">
                    Humedad: relativa ambiental (% HR), contenido base húmeda (%
                    b.h.) y base seca (% b.s.). Las unidades se asignan según el
                    método; no son intercambiables.
                  </p>
                  <button className="primary">Guardar configuración</button>
                </form>
              </section>
              <section className="panel">
                <div className="section-heading">
                  <div>
                    <h2>Criterios de aceptación</h2>
                    <p>
                      Las nuevas reglas se aplican a nuevas mediciones. No
                      reevalúan el historial.
                    </p>
                  </div>
                  <ShieldCheck size={22} />
                </div>
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const fd = new FormData(e.currentTarget),
                      g = (k: string) => String(fd.get(k) || ""),
                      lower = number(g("lower")),
                      upper = number(g("upper")),
                      resolution = number(g("resolution"));
                    if (
                      (lower === null && upper === null) ||
                      (lower !== null && upper !== null && lower > upper) ||
                      (resolution !== null && resolution <= 0)
                    ) {
                      setError(
                        "Define al menos un límite válido, inferior ≤ superior, y resolución positiva si corresponde.",
                      );
                      return;
                    }
                    const r: Rule = {
                      id: uid(),
                      product: g("product").trim(),
                      stage: g("stage"),
                      variable: g("variable") as Variable,
                      moisture: g("moisture"),
                      lower,
                      upper,
                      resolution,
                      source: g("source"),
                      effective: g("effective"),
                      active: true,
                    };
                    if (
                      s.rules.some(
                        (x) =>
                          x.active &&
                          x.product === r.product &&
                          x.stage === r.stage &&
                          x.variable === r.variable &&
                          (r.variable !== "humidity" ||
                            x.moisture === r.moisture),
                      )
                    ) {
                      setError(
                        "Desactiva primero la regla vigente para ese producto, etapa y variable.",
                      );
                      return;
                    }
                    if (save({ ...s, rules: [...s.rules, r] })) {
                      setNotice(
                        "Criterio guardado. Se conservará una copia en cada nueva medición.",
                      );
                      e.currentTarget.reset();
                    }
                  }}
                >
                  <div className="form-grid">
                    <Field
                      label="Producto *"
                      name="product"
                      list="products"
                      required
                    />
                    <Field
                      label="Etapa *"
                      name="stage"
                      list="stages"
                      required
                    />
                    <label>
                      Variable
                      <select name="variable">
                        {variables.map((v) => (
                          <option key={v} value={v}>
                            {labels[v]}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Tipo de humedad (si aplica)
                      <select name="moisture">
                        {moistureTypes.map((t) => (
                          <option key={t}>{t}</option>
                        ))}
                      </select>
                    </label>
                    <Field
                      label="Límite inferior"
                      name="lower"
                      type="number"
                      step="any"
                    />
                    <Field
                      label="Límite superior"
                      name="upper"
                      type="number"
                      step="any"
                    />
                    <Field
                      label="Resolución del instrumento"
                      name="resolution"
                      type="number"
                      min="0.000001"
                      step="any"
                    />
                    <Field
                      label="Vigente desde *"
                      name="effective"
                      type="date"
                      required
                    />
                    <Field
                      label="Fuente o justificación *"
                      name="source"
                      required
                    />
                  </div>
                  <button className="primary">
                    <Plus size={15} /> Añadir criterio
                  </button>
                </form>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Producto / etapa</th>
                        <th>Variable / unidad</th>
                        <th>Límites</th>
                        <th>Vigencia / fuente</th>
                        <th>Estado</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.rules.map((r) => (
                        <tr key={r.id}>
                          <td>
                            {r.product}
                            <small>{r.stage}</small>
                          </td>
                          <td>
                            {labels[r.variable]}
                            <small>{units(r.variable, r.moisture)}</small>
                          </td>
                          <td>
                            {r.lower ?? "—"} — {r.upper ?? "—"}
                          </td>
                          <td>
                            {r.effective}
                            <small>{r.source}</small>
                          </td>
                          <td>
                            {r.active ? (
                              <button
                                onClick={() => {
                                  if (
                                    confirm(
                                      "¿Desactivar para nuevas mediciones? Los criterios históricos se conservan.",
                                    )
                                  )
                                    save({
                                      ...s,
                                      rules: s.rules.map((x) =>
                                        x.id === r.id
                                          ? { ...x, active: false }
                                          : x,
                                      ),
                                    });
                                }}
                              >
                                Desactivar
                              </button>
                            ) : (
                              "Inactiva"
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
              <section className="panel">
                <h2>Historial de trazabilidad</h2>
                <div className="table-wrap">
                  <table>
                    <thead>
                      <tr>
                        <th>Fecha</th>
                        <th>Registro</th>
                        <th>Responsable</th>
                        <th>Acción</th>
                        <th>Motivo</th>
                      </tr>
                    </thead>
                    <tbody>
                      {s.measurements.flatMap((m) =>
                        m.audit.map((a, i) => (
                          <tr key={m.id + i}>
                            <td>{time(a.at)}</td>
                            <td>{m.id}</td>
                            <td>{a.actor}</td>
                            <td className="audit-action">{a.action}</td>
                            <td>{a.reason}</td>
                          </tr>
                        )),
                      )}
                    </tbody>
                  </table>
                </div>
              </section>
            </>
          )}
          <footer>
            <span>
              {s.name} <i> / </i> Industrial Quality Intelligence
            </span>
            <span>Registro manual · Evidencia trazable · v1.0</span>
          </footer>
        </div>
      </main>
      {detail && (
        <div className="modal-backdrop">
          <section className="modal panel">
            <div className="section-heading">
              <h2>{detail.id}</h2>
              <button
                aria-label="Cerrar detalle"
                onClick={() => setDetail(null)}
              >
                <X />
              </button>
            </div>
            <Badge value={status(detail)} />
            <div className="form-grid">
              {Object.entries(exportRows([detail])[0]).map(([k, v]) => (
                <div key={k}>
                  <span className="muted">{k}</span>
                  <p>{String(v ?? "Sin lectura")}</p>
                </div>
              ))}
            </div>
            <h3>Criterios conservados</h3>
            {detail.rules.length ? (
              detail.rules.map((r) => (
                <p key={r.id}>
                  {labels[r.variable]} · {r.lower ?? "—"} a {r.upper ?? "—"} ·{" "}
                  {r.source} · vigente {r.effective}
                </p>
              ))
            ) : (
              <p>Sin criterio de aceptación configurado.</p>
            )}
            <h3>Historial</h3>
            {detail.audit.map((a, i) => (
              <p key={i}>
                {time(a.at)} · {a.actor} · {a.action} · {a.reason}
              </p>
            ))}
            {!detail.draft && status(detail) === "Pendiente de revisión" && (
              <button
                className="primary"
                onClick={() => {
                  const actor = prompt("Nombre del responsable de revisión:");
                  if (!actor?.trim()) return;
                  save({
                    ...s,
                    measurements: s.measurements.map((m) =>
                      m.id === detail.id
                        ? {
                            ...m,
                            reviewed: true,
                            audit: [
                              ...m.audit,
                              {
                                at: new Date().toISOString(),
                                actor,
                                action: "Revisión",
                                reason:
                                  "Revisión documentada de lecturas y criterios",
                              },
                            ],
                          }
                        : m,
                    ),
                  });
                  setDetail(null);
                }}
              >
                Documentar revisión
              </button>
            )}
          </section>
        </div>
      )}
      {["products", "operators", "instruments", "stages", "methods"].map(
        (k) => (
          <datalist key={k} id={k}>
            {(s[k as keyof State] as string[]).map((v) => (
              <option key={v} value={v} />
            ))}
          </datalist>
        ),
      )}
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
