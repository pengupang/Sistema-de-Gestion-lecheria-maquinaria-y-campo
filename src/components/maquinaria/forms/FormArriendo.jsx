import { useMemo, useState } from "react"
import { arriendos as api } from "@/services/maquinaria"
import TarjetaFormulario, { Campo } from "@/components/TarjetaFormulario"
import s, { AZUL, ESTADO_ARRIENDO } from "@/pages/EstilosMaquinaria"

const hoy = () => new Date().toISOString().slice(0, 10)
const vacio = () => ({
  cliente_id: "", maquina_id: "", servicio_id: "",
  inicio: hoy(), fin: hoy(), cantidad: "", unidad: "hectáreas",
  predio: "", comuna: "", estado: "Pendiente", monto: "", pagado: false,
})

// El precio no viene de un catálogo: el administrador lo define en cada arriendo según el cliente
// y queda guardado al registrarlo.
// catalogo: { clientes, maquinas, servicios } (lo carga la página con catalogos())
export default function FormArriendo({ inicial, catalogo, onGuardado, onCancel }) {
  const { clientes = [], maquinas = [], servicios = [] } = catalogo ?? {}
  const [form, setForm] = useState({ ...vacio(), ...inicial, monto: inicial?.monto ?? "" })
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const editando = Boolean(form.id)

  const campo = (k, v) => setForm((f) => ({ ...f, [k]: v }))

  // Al elegir servicio: hereda su unidad y limpia la máquina si no lo realiza
  const elegirServicio = (id) => {
    const sv = servicios.find((x) => String(x.id) === String(id))
    setForm((f) => ({
      ...f,
      servicio_id: id,
      unidad: sv?.unidad ?? f.unidad,
      maquina_id: sv?.maquinas?.length && !sv.maquinas.some((m) => String(m) === String(f.maquina_id)) ? "" : f.maquina_id,
    }))
  }

  const maquinasDelServicio = useMemo(() => {
    const sv = servicios.find((x) => String(x.id) === String(form.servicio_id))
    return sv?.maquinas?.length ? maquinas.filter((m) => sv.maquinas.some((id) => String(id) === String(m.id))) : maquinas
  }, [servicios, maquinas, form.servicio_id])

  const guardar = async () => {
    if (!form.cliente_id) return setError("Selecciona un cliente")
    if (!form.servicio_id) return setError("Selecciona un servicio")
    if (!form.maquina_id) return setError("Selecciona una máquina")
    if (!form.inicio || !form.fin) return setError("Indica las fechas")
    if (form.fin < form.inicio) return setError("La fecha de término no puede ser anterior al inicio")
    if (!(Number(form.cantidad) > 0)) return setError("La cantidad debe ser mayor a 0")
    if (form.monto === "" || !(Number(form.monto) > 0)) return setError("Ingresa el monto acordado con el cliente")

    const payload = {
      cliente_id: form.cliente_id,
      maquina_id: form.maquina_id,
      servicio_id: form.servicio_id,
      inicio: form.inicio,
      fin: form.fin,
      cantidad: Number(form.cantidad),
      unidad: form.unidad,
      predio: (form.predio ?? "").trim(),
      comuna: (form.comuna ?? "").trim(),
      estado: form.estado,
      monto: Math.round(Number(form.monto)),
      pagado: Boolean(form.pagado),
    }
    try {
      setGuardando(true)
      setError(null)
      if (editando) await api.actualizar(form.id, payload)
      else await api.crear(payload)
      if (!editando) setForm(vacio())
      await onGuardado?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <TarjetaFormulario
      titulo={editando ? "Editar arriendo" : "Nuevo arriendo"}
      subtitulo="El monto lo define el administrador según el cliente; no se toma de una tarifa fija."
      color={AZUL}
      onSave={guardar}
      onCancel={onCancel}
      error={error}
      guardando={guardando}
    >
      <Campo label="Cliente" full>
        <select style={s.input} value={form.cliente_id} onChange={(e) => campo("cliente_id", e.target.value)}>
          <option value="">Selecciona…</option>
          {clientes.filter((c) => c.activo !== false || String(c.id) === String(form.cliente_id)).map((c) => (
            <option key={c.id} value={c.id}>{c.nombre}</option>
          ))}
        </select>
      </Campo>
      <Campo label="Servicio">
        <select style={s.input} value={form.servicio_id} onChange={(e) => elegirServicio(e.target.value)}>
          <option value="">Selecciona…</option>
          {servicios.map((sv) => <option key={sv.id} value={sv.id}>{sv.nombre}</option>)}
        </select>
      </Campo>
      <Campo label="Máquina">
        <select style={s.input} value={form.maquina_id} onChange={(e) => campo("maquina_id", e.target.value)}>
          <option value="">Selecciona…</option>
          {maquinasDelServicio.map((m) => (
            <option key={m.id} value={m.id} disabled={m.estado === "Mantención"}>
              {m.nombre} {m.modelo}{m.estado === "Mantención" ? " (en mantención)" : ""}
            </option>
          ))}
        </select>
      </Campo>
      <Campo label="Inicio"><input style={s.input} type="date" value={form.inicio} onChange={(e) => campo("inicio", e.target.value)} /></Campo>
      <Campo label="Término"><input style={s.input} type="date" value={form.fin} min={form.inicio} onChange={(e) => campo("fin", e.target.value)} /></Campo>
      <Campo label={`Cantidad (${form.unidad})`}><input style={s.input} type="number" min="0" step="0.5" value={form.cantidad} onChange={(e) => campo("cantidad", e.target.value)} /></Campo>
      <Campo label="Estado">
        <select style={s.input} value={form.estado} onChange={(e) => campo("estado", e.target.value)}>
          {Object.keys(ESTADO_ARRIENDO).map((e) => <option key={e}>{e}</option>)}
        </select>
      </Campo>
      <Campo label="Predio / fundo donde se trabaja"><input style={s.input} value={form.predio ?? ""} onChange={(e) => campo("predio", e.target.value)} placeholder="Ej: Fundo Los Robles, parcela 12" /></Campo>
      <Campo label="Comuna"><input style={s.input} value={form.comuna ?? ""} onChange={(e) => campo("comuna", e.target.value)} /></Campo>

      <Campo label="Monto neto acordado (CLP)">
        <input style={s.input} type="number" min="0" value={form.monto} onChange={(e) => campo("monto", e.target.value)} placeholder="Precio para este cliente" />
      </Campo>
      <Campo label="Pago">
        <select style={s.input} value={String(form.pagado)} onChange={(e) => campo("pagado", e.target.value === "true")}>
          <option value="false">Pendiente</option>
          <option value="true">Pagado</option>
        </select>
      </Campo>
    </TarjetaFormulario>
  )
}
