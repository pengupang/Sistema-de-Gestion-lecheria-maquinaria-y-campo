import { useState } from "react"
import { potreros as api } from "@/services/lecheria"
import TarjetaFormulario, { Campo } from "@/components/TarjetaFormulario"
import s from "@/pages/estilosLecheria"
import { ESTADOS_POTRERO, TIPOS_PRADERA } from "@/pages/constantesLecheria"

const vacio = () => ({ nombre: "", superficie_ha: 0, tipo_pradera: TIPOS_PRADERA[0], estado: "disponible", capacidad: 0 })

// catalogo: { potreros } (para no repetir nombres)
export default function FormPotrero({ inicial, catalogo, onGuardado, onCancel }) {
  const { potreros = [] } = catalogo ?? {}
  const [form, setForm] = useState(() => ({ ...vacio(), ...inicial }))
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const editando = Boolean(form.id)
  const campo = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const guardar = async () => {
    const nombre = form.nombre.trim()
    if (!nombre) return setError("El nombre del potrero es obligatorio")
    if (potreros.some((p) => p.nombre.toLowerCase() === nombre.toLowerCase() && p.id !== form.id))
      return setError("Ya existe un potrero con ese nombre")
    if (Number(form.superficie_ha) < 0 || Number(form.capacidad) < 0)
      return setError("Superficie y capacidad no pueden ser negativas")
    const payload = {
      nombre,
      superficie_ha: Number(form.superficie_ha) || 0,
      tipo_pradera: form.tipo_pradera,
      estado: form.estado,
      capacidad: Number(form.capacidad) || 0,
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
      titulo={editando ? "Editar potrero" : "Nuevo potrero"}
      onSave={guardar} onCancel={onCancel} error={error} guardando={guardando}
    >
      <Campo label="Nombre" full><input style={s.input} value={form.nombre} onChange={(e) => campo("nombre", e.target.value)} /></Campo>
      <Campo label="Superficie (ha)"><input style={s.input} type="number" min="0" step="0.1" value={form.superficie_ha} onChange={(e) => campo("superficie_ha", e.target.value)} /></Campo>
      <Campo label="Capacidad (animales)"><input style={s.input} type="number" min="0" value={form.capacidad} onChange={(e) => campo("capacidad", e.target.value)} /></Campo>
      <Campo label="Tipo de pradera">
        <select style={s.input} value={form.tipo_pradera} onChange={(e) => campo("tipo_pradera", e.target.value)}>
          {TIPOS_PRADERA.map((t) => <option key={t}>{t}</option>)}
        </select>
      </Campo>
      <Campo label="Estado">
        <select style={s.input} value={form.estado} onChange={(e) => campo("estado", e.target.value)}>
          {Object.entries(ESTADOS_POTRERO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
        </select>
      </Campo>
    </TarjetaFormulario>
  )
}
