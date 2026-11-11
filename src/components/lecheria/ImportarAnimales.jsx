import { useMemo, useState } from "react"
import { animales as api } from "@/services/lecheria"
import { leerCSV, descargarCSV } from "@/lib/exportar"
import { detectarColumnas, validarAnimales } from "@/lib/importarAnimales"
import s from "@/pages/estilosLecheria"
import tw from "@/lib/ui"
import { CATEGORIAS_ANIMAL, fechaCorta } from "@/pages/constantesLecheria"

const VERDE = "#3D6B4F"
const PLANTILLA = ["Arete", "Nombre", "Categoría", "Sexo", "Potrero", "Nacimiento"]

// Carga muchos animales de una vez desde un CSV: el que exporta el bastón lector RFID
// (normalmente solo trae el número EID) o una planilla con más columnas.
// Lo que el archivo no traiga se completa con los valores por defecto elegidos aquí.
// catalogo: { animales, potreros } (lo pasa IngresoLecheria)
export default function ImportarAnimales({ catalogo, onImportado }) {
  const { potreros = [] } = catalogo ?? {}
  const [archivo, setArchivo] = useState("")
  const [filas, setFilas] = useState([])
  const [columnas, setColumnas] = useState({})
  const [defectos, setDefectos] = useState({ categoria: "vaca_ordena", sexo: "hembra", potrero_id: "" })
  const [soloErrores, setSoloErrores] = useState(false)
  const [error, setError] = useState(null)
  const [aviso, setAviso] = useState(null)
  const [importando, setImportando] = useState(false)
  const [inputKey, setInputKey] = useState(0)

  // Se recalcula si cambian los valores por defecto, así la vista previa siempre muestra lo que se guardará
  const revision = useMemo(
    () => (filas.length ? validarAnimales(filas, columnas, defectos, catalogo ?? {}) : []),
    [filas, columnas, defectos, catalogo]
  )
  const validas = revision.filter((r) => r.datos)
  const conError = revision.filter((r) => !r.datos)
  const visibles = soloErrores ? conError : revision
  const detectadas = Object.entries(columnas).filter(([, v]) => v)

  const defecto = (k, v) =>
    setDefectos((d) => ({ ...d, [k]: v, ...(k === "categoria" && v === "toro" ? { sexo: "macho" } : {}) }))

  const descargarPlantilla = () => {
    const ejemplo = { Arete: "982000123456789", Nombre: "Manchita", Categoría: "Vaquilla", Sexo: "hembra", Potrero: potreros[0]?.nombre ?? "", Nacimiento: "15-08-2024" }
    descargarCSV("plantilla-animales", PLANTILLA.map((t) => ({ titulo: t, valor: (f) => f[t] })), [ejemplo])
  }

  const leerArchivo = async (e) => {
    const f = e.target.files[0]
    setError(null); setAviso(null); setFilas([]); setColumnas({})
    if (!f) return
    setArchivo(f.name)
    try {
      const datos = leerCSV(await f.text())
      if (!datos.length) return setError("El archivo no tiene filas con datos.")
      const cols = detectarColumnas(Object.keys(datos[0]))
      if (!cols.arete)
        return setError(`No encontré la columna del número de arete. Columnas del archivo: ${Object.keys(datos[0]).join(", ")}. Debe llamarse Arete, DIIO, EID o RFID.`)
      setColumnas(cols)
      setFilas(datos)
    } catch (err) {
      setError(`No se pudo leer el archivo: ${err.message}`)
    }
  }

  const importar = async () => {
    if (!validas.length) return
    if (!window.confirm(`¿Importar ${validas.length} animales? Las ${conError.length} filas con error se omitirán.`)) return
    try {
      setImportando(true); setError(null)
      await api.crearVarios(validas.map((r) => r.datos))
      setAviso(`Se importaron ${validas.length} animales.`)
      setFilas([]); setColumnas({}); setArchivo(""); setInputKey((k) => k + 1)
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
        <h3 style={{ ...s.modalTitle, color: VERDE }}>Importar animales</h3>
        <p style={s.sub}>
          Sube el CSV que exporta el bastón lector RFID o una planilla con la columna Arete (también sirven DIIO, EID o RFID).
          Lo que el archivo no traiga se completa con los valores de abajo. Nada se guarda hasta que confirmes.
        </p>
      </div>

      <div className={tw.filtros}>
        <button style={s.btnCancel} onClick={descargarPlantilla}>Descargar plantilla</button>
        <input key={inputKey} type="file" accept=".csv,.txt,text/csv" onChange={leerArchivo} />
      </div>

      {/* Valores por defecto para las filas que no traen el dato */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div>
          <label style={s.label}>Categoría por defecto</label>
          <select style={s.input} value={defectos.categoria} onChange={(e) => defecto("categoria", e.target.value)}>
            {Object.entries(CATEGORIAS_ANIMAL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div>
          <label style={s.label}>Sexo por defecto</label>
          <select style={s.input} value={defectos.sexo} onChange={(e) => defecto("sexo", e.target.value)} disabled={defectos.categoria === "toro"}>
            <option value="hembra">Hembra</option>
            <option value="macho">Macho</option>
          </select>
        </div>
        <div>
          <label style={s.label}>Potrero por defecto</label>
          <select style={s.input} value={defectos.potrero_id} onChange={(e) => defecto("potrero_id", e.target.value)}>
            <option value="">Sin potrero</option>
            {potreros.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
          </select>
        </div>
      </div>

      <p style={{ ...s.sub, margin: 0, fontSize: 12 }}>
        Importante: no abras y guardes el archivo del lector en Excel antes de subirlo. Excel convierte los números de 15 dígitos
        en notación científica (9,82E+14) y se pierden los últimos dígitos del arete.
      </p>

      {error && <div style={s.errorBox}>{error}</div>}
      {aviso && <div style={{ ...s.errorBox, backgroundColor: "#D1FAE5", color: "#065F46", borderColor: "#A7F3D0" }}>{aviso}</div>}

      {revision.length > 0 && (
        <>
          <p style={{ ...s.sub, margin: 0 }}>
            Columnas reconocidas: {detectadas.map(([campo, titulo]) => `${titulo} → ${campo}`).join(" · ")}
          </p>
          <div className={tw.filtros} style={{ justifyContent: "space-between" }}>
            <p style={{ ...s.sub, margin: 0 }}>
              <b>{archivo}</b>: {validas.length} listos para importar · {conError.length} con errores
            </p>
            <div className={tw.filtros}>
              <label style={{ fontSize: 13, display: "flex", gap: 6, alignItems: "center" }}>
                <input type="checkbox" checked={soloErrores} onChange={(e) => setSoloErrores(e.target.checked)} />
                Ver solo errores
              </label>
              <button style={{ ...s.btnSave, opacity: !validas.length || importando ? 0.6 : 1 }} onClick={importar} disabled={!validas.length || importando}>
                {importando ? "Importando…" : `Importar ${validas.length}`}
              </button>
            </div>
          </div>

          <div className={tw.tableCard}>
            <table className={tw.table}>
              <thead><tr>{["Línea", "Arete", "Nombre", "Categoría", "Potrero", "Nacimiento", "Revisión"].map((h) => <th key={h} className={tw.th}>{h}</th>)}</tr></thead>
              <tbody>
                {visibles.slice(0, 300).map((r) => (
                  <tr key={r.linea} style={{ backgroundColor: r.datos ? "#F0FDF4" : "#FEF2F2" }}>
                    <td className={tw.td}>{r.linea}</td>
                    <td className={tw.td}><span style={s.nombre}>{r.datos?.arete ?? r.original[columnas.arete]}</span></td>
                    <td className={tw.td}>{r.datos?.nombre || "—"}</td>
                    <td className={tw.td}>{r.datos ? CATEGORIAS_ANIMAL[r.datos.categoria] : "—"}</td>
                    <td className={tw.td}>{r.datos ? potreros.find((p) => p.id === r.datos.potrero_id)?.nombre ?? "Sin potrero" : "—"}</td>
                    <td className={tw.td}>{r.datos?.fecha_nacimiento ? fechaCorta(r.datos.fecha_nacimiento) : "—"}</td>
                    <td className={tw.td} style={{ color: r.datos ? "#065F46" : "#991B1B", fontSize: 12 }}>
                      {r.datos ? (r.aviso ? `✓ Lista · ${r.aviso}` : "✓ Lista") : r.errores.join(" · ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {visibles.length > 300 && <p style={{ ...s.sub, margin: 0 }}>Se muestran las primeras 300 filas de la revisión; al importar se consideran todas.</p>}
        </>
      )}
    </div>
  )
}
