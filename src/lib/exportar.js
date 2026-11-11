// Descarga una tabla como CSV que Excel (en español) abre directo.
// columnas: [{ titulo: "Cliente", valor: (fila) => fila.cliente?.nombre }, ...]
export function descargarCSV(nombreArchivo, columnas, filas) {
  // Encierra cada celda entre comillas y duplica las comillas internas
  const celda = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`

  const lineas = [
    columnas.map((c) => celda(c.titulo)).join(";"),
    ...filas.map((f) => columnas.map((c) => celda(c.valor(f))).join(";")),
  ]

  // "\uFEFF" al inicio: le avisa a Excel que el archivo es UTF-8 (si no, las tildes y la ñ salen rotas)
  const blob = new Blob(["\uFEFF" + lineas.join("\r\n")], { type: "text/csv;charset=utf-8" })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = `${nombreArchivo}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

// Convierte el texto de un CSV en [{ Cliente: "...", Máquina: "...", ... }] usando la primera fila como títulos
export function leerCSV(texto) {
  const t = texto.replace(/^\uFEFF/, "")
  const primera = t.split("\n")[0]
  // Separador: el que más aparezca en la primera línea (Excel en español usa ";", otros programas "," o tabulación)
  const cuenta = (c) => primera.split(c).length - 1
  const sep = [";", ",", "\t"].reduce((mejor, c) => (cuenta(c) > cuenta(mejor) ? c : mejor), ";")

  const filas = []
  let fila = [], celda = "", enComillas = false
  for (let i = 0; i < t.length; i++) {
    const c = t[i]
    if (enComillas) {
      if (c === '"' && t[i + 1] === '"') { celda += '"'; i++ } // comilla escapada ""
      else if (c === '"') enComillas = false
      else celda += c
    } else if (c === '"') enComillas = true
    else if (c === sep) { fila.push(celda); celda = "" }
    else if (c === "\n" || c === "\r") {
      if (c === "\r" && t[i + 1] === "\n") i++
      fila.push(celda); filas.push(fila); fila = []; celda = ""
    } else celda += c
  }
  if (celda || fila.length) { fila.push(celda); filas.push(fila) }

  const [titulos, ...datos] = filas.filter((f) => f.some((c) => c.trim())) // ignora líneas vacías
  if (!titulos) return []
  const claves = titulos.map((h) => h.trim())
  return datos.map((f) => Object.fromEntries(claves.map((k, j) => [k, (f[j] ?? "").trim()])))
}

// "10-11-2026", "10/11/2026" o "2026-11-10" -> "2026-11-10"; si no es una fecha real, null
export function fechaDesdeCL(txt = "") {
  const t = txt.trim()
  let a, m, d
  if (/^\d{4}-\d{1,2}-\d{1,2}$/.test(t)) [a, m, d] = t.split("-").map(Number)
  else if (/^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/.test(t)) [d, m, a] = t.split(/[-/]/).map(Number)
  else return null
  const f = new Date(a, m - 1, d)
  if (f.getFullYear() !== a || f.getMonth() !== m - 1 || f.getDate() !== d) return null // ej. 31-02-2026
  return `${a}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`
}

// "$1.278.000" o "1278000" -> 1278000 ; "12,5" -> 12.5 ; vacío o inválido -> null
export function numeroCL(txt = "") {
  const limpio = txt.replace(/[$\s]/g, "").replace(/\./g, "").replace(",", ".")
  if (!limpio) return null
  const n = Number(limpio)
  return Number.isFinite(n) ? n : null
}