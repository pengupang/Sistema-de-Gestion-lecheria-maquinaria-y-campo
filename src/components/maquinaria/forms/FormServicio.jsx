import { useState } from "react"
import { servicios as api } from "@/services/maquinaria"
import TarjetaFormulario, { Campo } from "@/components/TarjetaFormulario"
import s, { AZUL } from "@/pages/EstilosMaquinaria"

const vacio = { nombre: "", descripcion: "", unidad: "hectáreas", nota: "", maquinas: [] }

// maquinas: lista de máquinas para los checkbox (la carga la página)
export default function FormServicio({ inicial, maquinas = [], onGuardado, onCancel }) {
  const [form, setForm] = useState({ ...vacio, ...inicial, maquinas: inicial?.maquinas ?? [] })
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const campo = (k, v) => setForm((f) => ({ ...f, [k]: v }))
  const toggleMaquina = (id) =>
    setForm((f) => ({ ...f, maquinas: f.maquinas.includes(id) ? f.maquinas.filter((x) => x !== id) : [...f.maquinas, id] }))

  const guardar = async () => {
    if (!form.nombre.trim()) return setError("El nombre es obligatorio")
    const payload = {
      nombre: form.nombre.trim(),
      descripcion: (form.descripcion ?? "").trim(),
      unidad: form.unidad,
      nota: (form.nota ?? "").trim(),
      maquinas: form.maquinas,
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
      titulo={form.id ? `Editar servicio: ${form.nombre}` : "Nuevo servicio"}
      subtitulo="Los servicios no llevan precio: el valor de cada arriendo lo define el dueño según el cliente."
      color={AZUL}
      onSave={guardar}
      onCancel={onCancel}
      error={error}
      guardando={guardando}
    >
      <Campo label="Nombre del servicio" full><input style={s.input} value={form.nombre} onChange={(e) => campo("nombre", e.target.value)} /></Campo>
      <Campo label="Descripción" full>
        <textarea style={{ ...s.input, height: 70, resize: "vertical" }} value={form.descripcion ?? ""} onChange={(e) => campo("descripcion", e.target.value)} />
      </Campo>
      <Campo label="Unidad de cobro">
        <select style={s.input} value={form.unidad} onChange={(e) => campo("unidad", e.target.value)}>
          <option value="horas">horas</option>
          <option value="hectáreas">hectáreas</option>
        </select>
      </Campo>
      <Campo label="Nota"><input style={s.input} value={form.nota ?? ""} onChange={(e) => campo("nota", e.target.value)} placeholder="Ej: mínimo 2 horas" /></Campo>
      <Campo label="Maquinaria que realiza este servicio" full>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 8, padding: 8, backgroundColor: "#F8FAFC", borderRadius: 6, border: "1px solid #E2E8F0" }}>
          {maquinas.map((m) => (
            <label key={m.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: "#334155", cursor: "pointer" }}>
              <input type="checkbox" checked={form.maquinas.includes(m.id)} onChange={() => toggleMaquina(m.id)} />
              {m.nombre} {m.modelo}
            </label>
          ))}
          {maquinas.length === 0 && <span style={{ fontSize: 13, color: "#94A3B8" }}>Primero registra equipos.</span>}
        </div>
      </Campo>
    </TarjetaFormulario>
  )
}
