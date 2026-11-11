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