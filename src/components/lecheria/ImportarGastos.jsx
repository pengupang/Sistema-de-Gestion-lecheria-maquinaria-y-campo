import { useState } from "react"
import { gastos as api } from "@/services/lecheria"
import { leerCSV, descargarCSV } from "@/lib/exportar"
import { validarGastos, COLUMNAS_GASTO, OBLIGATORIAS_GASTO } from "@/lib/importarGastos"
import { clp } from "@/lib/formato"
import s from "@/pages/estilosLecheria"
import tw from "@/lib/ui"
import { fechaCorta } from "@/pages/constantesLecheria"

const VERDE = "#3D6B4F"

// Carga gastos históricos desde un CSV (el mismo formato que exporta el Histórico de Gastos).
// catalogo: { gastos, proveedores } (lo pasa IngresoLecheria)
export default function ImportarGastos({ catalogo, onImportado }) {
  const [archivo, setArchivo] = useState("")
  const [revision, setRevision] = useState([])
  const [soloErrores, setSoloErrores] = useState(false)
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [importando, setImportando] = useState(false)
  const [inputKey, setInputKey] = useState(0)

  const validas = revision.filter((r) => r.datos)
  const conError = revision.filter((r) => !r.datos)
  const visibles = soloErrores ? conError : revision

  const descargarPlantilla = () => {
    const ejemplo = { Fecha: "15-03-2025", Categoría: "Alimentación", Descripción: "Concentrado lechero 25 sacos", Monto: "380000", Proveedor: catalogo?.proveedores?.[0]?.nombre ?? "", Documento: "Factura 1234" }
    descargarCSV("plantilla-gastos", COLUMNAS_GASTO.map((t) => ({ titulo: t, valor: (f) => f[t] })), [ejemplo])
  }

  const leerArchivo = async (e) => {
    const f = e.target.files[0]
    setError(null); setAviso(null); setRevision([])
    if (!f) return
    setArchivo(f.name)
    try {
      const filas = leerCSV(await f.text())
      if (!filas.length) return setError("El archivo no tiene filas con datos.")
      const faltan = OBLIGATORIAS_GASTO.filter((c) => !(c in filas[0]))
      if (faltan.length) return setError(`Faltan columnas: ${faltan.join(", ")}. Descarga la plantilla para ver el formato.`)
      setRevision(validarGastos(filas, catalogo ?? {}))
    } catch (err) {
      setError(`No se pudo leer el archivo: ${err.message}`)
    }
  }

  const importar = async () => {
    if (!validas.length) return
    if (!window.confirm(`¿Importar ${validas.length} gastos? Las ${conError.length} filas con error se omitirán.`)) return
    try {
      setImportando(true); setError(null)
      await api.crearVarios(validas.map((r) => r.datos))
      setAviso(`Se importaron ${validas.length} gastos.`)
      setRevision([]); setArchivo(""); setInputKey((k) => k + 1)
      await onImportado?.()
    } catch (err) {
      setError(`No se importó nada: ${err.message}`)
    } finally {
      setImportando(false)
    }
  }

  return (
    <div className={tw.tableCard} style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h3 style={{ ...s.modalTitle, color: VERDE }}>Importar gastos</h3>
        <p style={s.sub}>
          Sube un CSV con el formato de la plantilla (o uno exportado desde el Histórico de Gastos). Los gastos que ya existen
          (misma fecha, descripción y monto) se omiten. Nada se guarda hasta que confirmes.
        </p>
      </div>

      <div className={tw.filtros}>
        <button style={s.btnCancel} onClick={descargarPlantilla}>Descargar plantilla</button>
        <input key={inputKey} type="file" accept=".csv,.txt,text/csv" onChange={leerArchivo} />
      </div>

      {error && <div style={s.errorBox}>{error}</div>}
      {aviso && <div style={{ ...s.errorBox, backgroundColor: "#D1FAE5", color: "#065F46", borderColor: "#A7F3D0" }}>{aviso}</div>}

      {revision.length > 0 && (
        <>
          <div className={tw.filtros} style={{ justifyContent: "space-between" }}>
            <p style={{ ...s.sub, margin: 0 }}><b>{archivo}</b>: {validas.length} listos para importar · {conError.length} con errores</p>
            <div className={tw.filtros}>
              <label style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={soloErrores} onChange={(e) => setSoloErrores(e.target.checked)} /> Ver solo errores
              </label>
              <button style={{ ...s.btnSave, opacity: !validas.length || importando ? 0.6 : 1 }} onClick={importar} disabled={!validas.length || importando}>
                {importando ? "Importando…" : `Importar ${validas.length}`}
              </button>
            </div>
          </div>
          <div className={tw.tableCard}>
            <table className={tw.table}>
              <thead><tr>{["Línea", "Fecha", "Descripción", "Categoría", "Monto", "Revisión"].map((h) => <th key={h} className={tw.th}>{h}</th>)}</tr></thead>
              <tbody>
                {visibles.slice(0, 300).map((r) => (
                  <tr key={r.linea} style={{ backgroundColor: r.datos ? "#F0FDF4" : "#FEF2F2" }}>
                    <td className={tw.td}>{r.linea}</td>
                    <td className={tw.td}>{r.datos ? fechaCorta(r.datos.fecha) : r.original["Fecha"]}</td>
                    <td className={tw.td}>{r.original["Descripción"]}</td>
                    <td className={tw.td}>{r.datos?.categoria ?? r.original["Categoría"]}</td>
                    <td className={tw.td}>{r.datos ? clp(r.datos.monto) : r.original["Monto"]}</td>
                    <td className={tw.td} style={{ color: r.datos ? "#065F46" : "#991B1B", fontSize: 12 }}>
                      {r.datos ? (r.aviso ? `✓ Lista · ${r.aviso}` : "✓ Lista") : r.errores.join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visibles.length > 300 && <p style={{ ...s.sub, margin: 0 }}>Se muestran las primeras 300 filas; al importar se consideran todas.</p>}
        </>
      )}
    </div>
  )
}
