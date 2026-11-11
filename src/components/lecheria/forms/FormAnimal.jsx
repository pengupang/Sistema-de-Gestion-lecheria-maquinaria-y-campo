import { useState } from "react"
import { animales as api, etiquetaAnimal } from "@/services/lecheria"
import { descendientes } from "@/lib/genealogia"
import TarjetaFormulario, { Campo } from "@/components/TarjetaFormulario"
import s from "@/pages/estilosLecheria"
import { CATEGORIAS_ANIMAL, idONull } from "@/pages/constantesLecheria"

const vacio = () => ({
  arete: "", nombre: "", categoria: "vaca_ordena", sexo: "hembra", potrero_id: "", estado: "activo", fecha_nacimiento: "",
  madre_id: "", padre_id: "", padre_externo: "",
})

// catalogo: { animales, potreros }
export default function FormAnimal({ inicial, catalogo, onGuardado, onCancel }) {
  const { animales = [], potreros = [] } = catalogo ?? {}
  const [form, setForm] = useState(() => ({
    ...vacio(), ...inicial,
    nombre: inicial?.nombre ?? "",
    sexo: inicial?.sexo ?? (inicial?.categoria === "toro" ? "macho" : "hembra"),
    potrero_id: inicial?.potrero_id ?? "",
    fecha_nacimiento: inicial?.fecha_nacimiento ?? "",
    madre_id: inicial?.madre_id ?? "",
    padre_id: inicial?.padre_id ?? "",
    padre_externo: inicial?.padre_externo ?? "",
  }))
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const editando = Boolean(form.id)
  const campo = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  const guardar = async () => {
    const arete = form.arete.trim()
    if (!arete) return setError("El arete (identificador) es obligatorio")
    if (animales.some((a) => a.arete.toLowerCase() === arete.toLowerCase() && a.id !== form.id))
      return setError("Ya existe un animal con ese arete")
    const madreId = idONull(form.madre_id)
    const padreId = idONull(form.padre_id)
    if (editando) {
      if (madreId === form.id || padreId === form.id) return setError("Un animal no puede ser su propio padre o madre")
      const desc = descendientes(animales, form.id)
      if ((madreId && desc.has(madreId)) || (padreId && desc.has(padreId)))
        return setError("El padre o la madre no puede ser un descendiente de este animal")
    }
    const payload = {
      arete,
      nombre: form.nombre.trim(),
      categoria: form.categoria,
      sexo: form.sexo,
      potrero_id: idONull(form.potrero_id),
      estado: form.estado,
      fecha_nacimiento: form.fecha_nacimiento || null,
      madre_id: madreId,
      padre_id: padreId,
      // el padre "externo" (toro/semen de fuera del predio) solo aplica si no hay padre en el sistema
      padre_externo: padreId ? null : form.padre_externo.trim() || null,
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
      titulo={editando ? "Editar animal" : "Nuevo animal"}
      onSave={guardar} onCancel={onCancel} error={error} guardando={guardando}
    >
      <Campo label="Arete / ID"><input style={s.input} value={form.arete} onChange={(e) => campo("arete", e.target.value)} /></Campo>
      <Campo label="Nombre (opcional)"><input style={s.input} value={form.nombre} onChange={(e) => campo("nombre", e.target.value)} /></Campo>
      <Campo label="Categoría">
        <select style={s.input} value={form.categoria}
          onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value, sexo: e.target.value === "toro" ? "macho" : f.sexo }))}>
          {Object.entries(CATEGORIAS_ANIMAL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
      </Campo>
      <Campo label="Sexo">
        <select style={s.input} value={form.sexo} onChange={(e) => campo("sexo", e.target.value)}>
          <option value="hembra">Hembra</option>
          <option value="macho">Macho</option>
        </select>
      </Campo>
      <Campo label="Potrero">
        <select style={s.input} value={form.potrero_id} onChange={(e) => campo("potrero_id", e.target.value)}>
          <option value="">Sin potrero</option>
          {potreros.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
        </select>
      </Campo>
      <Campo label="Nacimiento"><input style={s.input} type="date" value={form.fecha_nacimiento} onChange={(e) => campo("fecha_nacimiento", e.target.value)} /></Campo>
      <Campo label="Estado">
        <select style={s.input} value={form.estado} onChange={(e) => campo("estado", e.target.value)}>
          <option value="activo">Activo</option>
          <option value="baja">Baja</option>
        </select>
      </Campo>
      <Campo label="Madre">
        <select style={s.input} value={form.madre_id} onChange={(e) => campo("madre_id", e.target.value)}>
          <option value="">Desconocida</option>
          {animales.filter((a) => (a.sexo ?? "hembra") === "hembra" && a.id !== form.id)
            .map((a) => <option key={a.id} value={a.id}>{etiquetaAnimal(a)}</option>)}
        </select>
      </Campo>
      <Campo label="Padre">
        <select style={s.input} value={form.padre_id} onChange={(e) => campo("padre_id", e.target.value)}>
          <option value="">Desconocido / externo</option>
          {animales.filter((a) => a.sexo === "macho" && a.id !== form.id)
            .map((a) => <option key={a.id} value={a.id}>{etiquetaAnimal(a)}</option>)}
        </select>
      </Campo>
      {!form.padre_id && (
        <Campo label="Padre externo (toro o semen de fuera, opcional)" full>
          <input style={s.input} placeholder="Ej: Holstein 'Rex' (inseminación)" value={form.padre_externo} onChange={(e) => campo("padre_externo", e.target.value)} />
        </Campo>
      )}
    </TarjetaFormulario>
  )
}
