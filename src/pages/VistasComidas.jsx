import { useCallback, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Pencil, Plus, AlertTriangle, Search } from "lucide-react"
import { insumos as api, proveedores as proveedoresApi } from "../services/lecheria"
import useCarga from "../lib/useCarga"
import { clp } from "../lib/formato"
import EstadoCarga from "../components/EstadoCarga"
import s from "./estilosLecheria"
import tw from "@/lib/ui"
import { estadoStock } from "./constantesLecheria"

// Vista de solo lectura. Crear, editar y eliminar: /lecheria/registrar?tipo=insumo
export default function VistaComidas() {
  const navigate = useNavigate()
  const cargarTodo = useCallback(async () => {
    const [items, proveedores] = await Promise.all([api.listar(), proveedoresApi.listar()])
    return { items, proveedores }
  }, [])
  const { datos, cargando, error, recargar } = useCarga(cargarTodo, { items: [], proveedores: [] })
  const { items, proveedores } = datos

  const [q, setQ] = useState("")
  const [fCategoria, setFCategoria] = useState("")
  const [soloAlertas, setSoloAlertas] = useState(false)

  const nombreProveedor = (id) => proveedores.find((p) => p.id === id)?.nombre ?? "—"
  const categorias = useMemo(() => [...new Set(items.map((i) => i.categoria).filter(Boolean))].sort(), [items])

  const alertas = items.filter((i) => Number(i.stock) <= Number(i.minimo))
  const filtrados = items.filter((i) => {
    const t = q.trim().toLowerCase()
    return (!t || i.nombre.toLowerCase().includes(t)) && (!fCategoria || i.categoria === fCategoria) && (!soloAlertas || Number(i.stock) <= Number(i.minimo))
  })

  return (
    <div className={tw.container}>
      <div className={tw.topBar}>
        <div>
          <h2 style={s.title}>Comidas y Alimentos</h2>
          <p style={s.sub}>{items.length} productos · {alertas.length} alertas de stock</p>
        </div>
        <button style={s.btnAdd} onClick={() => navigate("/lecheria/registrar?tipo=insumo")}>
          <Plus size={15} /> Registrar producto
        </button>
      </div>

      {alertas.length > 0 && (
        <div style={s.alertBox}>
          <AlertTriangle size={16} color="#D97706" />
          <span>
            <strong>{alertas.length} producto(s)</strong> con stock bajo o sin stock: {alertas.slice(0, 6).map((a) => a.nombre).join(", ")}
            {alertas.length > 6 ? `… y ${alertas.length - 6} más` : ""}
          </span>
        </div>
      )}

      <div className={tw.filtros}>
        <div className={tw.buscador}>
          <Search size={14} color="#94A3B8" />
          <input className={tw.buscadorInput} placeholder="Buscar producto..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select style={s.select} value={fCategoria} onChange={(e) => setFCategoria(e.target.value)}>
          <option value="">Todas las categorías</option>
          {categorias.map((c) => <option key={c}>{c}</option>)}
        </select>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748B" }}>
          <input type="checkbox" checked={soloAlertas} onChange={(e) => setSoloAlertas(e.target.checked)} /> Solo alertas
        </label>
      </div>

      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar} />

      {!cargando && !error && (
        <div className={tw.tableCard}>
          <table className={tw.table}>
            <thead>
              <tr>{["Producto", "Stock actual", "Mínimo", "Unidad", "Proveedor", "Precio unit.", "Estado", ""].map((h) => <th key={h} className={tw.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtrados.map((item, i) => {
                const st = estadoStock(item.stock, item.minimo)
                return (
                  <tr key={item.id} style={{ backgroundColor: i % 2 === 0 ? "#F8FAFC" : "#fff" }}>
                    <td className={tw.td}><span style={s.nombre}>{item.nombre}</span>{item.categoria && <span style={{ display: "block", fontSize: 11, color: "#94A3B8" }}>{item.categoria}</span>}</td>
                    <td className={tw.td}><span style={{ fontWeight: 600, color: Number(item.stock) === 0 ? "#EF4444" : "#1E293B" }}>{Number(item.stock).toLocaleString("es-CL")}</span></td>
                    <td className={tw.td}>{Number(item.minimo).toLocaleString("es-CL")}</td>
                    <td className={tw.td}>{item.unidad}</td>
                    <td className={tw.td}>{nombreProveedor(item.proveedor_id)}</td>
                    <td className={tw.td}>{clp(item.precio)}</td>
                    <td className={tw.td}><span style={{ ...s.badge, backgroundColor: st.bg, color: st.color }}>{st.label}</span></td>
                    <td className={tw.td}>
                      <button style={s.iconBtnGreen} title="Editar en Registrar" onClick={() => navigate(`/lecheria/registrar?tipo=insumo&id=${item.id}`)}><Pencil size={14} /></button>
                    </td>
                  </tr>
                )
              })}
              {filtrados.length === 0 && <tr><td colSpan={8} style={s.vacio}>No hay productos que coincidan.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
