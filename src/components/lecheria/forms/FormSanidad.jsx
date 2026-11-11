import { useState } from "react"
import { sanidad as api, etiquetaAnimal, hoyISO } from "@/services/lecheria"
import TarjetaFormulario, { Campo } from "@/components/TarjetaFormulario"
import s from "@/pages/estilosLecheria"
import { TIPOS_EVENTO } from "@/pages/constantesLecheria"

const vacio = () => ({
  animal_id: "", tipo: "Vacunación", producto: "", fecha: hoyISO(), proximo_control: "",
  costo: 0, responsable: "", estado: "pendiente", nota: "",
})

// Registro sanitario (vacunas, tratamientos, controles). Aparece también en el Calendario de Animales.
// catalogo: { animales }
export default function FormSanidad({ inicial, catalogo, onGuardado, onCancel }) {
  const { animales = [] } = catalogo ?? {}
  const [form, setForm] = useState(() => {
    const f = { ...vacio(), ...inicial }
    for (const k of ["producto", "proximo_control", "responsable", "nota"]) f[k] = f[k] ?? ""
    f.animal_id = f.animal_id ?? ""
    return f
  })
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const editando = Boolean(form.id)
  const campo = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const guardar = async () => {
    if (!form.animal_id) return setError("Selecciona un animal")
    if (!form.fecha) return setError("La fecha es obligatoria")
    if (form.proximo_control && form.proximo_control <= form.fecha)
      return setError("El próximo control debe ser posterior a la fecha")
    if (Number(form.costo) < 0) return setError("El costo no puede ser negativo")
    const payload = {
      animal_id: Number(form.animal_id),
      tipo: form.tipo,
      producto: form.producto.trim(),
      fecha: form.fecha,
      proximo_control: form.proximo_control || null,
      costo: Number(form.costo) || 0,
      responsable: form.responsable.trim(),
      estado: form.estado,
      nota: form.nota.trim(),
    }
    try {
      setGuardando(true)
      setError(null)
      if (editando) await api.actualizar(form.id, payload)
      else { await api.crear(payload); setForm({ ...vacio(), animal_id: form.animal_id }) }
      await onGuardado?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <TarjetaFormulario
      titulo={editando ? "Editar registro sanitario" : "Nuevo registro sanitario"}
      subtitulo="Vacunas, tratamientos y controles. Se muestran en el Calendario de Animales."
      onSave={guardar} onCancel={onCancel} error={error} guardando={guardando}
    >
      <Campo label="Animal">
        <select style={s.input} value={form.animal_id} onChange={(e) => campo("animal_id", e.target.value)}>
          <option value="">Selecciona…</option>
          {animales.map((a) => <option key={a.id} value={a.id}>{etiquetaAnimal(a)}</option>)}
        </select>
      </Campo>
      <Campo label="Tipo">
        <select style={s.input} value={form.tipo} onChange={(e) => campo("tipo", e.target.value)}>
          {Object.keys(TIPOS_EVENTO).map((t) => <option key={t}>{t}</option>)}
        </select>
      </Campo>
      <Campo label="Fecha"><input style={s.input} type="date" value={form.fecha} onChange={(e) => campo("fecha", e.target.value)} /></Campo>
      <Campo label="Próximo control"><input style={s.input} type="date" value={form.proximo_control} min={form.fecha} onChange={(e) => campo("proximo_control", e.target.value)} /></Campo>
      <Campo label="Producto / medicamento"><input style={s.input} value={form.producto} onChange={(e) => campo("producto", e.target.value)} /></Campo>
      <Campo label="Costo (CLP)"><input style={s.input} type="number" min="0" value={form.costo} onChange={(e) => campo("costo", e.target.value)} /></Campo>
      <Campo label="Responsable"><input style={s.input} value={form.responsable} onChange={(e) => campo("responsable", e.target.value)} /></Campo>
      <Campo label="Estado">
        <select style={s.input} value={form.estado} onChange={(e) => campo("estado", e.target.value)}>
          <option value="pendiente">Pendiente</option>
          <option value="realizado">Realizado</option>
        </select>
      </Campo>
      <Campo label="Nota (opcional)" full><input style={s.input} value={form.nota} onChange={(e) => campo("nota", e.target.value)} /></Campo>
    </TarjetaFormulario>
  )
}
