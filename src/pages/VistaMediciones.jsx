import { useEffect, useMemo, useState } from "react"
import { RefreshCw, Radio, AlertTriangle, Cpu } from "lucide-react"
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from "recharts"
import { listarMediciones, tiposObjetivo, escucharMediciones } from "../services/lecheria"
import useCarga from "../lib/useCarga"
import EstadoCarga from "../components/EstadoCarga"
import s from "./estilosLecheria"
import tw from "@/lib/ui"

// Variables que puede traer una medición (se muestran solo las que vienen con dato)
const VARIABLES = [
  { campo: "temperatura_ambiente", titulo: "Temp. ambiente", unidad: "°C" },
  { campo: "humedad_ambiente", titulo: "Humedad ambiente", unidad: "%" },
  { campo: "temperatura_suelo", titulo: "Temp. suelo / cama", unidad: "°C" },
  { campo: "humedad_suelo", titulo: "Humedad suelo / cama", unidad: "%" },
  { campo: "ph", titulo: "pH", unidad: "" },
  { campo: "ec", titulo: "Conductividad", unidad: "dS/m" },
  { campo: "nitrogeno", titulo: "Nitrógeno", unidad: "kg/ha" },
  { campo: "fosforo", titulo: "Fósforo", unidad: "kg/ha" },
  { campo: "potasio", titulo: "Potasio", unidad: "kg/ha" },
]

// Umbrales REFERENCIALES para camas de terneros: ajustarlos con la referencia de INIA cuando la tengan.
const UMBRALES = {
  humedad_ambiente: { max: 80 },
  humedad_suelo: { max: 70 },
  temperatura_ambiente: { min: 5, max: 30 },
}
const fueraDeRango = (campo, v) => {
  const u = UMBRALES[campo]
  if (!u || v == null) return false
  return (u.min != null && v < u.min) || (u.max != null && v > u.max)
}

const PERIODOS = { "24h": 1, "7d": 7, "30d": 30 }
const COLORES = ["#3D6B4F", "#3B82F6", "#F59E0B", "#8B5CF6", "#EF4444", "#0E7490"]

