import { useMemo, useState } from "react"
import { DollarSign, CheckCircle, Clock, Search, ClipboardList } from "lucide-react"
import { arriendos as api } from "@/services/maquinaria"
import useCarga from "@/lib/useCarga"
import { clp, fechaCL } from "@/lib/formato"
import EstadoCarga from "@/components/EstadoCarga"
import Scorecard from "@/components/maquinaria/Scorecard"
import s, { ESTADO_ARRIENDO } from "./EstilosMaquinaria"
import { descargarCSV } from "@/lib/exportar"

const POR_PAGINA = 100

// Vista de solo lectura. Crear, editar, marcar pagado y eliminar se hacen en /maquinaria/registrar?tipo=arriendo
export default function VistaArriendos() {
  const { datos: lista, cargando, error, recargar } = useCarga(api.listar, [])

  const anioActual = String(new Date().getFullYear())
  const [q, setQ] = useState("")
  const [fAnio, setFAnio] = useState(anioActual)
  const [fEstado, setFEstado] = useState("")
  const [fPago, setFPago] = useState("")
  const [fMaquina, setFMaquina] = useState("")
  const [limite, setLimite] = useState(POR_PAGINA)

  const anios = useMemo(() => [...new Set(lista.map((a) => a.inicio.slice(0, 4)))].sort().reverse(), [lista])
  const maquinas = useMemo(() => {
    const m = new Map()
    lista.forEach((a) => a.maquina && m.set(String(a.maquina_id), `${a.maquina.nombre} ${a.maquina.modelo ?? ""}`.trim()))
    return [...m].sort((a, b) => a[1].localeCompare(b[1]))
  }, [lista])

  const pagoDe = (a) => (a.pagado ? "pagado" : "pendiente")

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase()
    return lista.filter(
      (a) =>
        (!fAnio || a.inicio.startsWith(fAnio)) &&
        (!fEstado || a.estado === fEstado) &&
        (!fPago || pagoDe(a) === fPago) &&
        (!fMaquina || String(a.maquina_id) === fMaquina) &&
        (!t || `${a.cliente?.nombre} ${a.maquina?.nombre} ${a.servicio?.nombre} ${a.predio ?? ""} ${a.comuna ?? ""}`.toLowerCase().includes(t))
    )
  }, [lista, q, fAnio, fEstado, fPago, fMaquina])

  const filtrar = (setter) => (e) => { setter(e.target.value); setLimite(POR_PAGINA) }
  const suma = (arr) => arr.reduce((t, a) => t + (Number(a.monto) || 0), 0)
  const pagados = filtrados.filter((a) => pagoDe(a) === "pagado")
  const pendientes = filtrados.filter((a) => pagoDe(a) === "pendiente")
  const horas = filtrados.filter((a) => a.unidad === "horas").reduce((t, a) => t + Number(a.cantidad || 0), 0)
  const hectareas = filtrados.filter((a) => a.unidad !== "horas").reduce((t, a) => t + Number(a.cantidad || 0), 0)
  const hayFiltros = q || fAnio !== anioActual || fEstado || fPago || fMaquina

  return (
    <div style={s.container}>
      <div style={s.topBar}>
        <div>
          <h2 style={s.title}>Arriendos</h2>
          <p style={s.sub}>{filtrados.length} registros{fAnio ? ` en ${fAnio}` : ""}</p>
        </div>
        <button
                  style={s.btnCancel}
                  onClick={() =>
                    descargarCSV(`arriendos-${fAnio || "todos"}`, [
                      { titulo: "Cliente", valor: (a) => a.cliente?.nombre },
                      { titulo: "Máquina", valor: (a) => `${a.maquina?.nombre ?? ""} ${a.maquina?.modelo ?? ""}`.trim() },
                      { titulo: "Servicio", valor: (a) => a.servicio?.nombre },
                      { titulo: "Inicio", valor: (a) => fechaCL(a.inicio) },
                      { titulo: "Término", valor: (a) => fechaCL(a.fin) },
                      { titulo: "Cantidad", valor: (a) => String(a.cantidad ?? "").replace(".", ",") },
                      { titulo: "Unidad", valor: (a) => a.unidad },
                      { titulo: "Monto", valor: (a) => a.monto },
                      { titulo: "Pagado", valor: (a) => (a.pagado ? "Sí" : "No") },
                      { titulo: "Estado", valor: (a) => a.estado },
                      { titulo: "Predio", valor: (a) => a.predio },
                      { titulo: "Comuna", valor: (a) => a.comuna },
                    ], filtrados)
                  }
                >
            Exportar a Excel
          </button>
      </div>

      <div style={s.statsRow}>
        <Scorecard icono={CheckCircle} color="#065F46" bg="#D1FAE5" valor={clp(suma(pagados))} etiqueta="Pagado (neto)" detalle={`${pagados.length} arriendos`} />
        <Scorecard icono={Clock} color="#92400E" bg="#FEF3C7" valor={clp(suma(pendientes))} etiqueta="Por cobrar (neto)" detalle={`${pendientes.length} arriendos`} />
        <Scorecard icono={DollarSign} color="#4A6FA5" bg="#EBF2FB" valor={clp(suma(pagados) + suma(pendientes))} etiqueta="Total facturable" />
        <Scorecard icono={ClipboardList} color="#7C3AED" bg="#EDE9FE"
          valor={`${hectareas.toLocaleString("es-CL")} ha`} etiqueta="Trabajo realizado"
          detalle={`${horas.toLocaleString("es-CL")} horas`} />
      </div>

      <div style={s.filtros}>
        <div style={s.buscador}>
          <Search size={14} color="#94A3B8" />
          <input style={s.buscadorInput} placeholder="Buscar cliente, máquina, servicio o predio..." value={q} onChange={filtrar(setQ)} />
        </div>
        <select style={s.select} value={fAnio} onChange={filtrar(setFAnio)}>
          <option value="">Todos los años</option>
          {anios.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
        <select style={s.select} value={fEstado} onChange={filtrar(setFEstado)}>
          <option value="">Todos los estados</option>
          {Object.keys(ESTADO_ARRIENDO).map((e) => <option key={e}>{e}</option>)}
        </select>
        <select style={s.select} value={fPago} onChange={filtrar(setFPago)}>
          <option value="">Pago: todos</option>
          <option value="pagado">Pagados</option>
          <option value="pendiente">Por cobrar</option>
        </select>
        <select style={s.select} value={fMaquina} onChange={filtrar(setFMaquina)}>
          <option value="">Todas las máquinas</option>
          {maquinas.map(([id, nombre]) => <option key={id} value={id}>{nombre}</option>)}
        </select>
        {hayFiltros && (
          <button style={s.btnCancel} onClick={() => { setQ(""); setFAnio(anioActual); setFEstado(""); setFPago(""); setFMaquina(""); setLimite(POR_PAGINA) }}>
            Limpiar filtros
          </button>
        )}
      </div>

      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar} />

      {!cargando && !error && (
        <div style={s.tableCard}>
          <table style={s.table}>
            <thead>
              <tr>{["Cliente", "Máquina / Servicio", "Periodo", "Cantidad", "Monto neto", "Pago", "Estado"].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr>
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
                  <td style={{ ...s.td, fontWeight: 600 }}>
                    {clp(a.monto)}
                  </td>
                  <td style={s.td}>
                    <span style={{ ...s.badge, backgroundColor: a.pagado ? "#D1FAE5" : "#FEF3C7", color: a.pagado ? "#065F46" : "#92400E" }}>
                      {a.pagado ? "✓ Pagado" : "Pendiente"}
                    </span>
                  </td>
                  <td style={s.td}><span style={{ ...s.badge, ...ESTADO_ARRIENDO[a.estado] }}>{a.estado}</span></td>
                </tr>
              ))}
              {filtrados.length === 0 && <tr><td colSpan={7} style={s.vacio}>No hay arriendos con esos filtros.</td></tr>}
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
