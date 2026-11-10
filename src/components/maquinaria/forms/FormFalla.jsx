import { useMemo, useState } from "react"
import { fallas as api, arriendos as arriendosApi } from "@/services/maquinaria"
import TarjetaFormulario, { Campo } from "@/components/TarjetaFormulario"
import s, { AZUL, CATEGORIA_FALLA } from "@/pages/EstilosMaquinaria"
import { fechaCL, aInputLocal, desdeInputLocal, sumarDias } from "@/lib/formato"

const ahora = () => aInputLocal(new Date())
const vacio = () => ({
  maquina_id: "", arriendo_id: "",
  inicio: ahora(), fin: "", categoria: "", descripcion: "",
  extender: false, dias: "", // estos dos no se guardan en la tabla
})

// Horas entre dos valores de datetime-local
const horasEntre = (desde, hasta) => (new Date(hasta) - new Date(desde)) / 36e5

// Registra una falla. Si afecta a un arriendo, al crearla se puede extender
// el término de ese arriendo por el tiempo que la máquina estuvo detenida.
// catalogo: { maquinas, arriendos } (lo pasa IngresoMaquinaria)
export default function FormFalla({ inicial, catalogo, onGuardado, onCancel }) {
  const { maquinas = [], arriendos = [] } = catalogo ?? {}
  const [form, setForm] = useState(() => ({
    ...vacio(),
    ...inicial,
    arriendo_id: inicial?.arriendo_id ?? "",
    descripcion: inicial?.descripcion ?? "",
    inicio: inicial?.inicio ? aInputLocal(inicial.inicio) : ahora(),
    fin: inicial?.fin ? aInputLocal(inicial.fin) : "",
  }))
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const editando = Boolean(form.id)

  const campo = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // Al cambiar de máquina, el arriendo elegido ya no corresponde
  const elegirMaquina = (id) =>
    setForm((f) => ({ ...f, maquina_id: id, arriendo_id: "", extender: false }))

  // Al marcar "extender", propone los días según el tiempo detenido (editable)
  const marcarExtender = (marcado) =>
    setForm((f) => ({
      ...f,
      extender: marcado,
      dias: marcado && !f.dias
        ? String(f.fin ? Math.max(1, Math.ceil(horasEntre(f.inicio, f.fin) / 24)) : 1)
        : f.dias,
    }))

  // Arriendos de esa máquina que estaban vigentes el día de la falla
  // (más el que ya estaba elegido, por si al editar cambian las fechas)
  const arriendosDeMaquina = useMemo(() => {
    if (!form.maquina_id || !form.inicio) return []
    const dia = form.inicio.slice(0, 10)
    return arriendos.filter(
      (a) =>
        String(a.maquina_id) === String(form.maquina_id) &&
        ((a.inicio <= dia && dia <= a.fin) || String(a.id) === String(form.arriendo_id))
    )
  }, [arriendos, form.maquina_id, form.inicio, form.arriendo_id])

  const guardar = async () => {
    if (!form.maquina_id) return setError("Selecciona la máquina")
    if (!form.inicio) return setError("Indica cuándo empezó la falla")
    if (form.fin && form.fin < form.inicio) return setError("El fin no puede ser anterior al inicio")
    if (!form.categoria) return setError("Selecciona una categoría")
    if (form.extender && !(Number(form.dias) > 0)) return setError("Indica cuántos días extender el arriendo")

    const payload = {
      maquina_id: form.maquina_id,
      arriendo_id: form.arriendo_id || null,
      inicio: desdeInputLocal(form.inicio),
      fin: desdeInputLocal(form.fin),
      categoria: form.categoria,
      descripcion: form.descripcion.trim() || null,
    }

    try {
      setGuardando(true)
      setError(null)
      if (editando) {
        await api.actualizar(form.id, payload)
      } else {
        await api.crear(payload)
        // Solo al crear: así editar la falla no vuelve a correr el arriendo
        if (form.extender && form.arriendo_id) {
          const a = arriendos.find((x) => String(x.id) === String(form.arriendo_id))
          try {
            await arriendosApi.actualizar(a.id, { ...a, fin: sumarDias(a.fin, Number(form.dias)) })
          } catch (e) {
            throw new Error(`La falla se guardó, pero no se pudo extender el arriendo: ${e.message}`)
          }
        }
        setForm(vacio())
      }
      await onGuardado?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <TarjetaFormulario
      titulo={editando ? "Editar falla" : "Registrar falla"}
      subtitulo="Registra qué pasó, cuándo y cuánto estuvo detenida la máquina."
      color={AZUL}
      onSave={guardar}
      onCancel={onCancel}
      error={error}
      guardando={guardando}
    >
      <Campo label="Máquina">
        <select style={s.input} value={form.maquina_id} onChange={(e) => elegirMaquina(e.target.value)}>
          <option value="">Selecciona…</option>
          {maquinas.map((m) => (
            <option key={m.id} value={m.id}>{m.nombre} {m.modelo}</option>
          ))}
        </select>
      </Campo>
      <Campo label="Categoría">
        <select style={s.input} value={form.categoria} onChange={(e) => campo("categoria", e.target.value)}>
          <option value="">Selecciona…</option>
          {CATEGORIA_FALLA.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
      </Campo>
      <Campo label="Inicio de la falla">
        <input style={s.input} type="datetime-local" value={form.inicio} onChange={(e) => campo("inicio", e.target.value)} />
      </Campo>
      <Campo label="Fin (vacío si sigue detenida)">
        <input style={s.input} type="datetime-local" value={form.fin} min={form.inicio} onChange={(e) => campo("fin", e.target.value)} />
      </Campo>
      <Campo label="¿Qué pasó?" full>
        <textarea
          style={{ ...s.input, minHeight: 70, resize: "vertical" }}
          value={form.descripcion}
          onChange={(e) => campo("descripcion", e.target.value)}
          placeholder="Ej: se cortó una manguera hidráulica en medio del trabajo"
        />
      </Campo>
      <Campo label="Arriendo afectado" full>
        <select style={s.input} value={form.arriendo_id} onChange={(e) => campo("arriendo_id", e.target.value)} disabled={!form.maquina_id}>
          <option value="">Sin arriendo</option>
          {arriendosDeMaquina.map((a) => (
            <option key={a.id} value={a.id}>
              {a.cliente?.nombre} · {fechaCL(a.inicio)} al {fechaCL(a.fin)}
            </option>
          ))}
        </select>
      </Campo>

      {form.arriendo_id && !editando && (
        <Campo label="Tiempo muerto" full>
          <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 13 }}>
              <input type="checkbox" checked={form.extender} onChange={(e) => marcarExtender(e.target.checked)} />
              Extender el término del arriendo
            </label>
            {form.extender && (
              <input
                style={{ ...s.input, width: 90 }}
                type="number" min="1" value={form.dias}
                onChange={(e) => campo("dias", e.target.value)}
              />
            )}
            {form.extender && <span style={{ fontSize: 13 }}>días</span>}
          </div>
        </Campo>
      )}
    </TarjetaFormulario>
  )
}