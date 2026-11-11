// ─────────────────────────────────────────────────────────────────────────────
// Notas y recordatorios del dueño (tabla notas, ver supabase/sql/notas.sql)
// Cada usuario ve solo sus notas de la empresa activa (lo asegura RLS).
// ─────────────────────────────────────────────────────────────────────────────
import { crud } from "./db"

const base = crud("notas", { orden: "created_at", ascendente: false })
const COLS = ["titulo", "contenido", "modulo", "color", "fijada", "recordar_el", "hecha"]
const solo = (d) => Object.fromEntries(COLS.filter((c) => c in d).map((c) => [c, d[c]]))

export const notas = {
  listar: base.listar,
  crear: (d) => base.crear(solo(d)),
  actualizar: (id, d) => base.actualizar(id, solo(d)),
  eliminar: base.eliminar,
}

// La tabla todavía no existe en la base de datos
export const faltaTablaNotas = (msg = "") => /notas/i.test(msg) && /(does not exist|schema cache|PGRST205|42P01)/i.test(msg)
