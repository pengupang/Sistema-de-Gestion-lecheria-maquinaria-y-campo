import { useCallback, useMemo, useState } from "react"
import { Pencil, Trash2, Plus, AlertTriangle, Search } from "lucide-react"
import { insumos as api, proveedores as proveedoresApi } from "../services/lecheria"
import useCarga from "../lib/useCarga"
import { clp } from "../lib/formato"
import EstadoCarga from "../components/EstadoCarga"
import ModalLecheria, { Campo } from "../components/ModalLecheria"
import s from "./estilosLecheria"
import tw from "@/lib/ui"

const UNIDADES_BASE = ["kg", "litros", "sacos", "fardos", "pacas", "toneladas", "dosis", "frascos", "unidades", "cajas"]
const vacio = { nombre: "", stock: 0, minimo: 0, unidad: "kg", proveedor_id: "", precio: 0, categoria: "" }

const getStockStatus = (stock, minimo) => {
  if (Number(stock) === 0) return { bg: "#FEE2E2", color: "#991B1B", label: "Sin stock" }
  if (Number(stock) <= Number(minimo)) return { bg: "#FEF3C7", color: "#92400E", label: "Stock bajo" }
  return { bg: "#D1FAE5", color: "#065F46", label: "OK" }
}

export default function VistaComidas() {
  const cargarTodo = useCallback(async () => {
    const [items, proveedores] = await Promise.all([api.listar(), proveedoresApi.listar()])
    return { items, proveedores }
  }, [])
  const { datos, cargando, error, setError, recargar } = useCarga(cargarTodo, { items: [], proveedores: [] })
  const { items, proveedores } = datos

  const [q, setQ] = useState("")
  const [fCategoria, setFCategoria] = useState("")
  const [soloAlertas, setSoloAlertas] = useState(false)
  const [modal, setModal] = useState(null)
  const [modalError, setModalError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const campo = (k, v) => setModal((m) => ({ ...m, [k]: v }))
  const nombreProveedor = (id) => proveedores.find((p) => p.id === id)?.nombre ?? "—"
  const categorias = useMemo(() => [...new Set(items.map((i) => i.categoria).filter(Boolean))].sort(), [items])
  const unidades = useMemo(() => [...new Set([...UNIDADES_BASE, ...items.map((i) => i.unidad)])], [items])

  const alertas = items.filter((i) => Number(i.stock) <= Number(i.minimo))
  const filtrados = items.filter((i) => {
    const t = q.trim().toLowerCase()
    return (!t || i.nombre.toLowerCase().includes(t)) && (!fCategoria || i.categoria === fCategoria) && (!soloAlertas || Number(i.stock) <= Number(i.minimo))
  })

  const guardar = async () => {
    if (!modal.nombre.trim()) return setModalError("El nombre es obligatorio")
    if (Number(modal.stock) < 0 || Number(modal.minimo) < 0 || Number(modal.precio) < 0)
      return setModalError("Stock, mínimo y precio no pueden ser negativos")
    const payload = {
      nombre: modal.nombre.trim(),
      stock: Number(modal.stock) || 0,
      minimo: Number(modal.minimo) || 0,
      unidad: modal.unidad,
      proveedor_id: modal.proveedor_id === "" || modal.proveedor_id === null ? null : Number(modal.proveedor_id),
      precio: Math.round(Number(modal.precio) || 0),
      categoria: modal.categoria?.trim() || null,
    }
    try {
      setGuardando(true)
      setModalError(null)
      if (modal.id) await api.actualizar(modal.id, payload)
      else await api.crear(payload)
      setModal(null)
      await recargar()
    } catch (e) {
      setModalError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (i) => {
    if (!window.confirm(`¿Eliminar "${i.nombre}"?`)) return
    try { await api.eliminar(i.id); await recargar() } catch (e) { setError(e.message) }
  }

  return (
    <div className={tw.container}>
      <div className={tw.topBar}>
        <div>
          <h2 style={s.title}>Comidas y Alimentos</h2>
          <p style={s.sub}>{items.length} productos · {alertas.length} alertas de stock</p>
        </div>
        <button style={s.btnAdd} onClick={() => { setModalError(null); setModal({ ...vacio }) }}>
          <Plus size={15} /> Agregar producto
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
                const st = getStockStatus(item.stock, item.minimo)
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
                      <div className={tw.actions}>
                        <button style={s.iconBtnGreen} title="Editar" onClick={() => { setModalError(null); setModal({ ...item, proveedor_id: item.proveedor_id ?? "", categoria: item.categoria ?? "" }) }}><Pencil size={14} /></button>
                        <button style={s.iconBtnRed} title="Eliminar" onClick={() => eliminar(item)}><Trash2 size={14} /></button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filtrados.length === 0 && <tr><td colSpan={8} style={s.vacio}>No hay productos que coincidan.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <ModalLecheria titulo={modal.id ? "Editar producto" : "Nuevo producto"} onClose={() => setModal(null)} onSave={guardar} error={modalError} guardando={guardando}>
          <Campo label="Nombre" full><input style={s.input} value={modal.nombre} onChange={(e) => campo("nombre", e.target.value)} /></Campo>
          <Campo label="Categoría"><input style={s.input} list="categorias-insumo" value={modal.categoria} onChange={(e) => campo("categoria", e.target.value)} />
            <datalist id="categorias-insumo">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
          </Campo>
          <Campo label="Unidad">
            <select style={s.input} value={modal.unidad} onChange={(e) => campo("unidad", e.target.value)}>
              {unidades.map((u) => <option key={u}>{u}</option>)}
            </select>
          </Campo>
          <Campo label="Stock actual"><input style={s.input} type="number" min="0" step="any" value={modal.stock} onChange={(e) => campo("stock", e.target.value)} /></Campo>
          <Campo label="Stock mínimo"><input style={s.input} type="number" min="0" step="any" value={modal.minimo} onChange={(e) => campo("minimo", e.target.value)} /></Campo>
          <Campo label="Proveedor">
            <select style={s.input} value={modal.proveedor_id} onChange={(e) => campo("proveedor_id", e.target.value)}>
              <option value="">Sin proveedor</option>
              {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Campo>
          <Campo label="Precio unitario (CLP)"><input style={s.input} type="number" min="0" value={modal.precio} onChange={(e) => campo("precio", e.target.value)} /></Campo>
        </ModalLecheria>
      )}
    </div>
  )
}