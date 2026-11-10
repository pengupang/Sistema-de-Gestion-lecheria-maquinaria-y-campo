export const clp = (n) => `$${Math.round(Number(n) || 0).toLocaleString("es-CL")}`
export const clpM = (n) => `$${((Number(n) || 0) / 1_000_000).toFixed(2)}M`

// "2026-10-14" -> "14-10-2026" (sin pasar por Date para evitar desfases de zona horaria)
export const fechaCL = (iso) => (iso ? iso.split("-").reverse().join("-") : "—")

export const hoyLargo = () => {
  const t = new Date().toLocaleDateString("es-CL", { weekday: "long", day: "numeric", month: "long", year: "numeric" })
  return t.charAt(0).toUpperCase() + t.slice(1)
}

export const MESES_CORTO = ["Ene", "Feb", "Mar", "Abr", "May", "Jun", "Jul", "Ago", "Sep", "Oct", "Nov", "Dic"]

const dos = (n) => String(n).padStart(2, "0")

// Fecha de Supabase (o Date) -> "2026-11-09T14:30" en hora local, para <input type="datetime-local">
export const aInputLocal = (valor) => {
  const d = new Date(valor)
  return `${d.getFullYear()}-${dos(d.getMonth() + 1)}-${dos(d.getDate())}T${dos(d.getHours())}:${dos(d.getMinutes())}`
}

// "2026-11-09T14:30" (hora local) -> ISO en UTC para guardar; vacío -> null
export const desdeInputLocal = (valor) => (valor ? new Date(valor).toISOString() : null)

// "2026-11-09" + 3 días -> "2026-11-12" (sin el desfase de UTC)
export const sumarDias = (fechaISO, dias) => {
  const [a, m, d] = fechaISO.split("-").map(Number)
  const f = new Date(a, m - 1, d + dias)
  return `${f.getFullYear()}-${dos(f.getMonth() + 1)}-${dos(f.getDate())}`
}

// Fecha con hora para mostrar: "09-11-2026 14:30"
export const fechaHoraCL = (valor) => {
  if (!valor) return "—"
  const local = aInputLocal(valor)
  return `${fechaCL(local.slice(0, 10))} ${local.slice(11)}`
}

// "En curso", "5 h" o "2 d 3 h"
export const duracionFalla = (f) => {
  if (!f?.fin) return "En curso"
  const h = Math.round((new Date(f.fin) - new Date(f.inicio)) / 36e5)
  return h < 24 ? `${h} h` : `${Math.floor(h / 24)} d ${h % 24} h`
}