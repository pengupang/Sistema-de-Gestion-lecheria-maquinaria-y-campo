import { useState } from "react"
import { mantenciones_maquinas as api } from "@/services/maquinaria"
import TarjetaFormulario, { Campo } from "@/components/TarjetaFormulario"
import s, { AZUL, TIPO_MANTENCION, ESTADO_MANTENCION } from "@/pages/EstilosMaquinaria"
import { hoyISO } from "@/services/maquinaria"

const vacio = () => ({
  maquina_id: "", falla_id: null, tipo: "Preventiva", estado: "Programada",
  inicio: hoyISO(), fin: "", taller: "", notas: "",
})

// Mantención preventiva (programada) o correctiva (después de una falla).
// Si viene desde una falla, `inicial` trae maquina_id, falla_id, tipo "Correctiva" y notas.
// catalogo: { maquinas }
export default function FormMantencion({ inicial, catalogo, onGuardado, onCancel }) {
  const { maquinas = [] } = catalogo ?? {}
  const [form, setForm] = useState(() => ({
    ...vacio(),
    ...inicial,
    fin: inicial?.fin ?? "",
    taller: inicial?.taller ?? "",
    notas: inicial?.notas ?? "",
  }))
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const editando = Boolean(form.id)

  const campo = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const guardar = async () => {
    if (!form.maquina_id) return setError("Selecciona la máquina")
    if (!form.inicio) return setError("Indica la fecha de inicio")
    if (form.fin && form.fin < form.inicio) return setError("El término no puede ser anterior al inicio")
    if (form.estado === "Realizada" && !form.fin) return setError("Indica cuándo terminó la mantención")

    const payload = {
      maquina_id: form.maquina_id,
      falla_id: form.falla_id || null,
      tipo: form.tipo,
      estado: form.estado,
      inicio: form.inicio,
      fin: form.fin || null,
      taller: form.taller.trim() || null,
      notas: form.notas.trim() || null,
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
      titulo={editando ? "Editar mantención" : "Registrar mantención"}
      subtitulo={form.falla_id ? "Mantención correctiva generada a partir de una falla." : "Preventiva para programar o correctiva para reparar."}
      color={AZUL}
      onSave={guardar}
      onCancel={onCancel}
      error={error}
      guardando={guardando}
    >
      <Campo label="Máquina">
        <select style={s.input} value={form.maquina_id} onChange={(e) => campo("maquina_id", e.target.value)} disabled={Boolean(form.falla_id)}>
          <option value="">Selecciona…</option>
          {maquinas.map((m) => <option key={m.id} value={m.id}>{m.nombre} {m.modelo}</option>)}
        </select>
      </Campo>
      <Campo label="Tipo">
        <select style={s.input} value={form.tipo} onChange={(e) => campo("tipo", e.target.value)}>
          {TIPO_MANTENCION.map((t) => <option key={t}>{t}</option>)}
        </select>
      </Campo>
      <Campo label="Inicio">
        <input style={s.input} type="date" value={form.inicio} onChange={(e) => campo("inicio", e.target.value)} />
      </Campo>
      <Campo label="Término">
        <input style={s.input} type="date" value={form.fin} min={form.inicio} onChange={(e) => campo("fin", e.target.value)} />
      </Campo>
      <Campo label="Estado">
        <select style={s.input} value={form.estado} onChange={(e) => campo("estado", e.target.value)}>
          {Object.keys(ESTADO_MANTENCION).map((e) => <option key={e}>{e}</option>)}
        </select>
      </Campo>
      <Campo label="Taller / responsable">
        <input style={s.input} value={form.taller} onChange={(e) => campo("taller", e.target.value)} placeholder="Ej: taller propio, Servicio Técnico X" />
      </Campo>
      <Campo label="Notas" full>
        <textarea style={{ ...s.input, minHeight: 70, resize: "vertical" }} value={form.notas} onChange={(e) => campo("notas", e.target.value)} />
      </Campo>
    </TarjetaFormulario>
  )
}