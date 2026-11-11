import { useCallback, useMemo, useState } from "react"
import {AlertTriangle, Search, Wrench, CheckCircle, FileText, AlertCircle } from "lucide-react"
import { maquinas as api, arriendos as arriendosApi , fallas as fallasApi} from "@/services/maquinaria"
import useCarga from "@/lib/useCarga"
import { clp, fechaCL, aInputLocal, horasFalla} from "@/lib/formato"
import EstadoCarga from "@/components/EstadoCarga"
import Scorecard from "@/components/maquinaria/Scorecard"
import s, { ESTADO_MAQUINA } from "./EstilosMaquinaria"
import { descargarCSV } from "@/lib/exportar"

// Vista de solo lectura. Ingreso y edición: /maquinaria/registrar?tipo=maquina (desde el menú "Registrar")
export default function VistaMaquinaria() {
    const cargarTodo = useCallback(async () => {
    const [maquinas, arriendos, fallas] = await Promise.all([
      api.listar(),
      arriendosApi.listar(),
      fallasApi.listar().catch(() => []), // si la tabla aún no existe, sin fallas
    ])
    return { maquinas, arriendos, fallas }
  }, [])
  const { datos, cargando, error, recargar } = useCarga(cargarTodo, { maquinas: [], arriendos: [], fallas: [] })
  const { maquinas, arriendos, fallas = [] } = datos

  const hoyStr = aInputLocal(new Date()).slice(0, 10)
  const [desde, setDesde] = useState(`${hoyStr.slice(0, 4)}-01-01`)
  const [hasta, setHasta] = useState(hoyStr)
  const [q, setQ] = useState("")
  const [fEstado, setFEstado] = useState("")
  const [fTipo, setFTipo] = useState("")

  const tipos = useMemo(() => [...new Set(maquinas.map((m) => m.tipo).filter(Boolean))].sort(), [maquinas])

  // Uso de cada máquina en el período: n° de arriendos, ingresos cotizados y último uso
  const uso = useMemo(() => {
    const r = {}
    for (const a of arriendos) {
      if (!(a.inicio <= hasta && a.fin >= desde)) continue
      const u = (r[a.maquina_id] ??= { n: 0, monto: 0, ultimo: "" })
      u.n += 1
      u.monto += Number(a.monto) || 0
      if (a.inicio > u.ultimo) u.ultimo = a.inicio
    }
    return r
  }, [arriendos, desde,hasta])

  const fallasPorMaquina = useMemo(() => {
  const r = {}
  for (const f of fallas) {
    const dia = aInputLocal(f.inicio).slice(0, 10) // fecha local, no UTC
    if (dia < desde || dia > hasta) continue
    const x = (r[f.maquina_id] ??= { n: 0, horas: 0 })
    x.n += 1
    x.horas += horasFalla(f)
  }
  return r
}, [fallas, desde, hasta])

const masFallas = maquinas.reduce(
  (top, m) => ((fallasPorMaquina[m.id]?.n ?? 0) > (fallasPorMaquina[top?.id]?.n ?? 0) ? m : top),
  null
)

  const filtradas = useMemo(() => {
    const t = q.trim().toLowerCase()
    return maquinas.filter(
      (m) =>
        (!fEstado || m.estado === fEstado) &&
        (!fTipo || m.tipo === fTipo) &&
        (!t || `${m.nombre} ${m.modelo} ${m.tipo} ${m.notas ?? ""}`.toLowerCase().includes(t))
    )
  }, [maquinas, q, fEstado, fTipo])

  const cuenta = (estado) => maquinas.filter((m) => m.estado === estado).length
  const masUsada = maquinas.reduce((top, m) => ((uso[m.id]?.n ?? 0) > (uso[top?.id]?.n ?? 0) ? m : top), null)

  return (
    <div style={s.container}>
      <div style={s.topBar}>
        <div>
          <h2 style={s.title}>Maquinaria</h2>
          <p style={s.sub}>{filtradas.length} de {maquinas.length} equipos</p>
        </div>
        <button
  style={s.btnCancel}
  onClick={() =>
    descargarCSV(`equipos-${desde}-a-${hasta}`, [
      { titulo: "Nombre", valor: (m) => m.nombre },
      { titulo: "Modelo", valor: (m) => m.modelo },
      { titulo: "Tipo", valor: (m) => m.tipo },
      { titulo: "Estado actual", valor: (m) => m.estado },
      { titulo: "Arriendos en el período", valor: (m) => uso[m.id]?.n ?? 0 },
      { titulo: "Ingresos en el período", valor: (m) => uso[m.id]?.monto ?? 0 },
      { titulo: "Último uso", valor: (m) => (uso[m.id]?.ultimo ? fechaCL(uso[m.id].ultimo) : "") },
      { titulo: "Fallas en el período", valor: (m) => fallasPorMaquina[m.id]?.n ?? 0 },
      { titulo: "Horas detenidas", valor: (m) => Math.round(fallasPorMaquina[m.id]?.horas ?? 0) },
    ], filtradas)
  }
>
  Exportar a Excel
</button>
      </div>

      <div style={{...s.statsRow, gridTemplateColumns:"repeat(3, minmax(0, 1fr))"}}>
        <Scorecard icono={Wrench} color="#4A6FA5" bg="#EBF2FB" valor={maquinas.length} etiqueta="Equipos registrados" />
        <Scorecard icono={CheckCircle} color="#065F46" bg="#D1FAE5" valor={cuenta("Disponible")} etiqueta="Disponibles" />
        <Scorecard icono={FileText} color="#92400E" bg="#FEF3C7" valor={cuenta("Arrendada")} etiqueta="En arriendo" />
        <Scorecard icono={AlertCircle} color="#991B1B" bg="#FEE2E2" valor={cuenta("Mantención")} etiqueta="En mantención" />
        <Scorecard icono={Wrench} color="#7C3AED" bg="#EDE9FE"
          valor={masUsada && uso[masUsada.id] ? masUsada.nombre : "—"}
          etiqueta={`Más usada en el período`}
          detalle={masUsada && uso[masUsada.id] ? `${uso[masUsada.id].n} arriendos` : null} />
        <Scorecard icono={AlertTriangle} color="#C2410C" bg="#FFEDD5"
        valor={masFallas && fallasPorMaquina[masFallas.id] ? masFallas.nombre : "—"}
        etiqueta="Más fallas en el período"
        detalle={masFallas && fallasPorMaquina[masFallas.id]
          ? `${fallasPorMaquina[masFallas.id].n} fallas · ${Math.round(fallasPorMaquina[masFallas.id].horas)} h`
          : null} />
      </div>

      <div style={s.filtros}>
        <div style={s.buscador}>
          <Search size={14} color="#94A3B8" />
          <input style={s.buscadorInput} placeholder="Buscar nombre, modelo o tipo..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select style={s.select} value={fEstado} onChange={(e) => setFEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          {Object.keys(ESTADO_MAQUINA).map((e) => <option key={e}>{e}</option>)}
        </select>
        <select style={s.select} value={fTipo} onChange={(e) => setFTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          {tipos.map((t) => <option key={t}>{t}</option>)}
        </select>
          <input type="date" style={s.select} value={desde} max={hasta} onChange={(e) => setDesde(e.target.value)} />
          <input type="date" style={s.select} value={hasta} min={desde} onChange={(e) => setHasta(e.target.value)} />
        {(q || fEstado || fTipo) && <button style={s.btnCancel} onClick={() => { setQ(""); setFEstado(""); setFTipo("") }}>Limpiar filtros</button>}
      </div>

      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar} />

      {!cargando && !error && (
        <div style={s.tableCard}>
          <table style={s.table}>
            <thead>
              <tr>{["Nombre / Modelo", "Tipo", "Estado", "Tarifa ref.", `Arriendos`, `Ingresos `, "Último uso", "Fallas", "Horas detenidas"].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtradas.map((m, i) => {
                const u = uso[m.id]
                return (
                  <tr key={m.id} style={{ backgroundColor: i % 2 === 0 ? "#F8FAFC" : "#fff" }}>
                    <td style={s.td}><span style={s.nombre}>{m.nombre}</span><span style={s.rutTxt}>{m.modelo}</span></td>
                    <td style={s.td}>{m.tipo || "—"}</td>
                    <td style={s.td}><span style={{ ...s.badge, ...ESTADO_MAQUINA[m.estado] }}>{m.estado}</span></td>
                    <td style={s.td}>{clp(m.precio)} <span style={{ color: "#94A3B8" }}>/ {m.unidad_cobro}</span></td>
                    <td style={s.td}>{u?.n ?? 0}</td>
                    <td style={s.td}>{u ? clp(u.monto) : "—"}</td>
                    <td style={s.td}>{u?.ultimo ? fechaCL(u.ultimo) : "—"}</td>
                    <td style={s.td}>{fallasPorMaquina[m.id]?.n ?? 0}</td>
                    <td style={s.td}>{fallasPorMaquina[m.id] ? `${Math.round(fallasPorMaquina[m.id].horas)} h` : "—"}</td>
                  </tr>
                )
              })}
              {filtradas.length === 0 && <tr><td colSpan={9} style={s.vacio}>No hay equipos con esos filtros.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
