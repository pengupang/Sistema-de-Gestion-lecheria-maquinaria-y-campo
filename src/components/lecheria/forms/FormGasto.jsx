import { useState } from "react"
import { gastos as api, hoyISO } from "@/services/lecheria"
import TarjetaFormulario, { Campo } from "@/components/TarjetaFormulario"
import s from "@/pages/estilosLecheria"
import { CATEGORIAS_GASTO, idONull } from "@/pages/constantesLecheria"

const vacio = () => ({ fecha: hoyISO(), categoria: CATEGORIAS_GASTO[0], descripcion: "", monto: 0, proveedor_id: "", documento: "" })

// catalogo: { proveedores }
export default function FormGasto({ inicial, catalogo, onGuardado, onCancel }) {
  const { proveedores = [] } = catalogo ?? {}
  const [form, setForm] = useState(() => ({
    ...vacio(), ...inicial,
    proveedor_id: inicial?.proveedor_id ?? "", documento: inicial?.documento ?? "",
  }))
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const editando = Boolean(form.id)
  const campo = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const guardar = async () => {
    if (!form.fecha) return setError("Indica la fecha")
    if (!form.descripcion.trim()) return setError("La descripción es obligatoria")
    if (!(Number(form.monto) >= 0)) return setError("El monto no puede ser negativo")
    const payload = {
      fecha: form.fecha,
      categoria: form.categoria,
      descripcion: form.descripcion.trim(),
      monto: Math.round(Number(form.monto) || 0),
      proveedor_id: idONull(form.proveedor_id),
      documento: form.documento.trim() || null,
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
      titulo={editando ? "Editar gasto" : "Nuevo gasto"}
      onSave={guardar} onCancel={onCancel} error={error} guardando={guardando}
    >
      <Campo label="Fecha"><input style={s.input} type="date" value={form.fecha} onChange={(e) => campo("fecha", e.target.value)} /></Campo>
      <Campo label="Categoría">
        <select style={s.input} value={form.categoria} onChange={(e) => campo("categoria", e.target.value)}>
          {CATEGORIAS_GASTO.map((c) => <option key={c}>{c}</option>)}
        </select>
      </Campo>
      <Campo label="Descripción" full><input style={s.input} value={form.descripcion} onChange={(e) => campo("descripcion", e.target.value)} /></Campo>
      <Campo label="Monto (CLP)"><input style={s.input} type="number" min="0" value={form.monto} onChange={(e) => campo("monto", e.target.value)} /></Campo>
      <Campo label="N° documento"><input style={s.input} value={form.documento} onChange={(e) => campo("documento", e.target.value)} placeholder="Factura o boleta" /></Campo>
      <Campo label="Proveedor" full>
        <select style={s.input} value={form.proveedor_id} onChange={(e) => campo("proveedor_id", e.target.value)}>
          <option value="">Sin proveedor</option>
          {proveedores.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Campo>
    </TarjetaFormulario>
  )
}