const nombreFuente = (m) => m.dispositivo?.nombre ?? m.etiqueta ?? (m.dispositivo_id ? `Dispositivo ${String(m.dispositivo_id).slice(0, 4)}` : "Sin dispositivo")
const hora = (iso) => new Date(iso).toLocaleString("es-CL", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })
const haceCuanto = (iso) => {
  const min = Math.round((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return "recién"
  if (min < 60) return `hace ${min} min`
  if (min < 1440) return `hace ${Math.round(min / 60)} h`
  return `hace ${Math.round(min / 1440)} d`
}
const fmtValor = (v) => (v == null ? "—" : Number(v).toLocaleString("es-CL", { maximumFractionDigits: 1 }))

// Mediciones en tiempo real: camas de terneros, sonda de suelo u otros sensores, filtradas por tipo y período.
export default function VistaMediciones() {
  const { datos: tipos } = useCarga(tiposObjetivo, [])
  const [tipoId, setTipoId] = useState(null) // null = aún no elegido (se propone el de camas/terneros)
  const [periodo, setPeriodo] = useState("24h")
  const [fuente, setFuente] = useState("")
  const [variable, setVariable] = useState("temperatura_ambiente")
  const [enVivo, setEnVivo] = useState(false)

  // Por defecto, el tipo que parezca de camas de terneros; si no hay, todos
  const tipoElegido = tipoId ?? (tipos.find((t) => /terner|cama/i.test(`${t.codigo} ${t.nombre}`))?.id ?? "")

  const { datos: mediciones, cargando, error, recargar } = useCarga(
    () => listarMediciones({ desde: new Date(Date.now() - PERIODOS[periodo] * 86400000).toISOString(), tipoId: tipoElegido }),
    [],
    `${periodo}-${tipoElegido}`
  )

  // Tiempo real: al llegar una medición nueva se recarga la lista
  useEffect(() => {
    const dejar = escucharMediciones(() => { setEnVivo(true); recargar() })
    return dejar
  }, [recargar])

  const fuentes = useMemo(() => [...new Set(mediciones.map(nombreFuente))].sort(), [mediciones])
  const visibles = fuente ? mediciones.filter((m) => nombreFuente(m) === fuente) : mediciones
  const conDato = VARIABLES.filter((v) => visibles.some((m) => m[v.campo] != null))
  const varActiva = conDato.find((v) => v.campo === variable) ?? conDato[0]

  // Última lectura de cada dispositivo
  const ultimasMap = new Map()
  for (const m of visibles) if (!ultimasMap.has(nombreFuente(m))) ultimasMap.set(nombreFuente(m), m) // vienen de la más nueva a la más antigua
  const ultimas = [...ultimasMap.entries()]

  // Serie para el gráfico: un punto por medición, una línea por dispositivo
  const series = ultimas.map(([nombre]) => nombre)
  const puntos = !varActiva ? [] : [...visibles].reverse()
    .filter((m) => m[varActiva.campo] != null)
    .map((m) => ({ t: new Date(m.created_at).getTime(), [nombreFuente(m)]: Number(m[varActiva.campo]) }))

  const alertas = ultimas.filter(([, m]) => VARIABLES.some((v) => fueraDeRango(v.campo, m[v.campo])))

  return (
    <div className={tw.container}>
      <div className={tw.topBar}>
        <div>
          <h2 style={s.title}>Mediciones</h2>
          <p style={s.sub}>{visibles.length} lecturas · {fuentes.length} dispositivo(s)</p>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <span style={{ ...s.badge, display: "inline-flex", alignItems: "center", gap: 4, backgroundColor: enVivo ? "#D1FAE5" : "#F1F5F9", color: enVivo ? "#065F46" : "#64748B" }}
            title="Se actualiza sola cuando llega una medición nueva (requiere Realtime activo en Supabase)">
            <Radio size={12} /> {enVivo ? "En vivo" : "Esperando lecturas"}
          </span>
          <button style={s.btnCancel} onClick={recargar}><RefreshCw size={14} style={{ verticalAlign: -2 }} /> Actualizar</button>
        </div>
      </div>

      <div className={tw.filtros}>
        <select style={s.select} value={tipoElegido} onChange={(e) => setTipoId(e.target.value)}>
          <option value="">Todos los tipos</option>
          {tipos.map((t) => <option key={t.id} value={t.id}>{t.nombre}</option>)}
        </select>
        <select style={s.select} value={periodo} onChange={(e) => setPeriodo(e.target.value)}>
          <option value="24h">Últimas 24 horas</option>
          <option value="7d">Últimos 7 días</option>
          <option value="30d">Últimos 30 días</option>
        </select>
        <select style={s.select} value={fuente} onChange={(e) => setFuente(e.target.value)}>
          <option value="">Todos los dispositivos</option>
          {fuentes.map((f) => <option key={f}>{f}</option>)}
        </select>
      </div>

      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar} />

      {alertas.length > 0 && (
        <div style={s.alertBox}>
          <AlertTriangle size={16} color="#D97706" />
          <span>
            <strong>{alertas.length} dispositivo(s)</strong> con valores fuera del rango referencial: {alertas.map(([n]) => n).join(", ")}.
          </span>
        </div>
      )}

      {!cargando && !error && visibles.length === 0 && (
        <div style={{ ...s.alertBox, backgroundColor: "#F8FAFC", borderColor: "#E2E8F0", color: "#64748B" }}>
          No hay mediciones en este período. Cuando un dispositivo envíe lecturas aparecerán aquí automáticamente.
        </div>
      )}

      {/* Última lectura por dispositivo */}
      {ultimas.length > 0 && (
        <div className={tw.cardsGrid}>
          {ultimas.map(([nombre, m]) => (
            <div key={nombre} style={{ backgroundColor: "#fff", border: "1px solid #D1E8DA", borderRadius: 10, padding: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <Cpu size={16} color="#3D6B4F" />
                <div style={{ minWidth: 0 }}>
                  <p style={{ ...s.nombre, margin: 0 }}>{nombre}</p>
                  <p style={{ fontSize: 11, color: "#94A3B8", margin: 0 }}>
                    {[m.tipo?.nombre, m.potrero?.nombre].filter(Boolean).join(" · ")} · {haceCuanto(m.created_at)}
                  </p>
                </div>
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {VARIABLES.filter((v) => m[v.campo] != null).map((v) => {
                  const mal = fueraDeRango(v.campo, Number(m[v.campo]))
                  return (
                    <div key={v.campo} style={{ backgroundColor: mal ? "#FEF3C7" : "#F8FAFC", borderRadius: 6, padding: "6px 8px" }}>
                      <p style={{ fontSize: 10.5, color: "#64748B", margin: 0 }}>{v.titulo}</p>
                      <p style={{ fontSize: 15, fontWeight: 700, color: mal ? "#92400E" : "#1E293B", margin: 0 }}>
                        {fmtValor(m[v.campo])} <span style={{ fontSize: 11, fontWeight: 500 }}>{v.unidad}</span>
                      </p>
                    </div>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Evolución en el período */}
      {conDato.length > 0 && (
        <div style={{ backgroundColor: "#fff", border: "1px solid #D1E8DA", borderRadius: 10, padding: 16, minWidth: 0 }}>
          <div className={tw.filtros} style={{ justifyContent: "space-between", marginBottom: 8 }}>
            <h3 style={{ ...s.modalTitle, fontSize: 14 }}>Evolución</h3>
            <select style={s.select} value={varActiva?.campo} onChange={(e) => setVariable(e.target.value)}>
              {conDato.map((v) => <option key={v.campo} value={v.campo}>{v.titulo}</option>)}
            </select>
          </div>
          <div style={{ width: "100%", height: 260 }}>
            <ResponsiveContainer>
              <LineChart data={puntos} margin={{ top: 5, right: 10, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#E2E8F0" />
                <XAxis dataKey="t" type="number" scale="time" domain={["dataMin", "dataMax"]}
                  tickFormatter={(t) => hora(t)} tick={{ fontSize: 11 }} minTickGap={30} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip labelFormatter={(t) => hora(t)} formatter={(v) => `${fmtValor(v)} ${varActiva?.unidad ?? ""}`} />
                {series.length > 1 && <Legend />}
                {series.map((nombre, i) => (
                  <Line key={nombre} dataKey={nombre} name={nombre} stroke={COLORES[i % COLORES.length]}
                    dot={false} strokeWidth={2} connectNulls isAnimationActive={false} />
                ))}
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>
      )}

      {/* Últimas lecturas */}
      {visibles.length > 0 && (
        <div className={tw.tableCard}>
          <table className={tw.table}>
            <thead>
              <tr>{["Fecha", "Dispositivo", ...conDato.map((v) => v.titulo)].map((h) => <th key={h} className={tw.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {visibles.slice(0, 100).map((m) => (
                <tr key={m.id}>
                  <td className={tw.td}>{hora(m.created_at)}</td>
                  <td className={tw.td}>{nombreFuente(m)}</td>
                  {conDato.map((v) => (
                    <td key={v.campo} className={tw.td} style={fueraDeRango(v.campo, m[v.campo]) ? { color: "#B45309", fontWeight: 600 } : undefined}>
                      {fmtValor(m[v.campo])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p style={{ ...s.sub, margin: 0, fontSize: 11.5 }}>
        Los rangos marcados en amarillo son referenciales (humedad ambiente &gt; 80 %, humedad de cama &gt; 70 %, temperatura fuera de 5–30 °C).
      </p>
    </div>
  )
}
