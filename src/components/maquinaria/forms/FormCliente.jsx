import { useState } from "react"
import { clientes as api } from "@/services/maquinaria"
import { validarRut, formatearRut } from "@/lib/auth"
import TarjetaFormulario, { Campo } from "@/components/TarjetaFormulario"
import s, { AZUL } from "@/pages/EstilosMaquinaria"

export const TIPOS_CLIENTE = ["Agrícola", "Lechería", "Mixto"]
const vacio = { nombre: "", rut: "", telefono_txt: "", email: "", direccion: "", comuna: "", tipo: "Agrícola", activo: true }

export default function FormCliente({ inicial, onGuardado, onCancel }) {
  const [form, setForm] = useState({ ...vacio, ...inicial, rut: inicial?.rut || "" })
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const campo = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const guardar = async () => {
    if (!form.nombre.trim()) return setError("El nombre es obligatorio")
    if (form.rut.trim() && !validarRut(form.rut)) return setError("El RUT no es válido")
    try {
      setGuardando(true)
      setError(null)
      if (form.id) await api.actualizar(form.id, form)
      else await api.crear(form)
      if (!form.id) setForm({ ...vacio })
      await onGuardado?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <TarjetaFormulario
      titulo={form.id ? `Editar cliente: ${form.nombre}` : "Nuevo cliente"}
      color={AZUL}
      onSave={guardar}
      onCancel={onCancel}
      error={error}
      guardando={guardando}
    >
      <Campo label="Nombre / Empresa" full><input style={s.input} value={form.nombre} onChange={(e) => campo("nombre", e.target.value)} /></Campo>
      <Campo label="RUT"><input style={s.input} value={form.rut} onChange={(e) => campo("rut", formatearRut(e.target.value))} placeholder="12.345.678-5" /></Campo>
      <Campo label="Teléfono"><input style={s.input} value={form.telefono_txt ?? ""} onChange={(e) => campo("telefono_txt", e.target.value)} placeholder="+56 9 1234 5678" /></Campo>
      <Campo label="Email" full><input style={s.input} type="email" value={form.email ?? ""} onChange={(e) => campo("email", e.target.value)} /></Campo>
      <Campo label="Dirección" full><input style={s.input} value={form.direccion ?? ""} onChange={(e) => campo("direccion", e.target.value)} /></Campo>
      <Campo label="Comuna"><input style={s.input} value={form.comuna ?? ""} onChange={(e) => campo("comuna", e.target.value)} /></Campo>
      <Campo label="Tipo">
        <select style={s.input} value={form.tipo ?? "Agrícola"} onChange={(e) => campo("tipo", e.target.value)}>
          {TIPOS_CLIENTE.map((t) => <option key={t}>{t}</option>)}
        </select>
      </Campo>
      <Campo label="Estado">
        <select style={s.input} value={String(form.activo)} onChange={(e) => campo("activo", e.target.value === "true")}>
          <option value="true">Activo</option>
          <option value="false">Inactivo</option>
        </select>
      </Campo>
    </TarjetaFormulario>
  )
}
