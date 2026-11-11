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
  // Inserta muchos de una vez (importación): si alguno falla, no se guarda ninguno
  crearVarios: async (lista) => check(await supabase.from("gastos").insert(lista).select("id")),
}

// Resumen para el dashboard (consultas livianas, sin traer todo el rebaño)
export async function resumenLecheria() {
  const [{ count: animalesActivos, error: e1 }, listaInsumos, ultima] = await Promise.all([
    supabase.from("animales").select("id", { count: "exact", head: true }).eq("estado", "activo"),
    traerTodo(() => supabase.from("insumos").select("*").order("id")),
    supabase.from("mediciones").select("*").order("created_at", { ascending: false }).limit(1).maybeSingle(),
  ])
  if (e1) throw new Error(e1.message)
  return {
    animalesActivos: animalesActivos ?? 0,
    totalInsumos: listaInsumos.length,
    alertasStock: listaInsumos.filter((i) => Number(i.stock) <= Number(i.minimo)),
    ultimaMedicion: ultima.error ? null : ultima.data, // si falla, el dashboard sigue sin la tarjeta
  }
}

// ───────────── Mediciones (sonda de suelo y sensores de camas de terneros) ─────────────
// La misma tabla guarda todo; tipo_objetivo dice qué se midió (suelo, cama de ternero, etc.)
const SEL_MEDICION =
  "*, tipo:tipos_objetivo(codigo, nombre), dispositivo:dispositivos(nombre), potrero:potreros(nombre)"

export const tiposObjetivo = () =>
  traerTodo(() => supabase.from("tipos_objetivo").select("id, codigo, nombre").order("nombre").order("id"))

// desde: ISO (timestamptz) · tipoId: id de tipos_objetivo o "" para todos
export async function listarMediciones({ desde, tipoId } = {}) {
  const consulta = (sel) => {
    let q = supabase.from("mediciones").select(sel).order("created_at", { ascending: false }).limit(2000)
    if (desde) q = q.gte("created_at", desde)
    if (tipoId) q = q.eq("tipo_objetivo_id", tipoId)
    return q
  }
  const r = await consulta(SEL_MEDICION)
  // PGRST200: falta alguna relación (llave foránea) para los nombres; se traen solo las columnas
  if (r.error?.code === "PGRST200") return check(await consulta("*"))
  return check(r)
}

// Avisa cada vez que entra una medición nueva (Supabase Realtime). Devuelve la función para dejar de escuchar.
// Requiere que la tabla tenga Realtime activado en Supabase; si no, simplemente no llegan avisos.
export function escucharMediciones(alLlegar) {
  const canal = supabase
    .channel("mediciones-nuevas")
    .on("postgres_changes", { event: "INSERT", schema: "public", table: "mediciones" }, alLlegar)
    .subscribe()
  return () => supabase.removeChannel(canal)
}

export { check }

// Texto para mostrar un animal en listas y selects
export const etiquetaAnimal = (a) => (a ? (a.nombre ? `${a.arete} · ${a.nombre}` : a.arete) : "—")