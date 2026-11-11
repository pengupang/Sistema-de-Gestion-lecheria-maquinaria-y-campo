// ─────────────────────────────────────────────────────────────────────────────
// Capa de datos de LECHERÍA (Supabase)
// Tablas: potreros, animales, sanidad_registros, proveedores, insumos, gastos
// Las vistas llaman listar / crear / actualizar / eliminar igual que antes.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from "../lib/supabase"
import { crud, traerTodo, check } from "./db"

const fmt = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
export const hoyISO = () => fmt(new Date())

// FK en la BD: animales.potrero_id -> ON DELETE SET NULL,
//              sanidad_registros.animal_id -> ON DELETE CASCADE
export const potreros = crud("potreros")
const baseAnimales = crud("animales")
export const animales = {
  ...baseAnimales,
  // Inserta muchos de una vez (importación): si alguno falla, no se guarda ninguno
  crearVarios: async (lista) => check(await supabase.from("animales").insert(lista).select("id")),
}
export const sanidad = crud("sanidad_registros")
export const proveedores = crud("proveedores", { orden: "nombre" })
export const insumos = crud("insumos", { orden: "nombre" })
export const gastos = {
  ...crud("gastos", { orden: "fecha", ascendente: false }),
}

// Resumen para el dashboard (consultas livianas, sin traer todo el rebaño)
export async function resumenLecheria() {
  const [{ count: animalesActivos, error: e1 }, listaInsumos] = await Promise.all([
    supabase.from("animales").select("id", { count: "exact", head: true }).eq("estado", "activo"),
    traerTodo(() => supabase.from("insumos").select("*").order("id")),
  ])
  if (e1) throw new Error(e1.message)
  return {
    animalesActivos: animalesActivos ?? 0,
    totalInsumos: listaInsumos.length,
    alertasStock: listaInsumos.filter((i) => Number(i.stock) <= Number(i.minimo)),
  }
}

export { check }

// Texto para mostrar un animal en listas y selects
export const etiquetaAnimal = (a) => (a ? (a.nombre ? `${a.arete} · ${a.nombre}` : a.arete) : "—")