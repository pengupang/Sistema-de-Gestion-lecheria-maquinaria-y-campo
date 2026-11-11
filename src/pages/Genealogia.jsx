import { useEffect, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { AlertTriangle } from "lucide-react"
import { animales as animalesApi, etiquetaAnimal } from "../services/lecheria"
import { construirPedigri, crias, hermanos, ancestrosComunes, descendientes } from "../lib/genealogia"
import s from "./estilosLecheria"
import tw from "@/lib/ui"

const CATEGORIAS = { vaca_ordena: "Vaca en ordeña", vaca_seca: "Vaca seca", vaquilla: "Vaquilla", ternero: "Ternero/a", toro: "Toro" }
const COLORES = {
  hembra: { bg: "#FCE7F3", borde: "#F9A8D4", texto: "#9D174D" },
  macho: { bg: "#DBEAFE", borde: "#93C5FD", texto: "#1E40AF" },
}
const ROL = { animal: "Animal", padre: "Padre", madre: "Madre" }
const ALTO_SLOT = 76
const anio = (iso) => (iso ? iso.slice(0, 4) : "s/f")

function Tarjeta({ slot, onSelect, destacada }) {
  const { animal, externo, rol } = slot
  if (!animal) {
    return (
      <div style={{ ...caja, borderStyle: "dashed", borderColor: "#CBD5E1", backgroundColor: "#F8FAFC", color: "#94A3B8" }}>
        <span style={etiquetaRol}>{ROL[rol]}</span>
        <span style={{ fontSize: 12 }}>{externo ? `Externo: ${externo}` : "Desconocido"}</span>
      </div>
    )
  }
  const c = COLORES[animal.sexo] ?? COLORES.hembra
  return (
    <div
      onClick={destacada ? undefined : () => onSelect(animal.id)}
      style={{
        ...caja,
        backgroundColor: c.bg,
        borderColor: destacada ? c.texto : c.borde,
        borderWidth: destacada ? 2 : 1,
        color: c.texto,
        cursor: destacada ? "default" : "pointer",
        opacity: animal.estado === "baja" ? 0.65 : 1,
      }}
      title={destacada ? "" : "Ver la genealogía de este animal"}
    >
      <span style={etiquetaRol}>{ROL[rol]}{animal.estado === "baja" ? " · baja" : ""}</span>
      <span style={{ fontSize: 13, fontWeight: 700 }}>{etiquetaAnimal(animal)}</span>
      <span style={{ fontSize: 11 }}>{CATEGORIAS[animal.categoria]} · {anio(animal.fecha_nacimiento)}</span>
    </div>
  )
}

const caja = { display: "flex", flexDirection: "column", gap: 2, padding: "8px 10px", borderRadius: 8, border: "1px solid", minWidth: 150, boxSizing: "border-box", height: ALTO_SLOT - 10, justifyContent: "center" }
const etiquetaRol = { fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.75 }

export default function Genealogia() {
  const [params, setParams] = useSearchParams()
  const [animales, setAnimales] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)
  const [generaciones, setGeneraciones] = useState(3)

  useEffect(() => {
    animalesApi
      .listar()
      .then(setAnimales)
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false))
  }, [])

  const paramId = Number(params.get("animal"))
  const animal = animales.find((a) => a.id === paramId) ?? animales[0]
  const seleccionar = (id) => setParams({ animal: String(id) })

  const niveles = useMemo(
    () => (animal ? construirPedigri(animales, animal.id, generaciones) : []),
    [animales, animal, generaciones]
  )
  const comunes = animal ? ancestrosComunes(animales, animal.madre_id, animal.padre_id) : []
  const listaCrias = animal ? crias(animales, animal.id).sort((a, b) => (b.fecha_nacimiento ?? "").localeCompare(a.fecha_nacimiento ?? "")) : []
  const listaHermanos = animal ? hermanos(animales, animal) : []
  const totalDesc = animal ? descendientes(animales, animal.id).size : 0
  const otroProgenitor = (c) => {
    const otroId = c.madre_id === animal.id ? c.padre_id : c.madre_id
    const otro = animales.find((a) => a.id === otroId)
    if (otro) return etiquetaAnimal(otro)
    return c.madre_id === animal.id ? c.padre_externo || "Desconocido" : "Desconocida"
  }
  const parentesco = (h) => {
    const mismaMadre = animal.madre_id && h.madre_id === animal.madre_id
    const mismoPadre = animal.padre_id && h.padre_id === animal.padre_id
    return mismaMadre && mismoPadre ? "Hermano completo" : mismaMadre ? "Misma madre" : "Mismo padre"
  }

  if (cargando) return <p style={s.sub}>Cargando...</p>
  if (!animal) return <p style={s.sub}>Aún no hay animales registrados. Agrégalos en Rebaño y Potreros.</p>

  return (
    <div className={tw.container}>
      <div className={tw.topBar}>
        <div>
          <h2 style={s.title}>Genealogía</h2>
          <p style={s.sub}>Ascendencia, descendencia y parentesco · se edita desde Rebaño y Potreros</p>
        </div>
        <div className={tw.filtros}>
          <select style={s.select} value={animal.id} onChange={(e) => seleccionar(Number(e.target.value))}>
            {animales.map((a) => <option key={a.id} value={a.id}>{etiquetaAnimal(a)}</option>)}
          </select>
          <select style={s.select} value={generaciones} onChange={(e) => setGeneraciones(Number(e.target.value))}>
            {[2, 3, 4].map((g) => <option key={g} value={g}>{g} generaciones</option>)}
          </select>
        </div>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {comunes.length > 0 && (
        <div style={s.alertBox}>
          <AlertTriangle size={16} color="#D97706" />
          <span>
            <strong>Posible consanguinidad:</strong> la madre y el padre de {etiquetaAnimal(animal)} comparten ancestros ({comunes.map(etiquetaAnimal).join(", ")}).
          </span>
        </div>
      )}

      <div className={tw.statsRow}>
        <div style={s.stat}><p style={s.statValue}>{listaCrias.length}</p><p style={s.statLabel}>Crías directas</p></div>
        <div style={s.stat}><p style={s.statValue}>{totalDesc}</p><p style={s.statLabel}>Descendientes totales</p></div>
        <div style={s.stat}><p style={s.statValue}>{listaHermanos.length}</p><p style={s.statLabel}>Hermanos y medios hermanos</p></div>
      </div>

      {/* Pedigrí: de izquierda (animal) a derecha (ancestros más lejanos) */}
      <div className={tw.tableCard} style={{ padding: 16 }}>
        <div style={{ display: "flex", gap: 24, minWidth: "max-content" }}>
          {niveles.map((slots, g) => (
            <div key={g} style={{ display: "flex", flexDirection: "column" }}>
              <p style={{ ...s.label, textAlign: "center" }}>
                {["Animal", "Padres", "Abuelos", "Bisabuelos", "Tatarabuelos"][g]}
              </p>
              <div style={{ display: "flex", flexDirection: "column", justifyContent: "space-around", height: niveles[niveles.length - 1].length * ALTO_SLOT }}>
                {slots.map((slot, i) => (
                  <Tarjeta key={i} slot={slot} onSelect={seleccionar} destacada={g === 0} />
                ))}
              </div>
            </div>
          ))}
        </div>
        <p style={{ ...s.sub, marginTop: 12 }}>Haz clic en un ancestro para ver su propia genealogía. Punteado = desconocido o fuera del sistema.</p>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
        <div className={tw.tableCard}>
          <p style={{ ...s.nombre, padding: "14px 16px 0" }}>Crías de {etiquetaAnimal(animal)}</p>
          <table className={tw.table} style={{ minWidth: 0 }}>
            <thead><tr>{["Cría", "Nacimiento", "Otro progenitor"].map((h) => <th key={h} className={tw.th}>{h}</th>)}</tr></thead>
            <tbody>
              {listaCrias.map((c) => (
                <tr key={c.id} style={{ cursor: "pointer" }} onClick={() => seleccionar(c.id)}>
                  <td className={tw.td}><span style={s.nombre}>{etiquetaAnimal(c)}</span></td>
                  <td className={tw.td}>{c.fecha_nacimiento ? c.fecha_nacimiento.split("-").reverse().join("/") : "—"}</td>
                  <td className={tw.td}>{otroProgenitor(c)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {listaCrias.length === 0 && <p style={s.vacio}>Sin crías registradas.</p>}
        </div>

        <div className={tw.tableCard}>
          <p style={{ ...s.nombre, padding: "14px 16px 0" }}>Hermanos</p>
          <table className={tw.table} style={{ minWidth: 0 }}>
            <thead><tr>{["Animal", "Nacimiento", "Parentesco"].map((h) => <th key={h} className={tw.th}>{h}</th>)}</tr></thead>
            <tbody>
              {listaHermanos.map((h) => (
                <tr key={h.id} style={{ cursor: "pointer" }} onClick={() => seleccionar(h.id)}>
                  <td className={tw.td}><span style={s.nombre}>{etiquetaAnimal(h)}</span></td>
                  <td className={tw.td}>{h.fecha_nacimiento ? h.fecha_nacimiento.split("-").reverse().join("/") : "—"}</td>
                  <td className={tw.td}>{parentesco(h)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {listaHermanos.length === 0 && <p style={s.vacio}>Sin hermanos registrados.</p>}
        </div>
      </div>
    </div>
  )
}
