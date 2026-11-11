// Estado de cada máquina calculado a partir de lo registrado, en vez de depender de que alguien
// lo cambie a mano en el formulario del equipo. Prioridad:
//   1. Mantención: falla sin terminar, mantención "En curso" o una mantención programada que cubre hoy
//   2. Arrendada: arriendo (no finalizado) cuyas fechas cubren hoy
//   3. Mantención "manual": el equipo fue marcado así en su ficha (p. ej. fuera de servicio sin registro)
//   4. Disponible
const hoyLocal = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}

// datos: { arriendos, mantenciones, fallas } -> Map(maquina_id -> { estado, motivo })
export function calcularEstados({ arriendos = [], mantenciones = [], fallas = [] }, hoy = hoyLocal()) {
  const r = new Map()
  const poner = (id, estado, motivo) => { if (!r.has(id)) r.set(id, { estado, motivo }) }
  const ahora = Date.now()

  for (const f of fallas)
    if (!f.fin || new Date(f.fin).getTime() > ahora) poner(f.maquina_id, "Mantención", "Detenida por falla")
  for (const m of mantenciones) {
    if (m.estado === "En curso") poner(m.maquina_id, "Mantención", "Mantención en curso")
    else if (m.estado === "Programada" && m.inicio <= hoy && (m.fin ?? m.inicio) >= hoy)
      poner(m.maquina_id, "Mantención", "Mantención programada hoy")
  }
  for (const a of arriendos)
    if (a.estado !== "Finalizado" && a.inicio <= hoy && a.fin >= hoy)
      poner(a.maquina_id, "Arrendada", a.cliente?.nombre ? `Arrendada a ${a.cliente.nombre}` : "Arriendo vigente")
  return r
}

// Devuelve las máquinas con `estado` y `motivoEstado` calculados (no modifica las originales)
export function conEstadoActual(maquinas = [], estados) {
  return maquinas.map((m) => {
    const e = estados.get(m.id)
    const base = { ...m, estadoFicha: m.estado } // lo guardado en la ficha, para el formulario del equipo
    if (e) return { ...base, estado: e.estado, motivoEstado: e.motivo }
    if (m.estado === "Mantención") return { ...base, estado: "Mantención", motivoEstado: "Fuera de servicio (ficha)" }
    return { ...base, estado: "Disponible", motivoEstado: null }
  })
}
