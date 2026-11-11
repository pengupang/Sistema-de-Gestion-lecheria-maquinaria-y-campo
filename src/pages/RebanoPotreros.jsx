import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Pencil, Search, AlertTriangle, GitBranch } from "lucide-react"
import { animales as animalesApi, potreros as potrerosApi } from "../services/lecheria"
import s from "./estilosLecheria"
import tw from "@/lib/ui"

import { CATEGORIAS_ANIMAL as CATEGORIAS, ESTADOS_POTRERO } from "./constantesLecheria"

// Vista de solo lectura. Crear, editar y eliminar: /lecheria/registrar?tipo=animal | potrero
export default function RebanoPotreros() {
  const navigate = useNavigate()
  const [tab, setTab] = useState("animales")
  const [animales, setAnimales] = useState([])
  const [potreros, setPotreros] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const [q, setQ] = useState("")
  const [fCategoria, setFCategoria] = useState("")
  const [fPotrero, setFPotrero] = useState("")


  const cargar = async () => {
    try {
      setError(null)
      const [a, p] = await Promise.all([animalesApi.listar(), potrerosApi.listar()])
      setAnimales(a)
      setPotreros(p)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }
  useEffect(() => { cargar() }, [])

  const nombrePotrero = (id) => potreros.find((p) => p.id === id)?.nombre ?? "Sin potrero"
  const activos = useMemo(() => animales.filter((a) => a.estado === "activo"), [animales])
  const ocupacion = (id) => activos.filter((a) => a.potrero_id === id).length
  const sinPotrero = activos.filter((a) => !a.potrero_id).length
  const sobrecargados = potreros.filter((p) => p.capacidad > 0 && ocupacion(p.id) > p.capacidad)

  const animalesFiltrados = animales.filter((a) => {
    const texto = `${a.arete} ${a.nombre}`.toLowerCase()
    return (
      (!q || texto.includes(q.toLowerCase())) &&
      (!fCategoria || a.categoria === fCategoria) &&
      (fPotrero === "" || (fPotrero === "none" ? !a.potrero_id : String(a.potrero_id) === fPotrero))
    )
  })

  const registrar = (tipo, id) => navigate(`/lecheria/registrar?tipo=${tipo}${id ? `&id=${id}` : ""}`)

  if (cargando) return <p style={s.sub}>Cargando...</p>

  return (
    <div className={tw.container}>
      <div className={tw.topBar}>
        <div>
          <h2 style={s.title}>Rebaño y Potreros</h2>
          <p style={s.sub}>{activos.length} animales activos · {potreros.length} potreros</p>
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {tab === "animales" && (
            <button style={s.btnCancel} onClick={() => registrar("importar")}>Importar desde lector RFID</button>
          )}
          <button style={s.btnAdd} onClick={() => registrar(tab === "animales" ? "animal" : "potrero")}>
            <Plus size={15} /> {tab === "animales" ? "Registrar animal" : "Registrar potrero"}
          </button>
        </div>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      <div className={tw.statsRow}>
        <div style={s.stat}><p style={s.statValue}>{activos.length}</p><p style={s.statLabel}>Animales activos</p></div>
        <div style={s.stat}><p style={s.statValue}>{activos.filter((a) => a.categoria === "vaca_ordena").length}</p><p style={s.statLabel}>Vacas en ordeña</p></div>
        <div style={s.stat}><p style={s.statValue}>{potreros.filter((p) => p.estado === "en_uso").length}</p><p style={s.statLabel}>Potreros en uso</p></div>
        <div style={s.stat}><p style={{ ...s.statValue, color: sinPotrero ? "#D97706" : "#1E293B" }}>{sinPotrero}</p><p style={s.statLabel}>Sin potrero asignado</p></div>
      </div>

      {sobrecargados.length > 0 && (
        <div style={s.alertBox}>
          <AlertTriangle size={16} color="#D97706" />
          <span>
            <strong>Sobrecarga:</strong> {sobrecargados.map((p) => `${p.nombre} (${ocupacion(p.id)}/${p.capacidad})`).join(", ")}
          </span>
        </div>
      )}

      <div className={tw.tabs}>
        {[["animales", "Animales"], ["potreros", "Potreros"]].map(([id, label]) => (
          <button key={id} className={tw.tab} style={{ ...(tab === id ? s.tabActive : {}) }} onClick={() => setTab(id)}>
            {label}
          </button>
        ))}
      </div>

      {tab === "animales" && (
        <>
          <div className={tw.filtros}>
            <div className={tw.buscador}>
              <Search size={14} color="#94A3B8" />
              <input className={tw.buscadorInput} placeholder="Buscar arete o nombre" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select style={s.select} value={fCategoria} onChange={(e) => setFCategoria(e.target.value)}>
              <option value="">Todas las categorías</option>
              {Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
            <select style={s.select} value={fPotrero} onChange={(e) => setFPotrero(e.target.value)}>
              <option value="">Todos los potreros</option>
              <option value="none">Sin potrero</option>
              {potreros.map((p) => <option key={p.id} value={String(p.id)}>{p.nombre}</option>)}
            </select>
          </div>

          <div className={tw.tableCard}>
            <table className={tw.table}>
              <thead>
                <tr>{["Arete", "Nombre", "Categoría", "Potrero", "Nacimiento", "Estado", ""].map((h) => <th key={h} className={tw.th}>{h}</th>)}</tr>
              </thead>
              <tbody>
                {animalesFiltrados.map((a, i) => (
                  <tr key={a.id} style={{ backgroundColor: i % 2 === 0 ? "#F8FAFC" : "#fff" }}>
                    <td className={tw.td}><span style={s.nombre}>{a.arete}</span></td>
                    <td className={tw.td}>{a.nombre || "—"}</td>
                    <td className={tw.td}>{CATEGORIAS[a.categoria]}</td>
                    <td className={tw.td}>{nombrePotrero(a.potrero_id)}</td>
                    <td className={tw.td}>{a.fecha_nacimiento ? a.fecha_nacimiento.split("-").reverse().join("/") : "—"}</td>
                    <td className={tw.td}>
                      <span style={{ ...s.badge, backgroundColor: a.estado === "activo" ? "#D1FAE5" : "#F1F5F9", color: a.estado === "activo" ? "#065F46" : "#64748B" }}>
                        {a.estado === "activo" ? "Activo" : "Baja"}
                      </span>
                    </td>
                    <td className={tw.td}>
                      <div className={tw.actions}>
                        <button style={s.iconBtnGreen} title="Ver genealogía" onClick={() => navigate(`/lecheria/genealogia?animal=${a.id}`)}><GitBranch size={14} /></button>
                        <button style={s.iconBtnGreen} title="Editar en Registrar" onClick={() => registrar("animal", a.id)}><Pencil size={14} /></button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {animalesFiltrados.length === 0 && <p style={s.vacio}>No hay animales que coincidan con el filtro.</p>}
          </div>
        </>
      )}

      {tab === "potreros" && (
        <div className={tw.cardsGrid}>
          {potreros.map((p) => {
            const n = ocupacion(p.id)
            const pct = p.capacidad > 0 ? Math.min(100, Math.round((n / p.capacidad) * 100)) : 0
            const sobre = p.capacidad > 0 && n > p.capacidad
            const est = ESTADOS_POTRERO[p.estado]
            return (
              <div key={p.id} style={s.card}>
                <div style={s.cardHead}>
                  <div>
                    <h3 style={s.cardTitle}>{p.nombre}</h3>
                    <p style={s.cardMeta}>{p.superficie_ha} ha · {p.tipo_pradera}</p>
                  </div>
                  <span style={{ ...s.badge, backgroundColor: est.bg, color: est.color }}>{est.label}</span>
                </div>
                <div>
                  <p style={{ ...s.cardMeta, marginBottom: 6 }}>
                    Ocupación: <strong>{n}</strong> / {p.capacidad} animales
                  </p>
                  <div style={s.barra}>
                    <div style={{ width: `${pct}%`, height: "100%", backgroundColor: sobre ? "#EF4444" : pct > 80 ? "#F59E0B" : "#3D6B4F" }} />
                  </div>
                </div>
                <div className={tw.actions}>
                  <button style={s.iconBtnGreen} title="Editar en Registrar" onClick={() => registrar("potrero", p.id)}><Pencil size={14} /></button>
                </div>
              </div>
            )
          })}
          {potreros.length === 0 && <p style={s.vacio}>Aún no hay potreros registrados.</p>}
        </div>
      )}

    </div>
  )
}
