import { useState } from "react"
import { proveedores as api } from "@/services/lecheria"
import { validarRut, formatearRut } from "@/lib/auth"
import TarjetaFormulario, { Campo } from "@/components/TarjetaFormulario"
import s from "@/pages/estilosLecheria"

const vacio = () => ({ nombre: "", rut: "", contacto: "", telefono: "", email: "", rubro: "", comuna: "" })

export default function FormProveedor({ inicial, onGuardado, onCancel }) {
  const [form, setForm] = useState(() => {
    const f = { ...vacio(), ...inicial }
    for (const k of Object.keys(vacio())) f[k] = f[k] ?? ""
    return f
  })
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const editando = Boolean(form.id)
  const campo = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const guardar = async () => {
    if (!form.nombre.trim()) return setError("El nombre es obligatorio")
    if (!form.rut.trim()) return setError("El RUT es obligatorio")
    if (!validarRut(form.rut)) return setError("El RUT no es válido")
    const payload = {
      nombre: form.nombre.trim(),
      rut: formatearRut(form.rut),
      contacto: form.contacto.trim(),
      telefono: form.telefono.trim(),
      email: form.email.trim(),
      rubro: form.rubro.trim(),
      comuna: form.comuna.trim() || null,
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
      titulo={editando ? "Editar proveedor" : "Nuevo proveedor"}
      onSave={guardar} onCancel={onCancel} error={error} guardando={guardando}
    >
      <Campo label="Nombre empresa" full><input style={s.input} value={form.nombre} onChange={(e) => campo("nombre", e.target.value)} /></Campo>
      <Campo label="RUT"><input style={s.input} value={form.rut} onChange={(e) => campo("rut", formatearRut(e.target.value))} placeholder="76.123.456-7" /></Campo>
      <Campo label="Rubro"><input style={s.input} value={form.rubro} onChange={(e) => campo("rubro", e.target.value)} /></Campo>
      <Campo label="Contacto"><input style={s.input} value={form.contacto} onChange={(e) => campo("contacto", e.target.value)} /></Campo>
      <Campo label="Teléfono"><input style={s.input} value={form.telefono} onChange={(e) => campo("telefono", e.target.value)} placeholder="+56 9 1234 5678" /></Campo>
      <Campo label="Email"><input style={s.input} type="email" value={form.email} onChange={(e) => campo("email", e.target.value)} /></Campo>
      <Campo label="Comuna"><input style={s.input} value={form.comuna} onChange={(e) => campo("comuna", e.target.value)} /></Campo>
    </TarjetaFormulario>
  )
}
