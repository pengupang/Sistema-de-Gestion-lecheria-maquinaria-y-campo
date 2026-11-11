import { useCallback, useMemo, useState } from "react"
import { Phone, Mail, Search, Users, UserX, CalendarCheck, Clock } from "lucide-react"
import { clientes as api, arriendos as arriendosApi } from "@/services/maquinaria"
import useCarga from "@/lib/useCarga"
import { clp } from "@/lib/formato"
import EstadoCarga from "@/components/EstadoCarga"
import Scorecard from "@/components/maquinaria/Scorecard"
import { TIPOS_CLIENTE } from "@/components/maquinaria/forms/FormCliente"
import s from "./EstilosMaquinaria"
import tw from "@/lib/ui"

// Vista de solo lectura. Ingreso y edición: /maquinaria/registrar?tipo=cliente (desde el menú "Registrar")
export default function VistaClientes() {
  const cargarTodo = useCallback(async () => {
    const [clientes, arriendos] = await Promise.all([api.listar(), arriendosApi.listar()])
    return { clientes, arriendos }
  }, [])
  const { datos, cargando, error, recargar } = useCarga(cargarTodo, { clientes: [], arriendos: [] })
  const { clientes, arriendos } = datos

  const anio = String(new Date().getFullYear())
  const [q, setQ] = useState("")
  const [fEstado, setFEstado] = useState("activos")
  const [fTipo, setFTipo] = useState("")
  const [orden, setOrden] = useState("nombre")

  // Por cliente: arriendos del año y monto por cobrar (todos los años)
  const resumen = useMemo(() => {
    const r = {}
    for (const a of arriendos) {
      const c = (r[a.cliente_id] ??= { anio: 0, porCobrar: 0 })
      if (a.inicio?.startsWith(anio)) c.anio += 1
      if (!a.pagado) c.porCobrar += Number(a.monto) || 0
    }
    return r
  }, [arriendos, anio])

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase()
    const r = clientes.filter(
      (c) =>
        (fEstado === "todos" || (fEstado === "activos" ? c.activo : !c.activo)) &&
        (!fTipo || c.tipo === fTipo) &&
        (!t || `${c.nombre} ${c.rut} ${c.comuna ?? ""} ${c.email ?? ""}`.toLowerCase().includes(t))
    )
    const val = (c, k) => resumen[c.id]?.[k] ?? 0
    return [...r].sort((a, b) =>
      orden === "porCobrar" ? val(b, "porCobrar") - val(a, "porCobrar")
        : orden === "arriendos" ? val(b, "anio") - val(a, "anio")
          : a.nombre.localeCompare(b.nombre))
  }, [clientes, q, fEstado, fTipo, orden, resumen])

  const activos = clientes.filter((c) => c.activo).length
  const conArriendos = clientes.filter((c) => resumen[c.id]?.anio).length
  const totalPorCobrar = Object.values(resumen).reduce((t, c) => t + c.porCobrar, 0)
  const conDeuda = Object.values(resumen).filter((c) => c.porCobrar > 0).length

  return (
    <div className={tw.container}>
      <div className={tw.topBar}>
        <div>
          <h2 style={s.title}>Clientes</h2>
          <p style={s.sub}>{filtrados.length} de {clientes.length} clientes</p>
        </div>
      </div>

      <div className={tw.statsRow}>
        <Scorecard icono={Users} color="#4A6FA5" bg="#EBF2FB" valor={activos} etiqueta="Clientes activos" />
        <Scorecard icono={UserX} color="#64748B" bg="#F1F5F9" valor={clientes.length - activos} etiqueta="Inactivos" />
        <Scorecard icono={CalendarCheck} color="#065F46" bg="#D1FAE5" valor={conArriendos} etiqueta={`Con arriendos en ${anio}`} />
        <Scorecard icono={Clock} color="#92400E" bg="#FEF3C7" valor={clp(totalPorCobrar)} etiqueta="Por cobrar" detalle={`${conDeuda} clientes`} />
      </div>

      <div className={tw.filtros}>
        <div className={tw.buscador}>
          <Search size={14} color="#94A3B8" />
          <input className={tw.buscadorInput} placeholder="Buscar nombre, RUT, comuna o email..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select style={s.select} value={fEstado} onChange={(e) => setFEstado(e.target.value)}>
          <option value="activos">Activos</option>
          <option value="inactivos">Inactivos</option>
          <option value="todos">Todos</option>
        </select>
        <select style={s.select} value={fTipo} onChange={(e) => setFTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          {TIPOS_CLIENTE.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select style={s.select} value={orden} onChange={(e) => setOrden(e.target.value)}>
          <option value="nombre">Ordenar: nombre</option>
          <option value="arriendos">Ordenar: más arriendos</option>
          <option value="porCobrar">Ordenar: mayor deuda</option>
        </select>
      </div>

      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar} />

      {!cargando && !error && (
        <div className={tw.tableCard}>
          <table className={tw.table}>
            <thead>
              <tr>{["Nombre / RUT", "Contacto", "Comuna", "Tipo", `Arriendos ${anio}`, "Por cobrar", "Estado"].map((h) => <th key={h} className={tw.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtrados.map((c, i) => {
                const r = resumen[c.id]
                return (
                  <tr key={c.id} style={{ backgroundColor: i % 2 === 0 ? "#F8FAFC" : "#fff" }}>
                    <td className={tw.td}><span style={s.nombre}>{c.nombre}</span><span style={s.rutTxt}>{c.rut}</span></td>
                    <td className={tw.td}>
                      {c.telefono_txt && <a href={`tel:${c.telefono_txt.replace(/\s/g, "")}`} style={{ ...s.link, display: "flex" }}><Phone size={12} />{c.telefono_txt}</a>}
                      {c.email && <a href={`mailto:${c.email}`} style={{ ...s.link, display: "flex" }}><Mail size={12} />{c.email}</a>}
                    </td>
                    <td className={tw.td}>{c.comuna || "—"}</td>
                    <td className={tw.td}>{c.tipo}</td>
                    <td className={tw.td}>{r?.anio ?? 0}</td>
                    <td className={tw.td}>
                      {r?.porCobrar ? <span style={{ fontWeight: 600, color: "#92400E" }}>{clp(r.porCobrar)}</span> : "—"}
                    </td>
                    <td className={tw.td}>
                      <span style={{ ...s.badge, backgroundColor: c.activo ? "#D1FAE5" : "#F1F5F9", color: c.activo ? "#065F46" : "#64748B" }}>
                        {c.activo ? "Activo" : "Inactivo"}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {filtrados.length === 0 && <tr><td colSpan={7} style={s.vacio}>No hay clientes que coincidan.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
