import { useCallback, useMemo, useState } from "react"
import { Search, Wrench, CheckCircle, FileText, AlertCircle } from "lucide-react"
import { maquinas as api, arriendos as arriendosApi } from "@/services/maquinaria"
import useCarga from "@/lib/useCarga"
import { clp, fechaCL } from "@/lib/formato"
import EstadoCarga from "@/components/EstadoCarga"
import Scorecard from "@/components/maquinaria/Scorecard"
import s, { ESTADO_MAQUINA } from "./EstilosMaquinaria"

// Vista de solo lectura. Ingreso y edición: /maquinaria/registrar?tipo=maquina (desde el menú "Registrar")
export default function VistaMaquinaria() {
  const cargarTodo = useCallback(async () => {
    const [maquinas, arriendos] = await Promise.all([api.listar(), arriendosApi.listar()])
    return { maquinas, arriendos }
  }, [])
  const { datos, cargando, error, recargar } = useCarga(cargarTodo, { maquinas: [], arriendos: [] })
  const { maquinas, arriendos } = datos

  const anio = String(new Date().getFullYear())
  const [q, setQ] = useState("")
  const [fEstado, setFEstado] = useState("")
  const [fTipo, setFTipo] = useState("")

  const tipos = useMemo(() => [...new Set(maquinas.map((m) => m.tipo).filter(Boolean))].sort(), [maquinas])

  // Uso de cada máquina en el año: n° de arriendos, ingresos cotizados y último uso
  const uso = useMemo(() => {
    const r = {}
    for (const a of arriendos) {
      if (!a.inicio?.startsWith(anio)) continue
      const u = (r[a.maquina_id] ??= { n: 0, monto: 0, ultimo: "" })
      u.n += 1
      u.monto += Number(a.monto) || 0
      if (a.inicio > u.ultimo) u.ultimo = a.inicio
    }
    return r
  }, [arriendos, anio])

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
          <h2 style={s.title}>Equipos</h2>
          <p style={s.sub}>{filtradas.length} de {maquinas.length} equipos</p>
        </div>
      </div>

      <div style={s.statsRow}>
        <Scorecard icono={Wrench} color="#4A6FA5" bg="#EBF2FB" valor={maquinas.length} etiqueta="Equipos registrados" />
        <Scorecard icono={CheckCircle} color="#065F46" bg="#D1FAE5" valor={cuenta("Disponible")} etiqueta="Disponibles" />
        <Scorecard icono={FileText} color="#92400E" bg="#FEF3C7" valor={cuenta("Arrendada")} etiqueta="En arriendo" />
        <Scorecard icono={AlertCircle} color="#991B1B" bg="#FEE2E2" valor={cuenta("Mantención")} etiqueta="En mantención" />
        <Scorecard icono={Wrench} color="#7C3AED" bg="#EDE9FE"
          valor={masUsada && uso[masUsada.id] ? masUsada.nombre : "—"}
          etiqueta={`Más usada en ${anio}`}
          detalle={masUsada && uso[masUsada.id] ? `${uso[masUsada.id].n} arriendos` : null} />
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
        {(q || fEstado || fTipo) && <button style={s.btnCancel} onClick={() => { setQ(""); setFEstado(""); setFTipo("") }}>Limpiar filtros</button>}
      </div>

      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar} />

      {!cargando && !error && (
        <div style={s.tableCard}>
          <table style={s.table}>
            <thead>
              <tr>{["Nombre / Modelo", "Tipo", "Estado", "Tarifa ref.", `Arriendos ${anio}`, `Ingresos ${anio}`, "Último uso"].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr>
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
                  </tr>
                )
              })}
              {filtradas.length === 0 && <tr><td colSpan={7} style={s.vacio}>No hay equipos con esos filtros.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
