import { useState } from "react"
import { maquinas as api } from "@/services/maquinaria"
import TarjetaFormulario, { Campo } from "@/components/TarjetaFormulario"
import s, { AZUL } from "@/pages/EstilosMaquinaria"

const vacio = { nombre: "", modelo: "", tipo: "", estado: "Disponible", precio: 0, unidad_cobro: "hora", notas: "" }

// inicial: máquina a editar (o nada para una nueva). onGuardado / onCancel: los decide la página.
export default function FormMaquina({ inicial, onGuardado, onCancel }) {
  // estadoFicha: lo guardado en la base (estado trae el calculado del día)
  const [form, setForm] = useState({ ...vacio, ...inicial, estado: inicial?.estadoFicha ?? inicial?.estado ?? "Disponible" })
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const campo = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const guardar = async () => {
    if (!form.nombre.trim()) return setError("El nombre es obligatorio")
    if (Number(form.precio) < 0) return setError("La tarifa no puede ser negativa")
    const payload = {
      nombre: form.nombre.trim(),
      modelo: (form.modelo ?? "").trim(),
      tipo: (form.tipo ?? "").trim(),
      estado: form.estado,
      precio: Math.round(Number(form.precio) || 0),
      unidad_cobro: form.unidad_cobro,
      notas: (form.notas ?? "").trim(),
    }
    try {
      setGuardando(true)
      setError(null)
      if (form.id) await api.actualizar(form.id, payload)
      else await api.crear(payload)
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
      titulo={form.id ? `Editar equipo: ${form.nombre}` : "Nuevo equipo"}
      color={AZUL}
      onSave={guardar}
      onCancel={onCancel}
      error={error}
      guardando={guardando}
    >
      <Campo label="Nombre"><input style={s.input} value={form.nombre} onChange={(e) => campo("nombre", e.target.value)} /></Campo>
      <Campo label="Modelo"><input style={s.input} value={form.modelo ?? ""} onChange={(e) => campo("modelo", e.target.value)} /></Campo>
      <Campo label="Tipo"><input style={s.input} value={form.tipo ?? ""} onChange={(e) => campo("tipo", e.target.value)} placeholder="Ej: Fumigación" /></Campo>
      <Campo label="Fuera de servicio">
        {/* El estado diario (arrendada, en mantención) se calcula solo con arriendos, mantenciones y fallas.
            Aquí solo se marca un equipo que está fuera de servicio sin un registro que lo explique. */}
        <select style={s.input} value={form.estado === "Mantención" ? "Mantención" : "Disponible"} onChange={(e) => campo("estado", e.target.value)}>
          <option value="Disponible">No (estado automático)</option>
          <option value="Mantención">Sí, fuera de servicio</option>
        </select>
      </Campo>
      {/* Referencial: el precio real de cada arriendo lo define el dueño según el cliente */}
      <Campo label="Tarifa referencial (CLP, neto)"><input style={s.input} type="number" min="0" value={form.precio} onChange={(e) => campo("precio", e.target.value)} /></Campo>
      <Campo label="Se cobra por">
        <select style={s.input} value={form.unidad_cobro} onChange={(e) => campo("unidad_cobro", e.target.value)}>
          <option value="hora">hora</option>
          <option value="hectárea">hectárea</option>
        </select>
      </Campo>
      <Campo label="Notas" full><input style={s.input} value={form.notas ?? ""} onChange={(e) => campo("notas", e.target.value)} /></Campo>
    </TarjetaFormulario>
  )
}
