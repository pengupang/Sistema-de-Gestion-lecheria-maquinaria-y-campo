import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Pencil, Search } from "lucide-react"
import { animales as animalesApi, sanidad as sanidadApi, etiquetaAnimal, hoyISO } from "../services/lecheria"
import s, { TIPOS_EVENTO } from "./estilosLecheria"
import tw from "@/lib/ui"

const fechaCL = (iso) => (iso ? iso.split("-").reverse().join("/") : "—")
const sumarDias = (iso, n) => {
  const [y, m, d] = iso.split("-").map(Number)
  const f = new Date(y, m - 1, d + n)
  return `${f.getFullYear()}-${String(f.getMonth() + 1).padStart(2, "0")}-${String(f.getDate()).padStart(2, "0")}`
}

// Vista de solo lectura. Crear, editar, marcar realizado y eliminar: /lecheria/registrar?tipo=sanidad
export default function Sanidad() {
  const navigate = useNavigate()
  const [registros, setRegistros] = useState([])
  const [animales, setAnimales] = useState([])
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  const [q, setQ] = useState("")
  const [fEstado, setFEstado] = useState("")
  const [fTipo, setFTipo] = useState("")


  const hoy = hoyISO()

  const cargar = async () => {
    try {
      setError(null)
      const [r, a] = await Promise.all([sanidadApi.listar(), animalesApi.listar()])
      setRegistros(r)
      setAnimales(a)
    } catch (e) {
      setError(e.message)
    } finally {
      setCargando(false)
    }
  }
  useEffect(() => { cargar() }, [])

  const animalDe = (id) => animales.find((a) => a.id === id)
  const vencido = (r) => r.estado === "pendiente" && r.fecha < hoy
  const estadoVisible = (r) => (vencido(r) ? "vencido" : r.estado)

  const stats = useMemo(() => {
    const pendientes = registros.filter((r) => r.estado === "pendiente")
    const en7 = sumarDias(hoy, 7)
    const mes = hoy.slice(0, 7)
    return {
      pendientes: pendientes.length,
      vencidos: pendientes.filter((r) => r.fecha < hoy).length,
      proximos: pendientes.filter((r) => r.fecha >= hoy && r.fecha <= en7).length,
      costoMes: registros.filter((r) => r.fecha.startsWith(mes)).reduce((t, r) => t + Number(r.costo || 0), 0),
    }
  }, [registros, hoy])

  const filtrados = registros
    .filter((r) => {
      const texto = etiquetaAnimal(animalDe(r.animal_id)).toLowerCase()
      return (
        (!q || texto.includes(q.toLowerCase())) &&
        (!fTipo || r.tipo === fTipo) &&
        (!fEstado || estadoVisible(r) === fEstado)
      )
    })
    .sort((a, b) => {
      if (a.estado !== b.estado) return a.estado === "pendiente" ? -1 : 1
      return a.estado === "pendiente" ? a.fecha.localeCompare(b.fecha) : b.fecha.localeCompare(a.fecha)
    })

  if (cargando) return <p style={s.sub}>Cargando...</p>

  const badgeEstado = {
    pendiente: { label: "Pendiente", bg: "#FEF3C7", color: "#92400E" },
    vencido: { label: "Vencido", bg: "#FEE2E2", color: "#991B1B" },
    realizado: { label: "Realizado", bg: "#D1FAE5", color: "#065F46" },
  }

  return (
    <div className={tw.container}>
      <div className={tw.topBar}>
        <div>
          <h2 style={s.title}>Sanidad y Manejo</h2>
          <p style={s.sub}>Vacunas, tratamientos y controles · se reflejan en el Calendario de Animales</p>
        </div>
        <button style={s.btnAdd} onClick={() => navigate("/lecheria/registrar?tipo=sanidad")}>
          <Plus size={15} /> Registrar
        </button>
      </div>

      {error && <div style={s.errorBox}>{error}</div>}

      <div className={tw.statsRow}>
        <div style={s.stat}><p style={s.statValue}>{stats.pendientes}</p><p style={s.statLabel}>Pendientes</p></div>
        <div style={s.stat}><p style={{ ...s.statValue, color: stats.vencidos ? "#DC2626" : "#1E293B" }}>{stats.vencidos}</p><p style={s.statLabel}>Vencidos</p></div>
        <div style={s.stat}><p style={s.statValue}>{stats.proximos}</p><p style={s.statLabel}>Próximos 7 días</p></div>
        <div style={s.stat}><p style={s.statValue}>${stats.costoMes.toLocaleString("es-CL")}</p><p style={s.statLabel}>Costo sanitario del mes</p></div>
      </div>

      <div className={tw.filtros}>
        <div className={tw.buscador}>
          <Search size={14} color="#94A3B8" />
          <input className={tw.buscadorInput} placeholder="Buscar animal" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select style={s.select} value={fEstado} onChange={(e) => setFEstado(e.target.value)}>
          <option value="">Todos los estados</option>
          <option value="pendiente">Pendientes</option>
          <option value="vencido">Vencidos</option>
          <option value="realizado">Realizados</option>
        </select>
        <select style={s.select} value={fTipo} onChange={(e) => setFTipo(e.target.value)}>
          <option value="">Todos los tipos</option>
          {Object.keys(TIPOS_EVENTO).map((t) => <option key={t}>{t}</option>)}
        </select>
      </div>

      <div className={tw.tableCard}>
        <table className={tw.table}>
          <thead>
            <tr>{["Fecha", "Animal", "Tipo", "Producto", "Próx. control", "Costo", "Estado", ""].map((h) => <th key={h} className={tw.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {filtrados.map((r, i) => {
              const t = TIPOS_EVENTO[r.tipo]
              const b = badgeEstado[estadoVisible(r)]
              return (
                <tr key={r.id} style={{ backgroundColor: i % 2 === 0 ? "#F8FAFC" : "#fff" }}>
                  <td className={tw.td}>{fechaCL(r.fecha)}</td>
                  <td className={tw.td}><span style={s.nombre}>{etiquetaAnimal(animalDe(r.animal_id))}</span></td>
                  <td className={tw.td}><span style={{ ...s.badge, backgroundColor: t?.bg, color: t?.color }}>{r.tipo}</span></td>
                  <td className={tw.td}>{r.producto || "—"}</td>
                  <td className={tw.td}>{fechaCL(r.proximo_control)}</td>
                  <td className={tw.td}>${Number(r.costo || 0).toLocaleString("es-CL")}</td>
                  <td className={tw.td}><span style={{ ...s.badge, backgroundColor: b.bg, color: b.color }}>{b.label}</span></td>
                  <td className={tw.td}>
                    <button style={s.iconBtnGreen} title="Editar o marcar realizado en Registrar" onClick={() => navigate(`/lecheria/registrar?tipo=sanidad&id=${r.id}`)}><Pencil size={14} /></button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
        {filtrados.length === 0 && <p style={s.vacio}>No hay registros que coincidan con el filtro.</p>}
      </div>

    </div>
  )
}
