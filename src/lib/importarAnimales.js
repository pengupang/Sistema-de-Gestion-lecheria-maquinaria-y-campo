import { fechaDesdeCL } from "./exportar"
import { CATEGORIAS_ANIMAL } from "@/pages/constantesLecheria"

// Importación de animales desde un CSV: lo que exporta un bastón lector RFID (EID, a veces VID y fecha)
// o una planilla propia. Como cada lector nombra distinto sus columnas, se aceptan varios títulos.
const norm = (s = "") =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[\s_.-]+/g, " ").trim()

export const ALIAS = {
  arete: ["arete", "diio", "eid", "rfid", "id electronico", "electronic id", "tag", "numero", "n arete", "caravana"],
  nombre: ["nombre", "vid", "visual id", "id visual", "arete visual"],
  categoria: ["categoria", "tipo"],
  sexo: ["sexo"],
  potrero: ["potrero", "lote", "grupo"],
  nacimiento: ["nacimiento", "fecha nacimiento", "fecha de nacimiento", "birth date"],
}

// Devuelve, para cada campo, el título de columna del archivo que le corresponde (o undefined)
export function detectarColumnas(titulos) {
  const r = {}
  for (const [campo, alias] of Object.entries(ALIAS)) {
    r[campo] = titulos.find((t) => alias.includes(norm(t)))
  }
  return r
}

// Arete tal como viene del lector: sin espacios ("982 000123456789" -> "982000123456789")
export const limpiarArete = (v = "") => String(v).replace(/\s+/g, "").trim()

const CATEGORIA_POR_TEXTO = Object.fromEntries(
  Object.entries(CATEGORIAS_ANIMAL).flatMap(([k, v]) => [[norm(k), k], [norm(v), k]])
)
const SEXO = { hembra: "hembra", h: "hembra", f: "hembra", macho: "macho", m: "macho" }

// filas: resultado de leerCSV · columnas: de detectarColumnas
// defectos: { categoria, sexo, potrero_id } que se aplican cuando la fila no trae ese dato
// catalogo: { animales, potreros }
// Devuelve [{ linea, original, datos, errores, aviso }]
export function validarAnimales(filas, columnas, defectos, { animales = [], potreros = [] }) {
  const existentes = new Set(animales.map((a) => limpiarArete(a.arete).toLowerCase()))
  const potreroPorNombre = new Map(potreros.map((p) => [norm(p.nombre), p]))
  const vistos = new Set()
  const val = (f, campo) => (columnas[campo] ? (f[columnas[campo]] ?? "").trim() : "")

  return filas.map((f, i) => {
    const errores = []
    let aviso = null
    const linea = i + 2

    const arete = limpiarArete(val(f, "arete"))
    if (!arete) errores.push("Falta el número de arete")
    else if (/e\+/i.test(arete)) errores.push("Número dañado por Excel (formato 9,8E+14). Usa el archivo original del lector")
    else if (existentes.has(arete.toLowerCase())) errores.push("Ya está registrado")
    else if (vistos.has(arete.toLowerCase())) errores.push("Repetido en este archivo (el lector lo leyó dos veces)")

    const catTxt = val(f, "categoria")
    const categoria = catTxt ? CATEGORIA_POR_TEXTO[norm(catTxt)] : defectos.categoria
    if (catTxt && !categoria) errores.push(`Categoría "${catTxt}" no reconocida`)

    const sexoTxt = val(f, "sexo")
    const sexo = sexoTxt ? SEXO[norm(sexoTxt)] : categoria === "toro" ? "macho" : defectos.sexo
    if (sexoTxt && !sexo) errores.push(`Sexo "${sexoTxt}" no reconocido (usa hembra o macho)`)

    const potTxt = val(f, "potrero")
    let potrero_id = defectos.potrero_id ? Number(defectos.potrero_id) : null
    if (potTxt) {
      const p = potreroPorNombre.get(norm(potTxt))
      if (p) potrero_id = p.id
      else aviso = `Potrero "${potTxt}" no existe: quedará ${potrero_id ? "en el potrero elegido" : "sin potrero"}`
    }

    const nacTxt = val(f, "nacimiento")
    const fecha_nacimiento = nacTxt ? fechaDesdeCL(nacTxt.split(" ")[0]) : null
    if (nacTxt && !fecha_nacimiento) errores.push("Fecha de nacimiento inválida (usa dd-mm-aaaa)")

    const datos = {
      arete, nombre: val(f, "nombre"), categoria, sexo, potrero_id,
      estado: "activo", fecha_nacimiento, madre_id: null, padre_id: null, padre_externo: null,
    }
    if (!errores.length) vistos.add(arete.toLowerCase())
    return { linea, original: f, datos: errores.length ? null : datos, errores, aviso }
  })
}
