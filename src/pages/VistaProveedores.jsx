import { useCallback, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Pencil, Plus, Phone, Mail, Search, Truck, Tags, Wallet, Award } from "lucide-react"
import Scorecard from "../components/maquinaria/Scorecard"
import { clp } from "../lib/formato"
import { proveedores as api, insumos as insumosApi, gastos as gastosApi } from "../services/lecheria"
import useCarga from "../lib/useCarga"
import EstadoCarga from "../components/EstadoCarga"
import s from "./estilosLecheria"
import tw from "@/lib/ui"

const link = { display: "inline-flex", alignItems: "center", gap: 4, color: "#3D6B4F", textDecoration: "none", fontSize: 13 }

// Vista de solo lectura. Crear, editar y eliminar: /lecheria/registrar?tipo=proveedor
export default function VistaProveedores() {
  const navigate = useNavigate()
  const cargarTodo = useCallback(async () => {
    const [proveedores, insumos, gastos] = await Promise.all([api.listar(), insumosApi.listar(), gastosApi.listar()])
    return { proveedores, insumos, gastos }
  }, [])
  const { datos, cargando, error, recargar } = useCarga(cargarTodo, { proveedores: [], insumos: [], gastos: [] })
  const { proveedores, insumos, gastos } = datos
  const anioActual = String(new Date().getFullYear())

  // Gasto del año por proveedor y productos que abastece cada uno
  const resumen = useMemo(() => {
    const gasto = new Map(), productos = new Map()
    for (const g of gastos)
      if (g.proveedor_id && g.fecha?.startsWith(anioActual)) gasto.set(g.proveedor_id, (gasto.get(g.proveedor_id) ?? 0) + (Number(g.monto) || 0))
    for (const i of insumos) if (i.proveedor_id) productos.set(i.proveedor_id, (productos.get(i.proveedor_id) ?? 0) + 1)
    let principal = null
    for (const [id, monto] of gasto) if (!principal || monto > principal.monto) principal = { id, monto }
    return { gasto, productos, principal, totalAnio: [...gasto.values()].reduce((a, b) => a + b, 0) }
  }, [gastos, insumos, anioActual])
  const rubros = new Set(proveedores.map((p) => p.rubro).filter(Boolean)).size
  const principal = resumen.principal && proveedores.find((p) => p.id === resumen.principal.id)
  const [q, setQ] = useState("")

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase()
    return proveedores.filter((p) => !t || `${p.nombre} ${p.rut} ${p.contacto} ${p.rubro} ${p.comuna ?? ""}`.toLowerCase().includes(t))
  }, [proveedores, q])

  return (
    <div className={tw.container}>
      <div className={tw.topBar}>
        <div>
          <h2 style={s.title}>Proveedores</h2>
          <p style={s.sub}>{proveedores.length} proveedores registrados</p>
        </div>
        <button style={s.btnAdd} onClick={() => navigate("/lecheria/registrar?tipo=proveedor")}>
          <Plus size={15} /> Registrar proveedor
        </button>
      </div>

      <div className={tw.statsRow}>
        <Scorecard icono={Truck} color="#3D6B4F" bg="#D1FAE5" valor={proveedores.length} etiqueta="Proveedores registrados" />
        <Scorecard icono={Tags} color="#7C3AED" bg="#EDE9FE" valor={rubros} etiqueta="Rubros distintos" />
        <Scorecard icono={Wallet} color="#1E40AF" bg="#DBEAFE" valor={clp(resumen.totalAnio)} etiqueta={`Comprado en ${anioActual}`} detalle="gastos con proveedor asignado" />
        <Scorecard icono={Award} color="#92400E" bg="#FEF3C7" valor={principal ? principal.nombre : "—"} etiqueta="Proveedor principal del año"
          detalle={principal ? clp(resumen.principal.monto) : null} />
      </div>

      <div className={tw.filtros}>
        <div className={tw.buscador}>
          <Search size={14} color="#94A3B8" />
          <input className={tw.buscadorInput} placeholder="Buscar empresa, RUT o rubro..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar} />

      {!cargando && !error && (
        <div className={tw.tableCard}>
          <table className={tw.table}>
            <thead>
              <tr>{["Empresa", "RUT", "Contacto", "Teléfono", "Email", "Rubro", "Productos", `Gasto ${anioActual}`, ""].map((h) => <th key={h} className={tw.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtrados.map((p, i) => (
                <tr key={p.id} style={{ backgroundColor: i % 2 === 0 ? "#F8FAFC" : "#fff" }}>
                  <td className={tw.td}><span style={s.nombre}>{p.nombre}</span>{p.comuna && <span style={{ display: "block", fontSize: 11, color: "#94A3B8" }}>{p.comuna}</span>}</td>
                  <td className={tw.td}>{p.rut}</td>
                  <td className={tw.td}>{p.contacto}</td>
                  <td className={tw.td}>{p.telefono && <a href={`tel:${p.telefono.replace(/\s/g, "")}`} style={link}><Phone size={12} /> {p.telefono}</a>}</td>
                  <td className={tw.td}>{p.email && <a href={`mailto:${p.email}`} style={link}><Mail size={12} /> {p.email}</a>}</td>
                  <td className={tw.td}>{p.rubro}</td>
                  <td className={tw.td}>{resumen.productos.get(p.id) ?? 0}</td>
                  <td className={tw.td}>{resumen.gasto.has(p.id) ? clp(resumen.gasto.get(p.id)) : "—"}</td>
                  <td className={tw.td}>
                    <button style={s.iconBtnGreen} title="Editar en Registrar" onClick={() => navigate(`/lecheria/registrar?tipo=proveedor&id=${p.id}`)}><Pencil size={14} /></button>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && <tr><td colSpan={9} style={s.vacio}>No hay proveedores que coincidan.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
