import { useState } from "react"
import { arriendos as api } from "@/services/maquinaria"
import { leerCSV, descargarCSV } from "@/lib/exportar"
import { validarArriendos } from "@/lib/importarArriendos"
import { clp, fechaCL } from "@/lib/formato"
import s, { AZUL } from "@/pages/EstilosMaquinaria"

const COLUMNAS = ["Cliente", "Máquina", "Servicio", "Inicio", "Término", "Cantidad", "Unidad", "Monto", "Pagado", "Estado", "Predio", "Comuna"]
const OBLIGATORIAS = ["Cliente", "Máquina", "Servicio", "Inicio", "Cantidad", "Monto"]

// Carga arriendos antiguos desde un CSV: vista previa con errores por fila e inserción de las válidas.
// catalogo: { clientes, maquinas, servicios, arriendos } (lo pasa IngresoMaquinaria)
export default function ImportarArriendos({ catalogo, onImportado }) {
  const [archivo, setArchivo] = useState("")
  const [revision, setRevision] = useState([]) // resultado de validarArriendos
  const [soloErrores, setSoloErrores] = useState(false)
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [importando, setImportando] = useState(false)
  const [inputKey, setInputKey] = useState(0)

  const validas = revision.filter((r) => r.datos)
  const conError = revision.filter((r) => !r.datos)
  const visibles = soloErrores ? conError : revision

  const descargarPlantilla = () => {
    const c = catalogo?.clientes?.[0], m = catalogo?.maquinas?.[0], sv = catalogo?.servicios?.[0]
    const ejemplo = {
      Cliente: c?.nombre ?? "Nombre del cliente",
      Máquina: m ? `${m.nombre} ${m.modelo ?? ""}`.trim() : "Nombre y modelo",
      Servicio: sv?.nombre ?? "Nombre del servicio",
      Inicio: "15-03-2025", Término: "16-03-2025", Cantidad: "12,5", Unidad: "hectáreas",
      Monto: "450000", Pagado: "Sí", Estado: "Finalizado", Predio: "", Comuna: "",
    }
    descargarCSV("plantilla-arriendos", COLUMNAS.map((t) => ({ titulo: t, valor: (f) => f[t] })), [ejemplo])
  }

  const leerArchivo = async (e) => {
    const f = e.target.files[0]
    setError(null); setAviso(null); setRevision([])
    if (!f) return
    setArchivo(f.name)
    try {
      const filas = leerCSV(await f.text())
      if (!filas.length) return setError("El archivo no tiene filas con datos.")
      const faltan = OBLIGATORIAS.filter((c) => !(c in filas[0]))
      if (faltan.length) return setError(`Faltan columnas: ${faltan.join(", ")}. Descarga la plantilla para ver el formato.`)
      setRevision(validarArriendos(filas, catalogo ?? {}))
    } catch (err) {
      setError(`No se pudo leer el archivo: ${err.message}`)
    }
  }

  const importar = async () => {
    if (!validas.length) return
    if (!window.confirm(`¿Importar ${validas.length} arriendos? Las ${conError.length} filas con error se omitirán.`)) return
    try {
      setImportando(true); setError(null)
      await api.crearVarios(validas.map((r) => r.datos))
      setAviso(`Se importaron ${validas.length} arriendos.`)
      setRevision([]); setArchivo(""); setInputKey((k) => k + 1)
      await onImportado?.()
    } catch (err) {
      setError(`No se importó nada: ${err.message}`)
    } finally {
      setImportando(false)
    }
  }

  return (
    <div style={{ ...s.tableCard, padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
      <div>
        <h3 style={{ ...s.modalTitle, color: AZUL }}>Importar historial de arriendos</h3>
        <p style={s.sub}>Sube un CSV con el formato de la plantilla (o un archivo exportado desde Arriendos). Primero verás una revisión; nada se guarda hasta que confirmes.</p>
      </div>

      <div style={s.filtros}>
        <button style={s.btnCancel} onClick={descargarPlantilla}>Descargar plantilla</button>
        <input key={inputKey} type="file" accept=".csv,text/csv" onChange={leerArchivo} />
      </div>

      {error && <div style={s.errorBox}>{error}</div>}
      {aviso && <div style={{ ...s.errorBox, backgroundColor: "#D1FAE5", color: "#065F46", borderColor: "#A7F3D0" }}>{aviso}</div>}

      {revision.length > 0 && (
        <>
          <div style={{ ...s.filtros, justifyContent: "space-between" }}>
            <p style={{ ...s.sub, margin: 0 }}>
              <b>{archivo}</b>: {validas.length} listas para importar · {conError.length} con errores
            </p>
            <div style={s.filtros}>
              <label style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={soloErrores} onChange={(e) => setSoloErrores(e.target.checked)} />
                Ver solo errores
              </label>
              <button style={s.btnCancel} onClick={importar} disabled={!validas.length || importando}>
                {importando ? "Importando…" : `Importar ${validas.length}`}
              </button>
            </div>
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={s.table}>
              <thead><tr>{["Línea", "Cliente", "Máquina", "Inicio", "Monto", "Revisión"].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
              <tbody>
                {visibles.map((r) => (
                  <tr key={r.linea} style={{ backgroundColor: r.datos ? "#F0FDF4" : "#FEF2F2" }}>
                    <td style={s.td}>{r.linea}</td>
                    <td style={s.td}>{r.original["Cliente"]}</td>
                    <td style={s.td}>{r.original["Máquina"]}</td>
                    <td style={s.td}>{r.datos ? fechaCL(r.datos.inicio) : r.original["Inicio"]}</td>
                    <td style={s.td}>{r.datos ? clp(r.datos.monto) : r.original["Monto"]}</td>
                    <td style={{ ...s.td, color: r.datos ? "#065F46" : "#991B1B", fontSize: 12 }}>
                      {r.datos ? "✓ Lista" : r.errores.join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  )
}