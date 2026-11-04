import { useCallback, useMemo, useState } from "react"
import { Plus, Pencil, Trash2, DollarSign, CheckCircle, Clock, Search } from "lucide-react"
import { arriendos as api, catalogos } from "../services/maquinaria"
import useCarga from "../lib/useCarga"
import { clp, fechaCL } from "../lib/formato"
import EstadoCarga from "../components/EstadoCarga"
import s, { ESTADO_ARRIENDO } from "./EstilosMaquinaria"

const POR_PAGINA = 100

export default function VistaArriendos() {
  const cargarTodo = useCallback(async () => {
    const [lista, catalogo] = await Promise.all([api.listar(), catalogos()])
    return { lista, catalogo }
  }, [])
  const { datos, cargando, error, setError, recargar } = useCarga(cargarTodo, { lista: [], catalogo: { clientes: [], maquinas: [], servicios: [] } })
  const { lista, catalogo } = datos

  const anioActual = String(new Date().getFullYear())
  const [q, setQ] = useState("")
  const [fAnio, setFAnio] = useState(anioActual)
  const [fEstado, setFEstado] = useState("")
  const [limite, setLimite] = useState(POR_PAGINA)
  

  const anios = useMemo(() => [...new Set(lista.map((a) => a.inicio.slice(0, 4)))].sort().reverse(), [lista])

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase()
    return lista.filter(
      (a) =>
        (!fAnio || a.inicio.startsWith(fAnio)) &&
        (!fEstado || a.estado === fEstado) &&
        (!t || `${a.cliente?.nombre} ${a.maquina?.nombre} ${a.servicio?.nombre} ${a.predio ?? ""}`.toLowerCase().includes(t))
    )
  }, [lista, q, fAnio, fEstado])

  const totalPagado = filtrados.filter((a) => a.pagado).reduce((t, a) => t + Number(a.monto), 0)
  const totalPendiente = filtrados.filter((a) => !a.pagado).reduce((t, a) => t + Number(a.monto), 0)

  const togglePago = async (a) => {
    try { await api.actualizar(a.id, { ...a, pagado: !a.pagado }); await recargar() } catch (e) { setError(e.message) }
  }
  const eliminar = async (a) => {
    if (!window.confirm(`¿Eliminar el arriendo de ${a.cliente?.nombre} (${fechaCL(a.inicio)})? También se elimina su factura.`)) return
    try { await api.eliminar(a.id); await recargar() } catch (e) { setError(e.message) }
  }

  const stat = (icono, bg, valor, etiqueta) => (
    <div style={s.stat}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center" }}>{icono}</div>
        <div><p style={s.statValue}>{valor}</p><p style={s.statLabel}>{etiqueta}</p></div>
      </div>
    </div>
  )

  return (
    <div style={s.container}>
      <div style={s.topBar}>
        <div>
          <h2 style={s.title}>Arriendos</h2>
          <p style={s.sub}>{filtrados.length} registros{fAnio ? ` en ${fAnio}` : ""}</p>
        </div>
        
      </div>

      <div style={s.statsRow}>
        {stat(<CheckCircle size={18} color="#065F46" />, "#D1FAE5", clp(totalPagado), "Pagado (neto)")}
        {stat(<Clock size={18} color="#92400E" />, "#FEF3C7", clp(totalPendiente), "Por cobrar (neto)")}
        {stat(<DollarSign size={18} color="#4A6FA5" />, "#EBF2FB", clp(totalPagado + totalPendiente), "Total")}
      </div>

      <div style={s.filtros}>
        <div style={s.buscador}>
          <Search size={14} color="#94A3B8" />
          <input style={s.buscadorInput} placeholder="Buscar cliente, máquina, servicio o predio..." value={q} onChange={(e) => { setQ(e.target.value); setLimite(POR_PAGINA) }} />
        </div>
        <select style={s.select} value={fAnio} onChange={(e) => { setFAnio(e.target.value); setLimite(POR_PAGINA) }}>
          <option value="">Todos los años</option>
          {anios.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select style={s.select} value={fEstado} onChange={(e) => { setFEstado(e.target.value); setLimite(POR_PAGINA) }}>
          <option value="">Todos los estados</option>
          {Object.keys(ESTADO_ARRIENDO).map((e) => <option key={e}>{e}</option>)}
        </select>
      </div>

      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar} />

      {!cargando && !error && (
        <div style={s.tableCard}>
          <table style={s.table}>
            <thead>
              <tr>{["Cliente", "Máquina / Servicio", "Periodo", "Cantidad", "Monto neto", "Pago", "Estado", ""].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtrados.slice(0, limite).map((a, i) => (
                <tr key={a.id} style={{ backgroundColor: i % 2 === 0 ? "#F8FAFC" : "#fff" }}>
                  <td style={s.td}><span style={s.nombre}>{a.cliente?.nombre}</span><span style={s.rutTxt}>{[a.predio, a.comuna].filter(Boolean).join(" · ")}</span></td>
                  <td style={s.td}>
                    <span style={{ display: "block", fontWeight: 600, color: "#1E293B", fontSize: 12 }}>{a.maquina?.nombre} {a.maquina?.modelo}</span>
                    <span style={s.rutTxt}>{a.servicio?.nombre}</span>
                  </td>
                  <td style={s.td}>
                    <span style={{ fontSize: 12 }}>{fechaCL(a.inicio)}</span>
                    {a.fin !== a.inicio && <span style={s.rutTxt}>hasta {fechaCL(a.fin)}</span>}
                  </td>
                  <td style={s.td}>{Number(a.cantidad).toLocaleString("es-CL")} {a.unidad === "horas" ? "h" : "ha"}</td>
                  <td style={{ ...s.td, fontWeight: 600 }}>{clp(a.monto)}</td>
                  <td style={s.td}>
                    <button onClick={() => togglePago(a)} title="Cambiar estado de pago"
                      style={{ ...s.badge, backgroundColor: a.pagado ? "#D1FAE5" : "#FEF3C7", color: a.pagado ? "#065F46" : "#92400E", border: "none", cursor: "pointer" }}>
                      {a.pagado ? "✓ Pagado" : "Pendiente"}
                    </button>
                  </td>
                  <td style={s.td}><span style={{ ...s.badge, ...ESTADO_ARRIENDO[a.estado] }}>{a.estado}</span></td>
                  <td style={s.td}>
                    <div style={s.actions}>
                      <button style={s.iconBtnBlue} title="Editar" onClick={() => setModal(a)}><Pencil size={14} /></button>
                      <button style={s.iconBtnRed} title="Eliminar" onClick={() => eliminar(a)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && <tr><td colSpan={8} style={s.vacio}>No hay arriendos con esos filtros.</td></tr>}
            </tbody>
          </table>
          {filtrados.length > limite && (
            <div style={{ padding: 12, textAlign: "center" }}>
              <button style={s.btnCancel} onClick={() => setLimite((l) => l + POR_PAGINA)}>
                Ver más ({filtrados.length - limite} restantes)
              </button>
            </div>
          )}
        </div>
      )}

      
    </div>
  )
}