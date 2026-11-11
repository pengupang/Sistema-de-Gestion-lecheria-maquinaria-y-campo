import { fechaDesdeCL, numeroCL } from "./exportar"
import { CATEGORIAS_GASTO } from "@/pages/constantesLecheria"

// Importación de gastos desde CSV (mismo formato que "Exportar a Excel" del Histórico de Gastos)
const norm = (s = "") =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim()

export const COLUMNAS_GASTO = ["Fecha", "Categoría", "Descripción", "Monto", "Proveedor", "Documento"]
export const OBLIGATORIAS_GASTO = ["Fecha", "Descripción", "Monto"]

// filas: resultado de leerCSV · catalogo: { gastos, proveedores }
export function validarGastos(filas, { gastos = [], proveedores = [] }) {
  const prov = new Map(proveedores.map((p) => [norm(p.nombre), p]))
  const cat = new Map(CATEGORIAS_GASTO.map((c) => [norm(c), c]))
  const clave = (g) => `${g.fecha}|${norm(g.descripcion)}|${Math.round(Number(g.monto))}`
  const existentes = new Set(gastos.map(clave))
  const vistos = new Set()

  return filas.map((f, i) => {
    const errores = []
    let aviso = null
    const fecha = fechaDesdeCL(f["Fecha"])
    if (!fecha) errores.push("Fecha inválida (usa dd-mm-aaaa)")
    const descripcion = (f["Descripción"] ?? "").trim()
    if (!descripcion) errores.push("Falta la descripción")
    const monto = numeroCL(f["Monto"])
    if (monto == null || monto < 0) errores.push("Monto inválido")

    const catTxt = (f["Categoría"] ?? "").trim()
    const categoria = catTxt ? cat.get(norm(catTxt)) : "Otros"
    if (catTxt && !categoria) errores.push(`Categoría "${catTxt}" no existe (usa ${CATEGORIAS_GASTO.join(", ")})`)

    const provTxt = (f["Proveedor"] ?? "").trim()
    const proveedor = provTxt ? prov.get(norm(provTxt)) : null
    if (provTxt && !proveedor) aviso = `Proveedor "${provTxt}" no existe: quedará sin proveedor`

    const datos = {
      fecha, categoria, descripcion, monto: Math.round(monto ?? 0),
      proveedor_id: proveedor?.id ?? null, documento: (f["Documento"] ?? "").trim() || null,
    }
    if (!errores.length) {
      const k = clave(datos)
      if (existentes.has(k)) errores.push("Ya está registrado")
      else if (vistos.has(k)) errores.push("Repetido en este archivo")
      else vistos.add(k)
    }
    return { linea: i + 2, original: f, datos: errores.length ? null : datos, errores, aviso }
  })
}
