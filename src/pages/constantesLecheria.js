// Constantes compartidas por las vistas y formularios de lechería
export { TIPOS_EVENTO } from "./estilosLecheria"

export const UNIDADES_BASE = ["kg", "litros", "sacos", "fardos", "pacas", "toneladas", "dosis", "frascos", "unidades", "cajas"]

export const CATEGORIAS_ANIMAL = {
  vaca_ordena: "Vaca en ordeña",
  vaca_seca: "Vaca seca",
  vaquilla: "Vaquilla",
  ternero: "Ternero/a",
  toro: "Toro",
}

export const ESTADOS_POTRERO = {
  disponible: { label: "Disponible", bg: "#D1FAE5", color: "#065F46" },
  en_uso: { label: "En uso", bg: "#DBEAFE", color: "#1E40AF" },
  descanso: { label: "En descanso", bg: "#FEF3C7", color: "#92400E" },
}
export const TIPOS_PRADERA = ["Pradera permanente", "Pradera sembrada", "Alfalfa", "Cultivo forrajero"]

export const CATEGORIAS_GASTO = ["Alimentación", "Veterinario", "Mantención", "Insumos", "Otros"]
export const COLORES_GASTO = {
  "Alimentación": "#3D6B4F",
  "Veterinario": "#3B82F6",
  "Mantención": "#F59E0B",
  "Insumos": "#8B5CF6",
  "Otros": "#94A3B8",
}

export const ESTADO_SANIDAD = {
  pendiente: { label: "Pendiente", bg: "#FEF3C7", color: "#92400E" },
  vencido: { label: "Vencido", bg: "#FEE2E2", color: "#991B1B" },
  realizado: { label: "Realizado", bg: "#D1FAE5", color: "#065F46" },
}

export const estadoStock = (stock, minimo) => {
  if (Number(stock) === 0) return { bg: "#FEE2E2", color: "#991B1B", label: "Sin stock" }
  if (Number(stock) <= Number(minimo)) return { bg: "#FEF3C7", color: "#92400E", label: "Stock bajo" }
  return { bg: "#D1FAE5", color: "#065F46", label: "OK" }
}

// "2026-11-10" -> "10/11/2026"
export const fechaCorta = (iso) => (iso ? iso.split("-").reverse().join("/") : "—")

// "" o null -> null; "5" -> 5 (para los id de los select)
export const idONull = (v) => (v === "" || v === null || v === undefined ? null : Number(v))
