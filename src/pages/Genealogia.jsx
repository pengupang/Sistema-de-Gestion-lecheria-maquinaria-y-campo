import { useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { AlertTriangle } from "lucide-react"
import { animales as animalesApi, etiquetaAnimal } from "../services/lecheria"
import { crias, ancestrosComunes } from "../lib/genealogia"
import s from "./estilosLecheria"
import tw from "@/lib/ui"

const CATEGORIAS = { vaca_ordena: "Vaca en ordeña", vaca_seca: "Vaca seca", vaquilla: "Vaquilla", ternero: "Ternero/a", toro: "Toro" }
const COLORES = {
  hembra: { bg: "#FCE7F3", borde: "#F9A8D4", texto: "#9D174D" },
  macho: { bg: "#DBEAFE", borde: "#93C5FD", texto: "#1E40AF" },
}
const ROL = { animal: "Animal", padre: "Padre", madre: "Madre", cria: "Cría" }
const anio = (iso) => (iso ? iso.slice(0, 4) : "s/f")

function Tarjeta({ slot, onSelect, destacada, nota }) {
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
      {nota && <span style={{ fontSize: 10.5, opacity: 0.8 }}>{nota}</span>}
    </div>
  )
}

const caja = { display: "flex", flexDirection: "column", gap: 2, padding: "8px 12px", borderRadius: 8, border: "1px solid", width: 170, minHeight: 66, boxSizing: "border-box", justifyContent: "center", textAlign: "center" }
const etiquetaRol = { fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", opacity: 0.75 }

// Árbol familiar simple: padres arriba, el animal al centro y sus crías abajo.
// Si el animal no tiene crías (por ejemplo, una cría), se muestran solo sus padres.
export default function Genealogia() {
  const [params, setParams] = useSearchParams()
  const [animales, setAnimales] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

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

  if (cargando) return <p style={s.sub}>Cargando...</p>
  if (!animal) return <p style={s.sub}>Aún no hay animales registrados. Agrégalos en Rebaño y Potreros.</p>

  const buscar = (id) => (id ? animales.find((a) => a.id === id) ?? null : null)
  const padre = buscar(animal.padre_id)
  const madre = buscar(animal.madre_id)
  const comunes = ancestrosComunes(animales, animal.madre_id, animal.padre_id)
  const listaCrias = crias(animales, animal.id).sort((a, b) => (a.fecha_nacimiento ?? "").localeCompare(b.fecha_nacimiento ?? ""))
  const otroProgenitor = (c) => {
    const otroId = c.madre_id === animal.id ? c.padre_id : c.madre_id
    const otro = buscar(otroId)
    if (otro) return `con ${etiquetaAnimal(otro)}`
    if (c.madre_id === animal.id && c.padre_externo) return `con ${c.padre_externo} (externo)`
    return null
  }
  const linea = <div className="mx-auto h-6 w-px bg-slate-300" />

  return (
    <div className={tw.container}>
      <div className={tw.topBar}>
        <div>
          <h2 style={s.title}>Genealogía</h2>
          <p style={s.sub}>Padres y crías de cada animal · se edita desde Registrar → Animales</p>
        </div>
        <select style={s.select} value={animal.id} onChange={(e) => seleccionar(Number(e.target.value))}>
          {animales.map((a) => <option key={a.id} value={a.id}>{etiquetaAnimal(a)}</option>)}
        </select>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      {comunes.length > 0 && (
        <div style={s.alertBox}>
          <AlertTriangle size={16} color="#D97706" />
          <span>
            <strong>Posible consanguinidad:</strong> la madre y el padre de {etiquetaAnimal(animal)} están emparentados (comparten {comunes.map(etiquetaAnimal).join(", ")}).
          </span>
        </div>
      )}

      <div className={tw.tableCard} style={{ padding: "20px 16px" }}>
        <div className="flex min-w-max flex-col items-center">
          {/* Padres */}
          <p style={{ ...s.label, textAlign: "center" }}>Padres</p>
          <div className="flex justify-center gap-4">
            <Tarjeta slot={{ animal: padre, externo: padre ? null : animal.padre_externo || null, rol: "padre" }} onSelect={seleccionar} />
            <Tarjeta slot={{ animal: madre, externo: null, rol: "madre" }} onSelect={seleccionar} />
          </div>
          {linea}

          {/* Animal */}
          <Tarjeta slot={{ animal, externo: null, rol: "animal" }} destacada />

          {/* Crías (solo si tiene) */}
          {listaCrias.length > 0 ? (
            <>
              {linea}
              <p style={{ ...s.label, textAlign: "center" }}>Crías ({listaCrias.length})</p>
              <div className="flex max-w-[760px] flex-wrap justify-center gap-3">
                {listaCrias.map((c) => (
                  <Tarjeta key={c.id} slot={{ animal: c, externo: null, rol: "cria" }} onSelect={seleccionar} nota={otroProgenitor(c)} />
                ))}
              </div>
            </>
          ) : (
            <p style={{ ...s.sub, marginTop: 12 }}>Sin crías registradas.</p>
          )}
        </div>
        <p style={{ ...s.sub, marginTop: 16, textAlign: "center" }}>
          Haz clic en un padre o en una cría para ver su familia. Punteado = desconocido o fuera del predio.
        </p>
      </div>
    </div>
  )
}
