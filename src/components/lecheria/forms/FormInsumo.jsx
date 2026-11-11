import { useMemo, useState } from "react"
import { insumos as api } from "@/services/lecheria"
import TarjetaFormulario, { Campo } from "@/components/TarjetaFormulario"
import s from "@/pages/estilosLecheria"
import { UNIDADES_BASE, idONull } from "@/pages/constantesLecheria"

const vacio = () => ({ nombre: "", stock: 0, minimo: 0, unidad: "kg", proveedor_id: "", precio: 0, categoria: "" })

// catalogo: { proveedores, insumos }
export default function FormInsumo({ inicial, catalogo, onGuardado, onCancel }) {
  const { proveedores = [], insumos = [] } = catalogo ?? {}
  const [form, setForm] = useState(() => ({
    ...vacio(), ...inicial,
    proveedor_id: inicial?.proveedor_id ?? "", categoria: inicial?.categoria ?? "",
  }))
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const editando = Boolean(form.id)
  const campo = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const categorias = useMemo(() => [...new Set(insumos.map((i) => i.categoria).filter(Boolean))].sort(), [insumos])
  const unidades = useMemo(() => [...new Set([...UNIDADES_BASE, ...insumos.map((i) => i.unidad).filter(Boolean)])], [insumos])

  const guardar = async () => {
    if (!form.nombre.trim()) return setError("El nombre es obligatorio")
    if (Number(form.stock) < 0 || Number(form.minimo) < 0 || Number(form.precio) < 0)
      return setError("Stock, mínimo y precio no pueden ser negativos")
    const payload = {
      nombre: form.nombre.trim(),
      stock: Number(form.stock) || 0,
      minimo: Number(form.minimo) || 0,
      unidad: form.unidad,
      proveedor_id: idONull(form.proveedor_id),
      precio: Math.round(Number(form.precio) || 0),
      categoria: form.categoria?.trim() || null,
    }
    try {
      setGuardando(true)
      setError(null)
      if (editando) await api.actualizar(form.id, payload)
      else { await api.crear(payload); setForm(vacio()) }
      await onGuardado?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <TarjetaFormulario
      titulo={editando ? "Editar producto" : "Nuevo producto"}
      subtitulo="Alimentos e insumos del inventario de la lechería."
      onSave={guardar} onCancel={onCancel} error={error} guardando={guardando}
    >
      <Campo label="Nombre" full><input style={s.input} value={form.nombre} onChange={(e) => campo("nombre", e.target.value)} /></Campo>
      <Campo label="Categoría">
        <input style={s.input} list="categorias-insumo" value={form.categoria} onChange={(e) => campo("categoria", e.target.value)} />
        <datalist id="categorias-insumo">{categorias.map((c) => <option key={c} value={c} />)}</datalist>
      </Campo>
      <Campo label="Unidad">
        <select style={s.input} value={form.unidad} onChange={(e) => campo("unidad", e.target.value)}>
          {unidades.map((u) => <option key={u}>{u}</option>)}
        </select>
      </Campo>
      <Campo label="Stock actual"><input style={s.input} type="number" min="0" step="any" value={form.stock} onChange={(e) => campo("stock", e.target.value)} /></Campo>
      <Campo label="Stock mínimo (alerta)"><input style={s.input} type="number" min="0" step="any" value={form.minimo} onChange={(e) => campo("minimo", e.target.value)} /></Campo>
      <Campo label="Proveedor">
        <select style={s.input} value={form.proveedor_id} onChange={(e) => campo("proveedor_id", e.target.value)}>
          <option value="">Sin proveedor</option>
          {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Campo>
      <Campo label="Precio unitario (CLP)"><input style={s.input} type="number" min="0" value={form.precio} onChange={(e) => campo("precio", e.target.value)} /></Campo>
    </TarjetaFormulario>
  )
}
