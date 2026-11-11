import { useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Pencil, Trash2, Search, AlertTriangle, GitBranch } from "lucide-react"
import { animales as animalesApi, potreros as potrerosApi, etiquetaAnimal } from "../services/lecheria"
import ModalLecheria, { Campo } from "../components/ModalLecheria"
import { descendientes } from "../lib/genealogia"
import s from "./estilosLecheria"
import tw from "@/lib/ui"

const CATEGORIAS = {
  vaca_ordena: "Vaca en ordeña",
  vaca_seca: "Vaca seca",
  vaquilla: "Vaquilla",
  ternero: "Ternero/a",
  toro: "Toro",
}
const ESTADOS_POTRERO = {
  disponible: { label: "Disponible", bg: "#D1FAE5", color: "#065F46" },
  en_uso: { label: "En uso", bg: "#DBEAFE", color: "#1E40AF" },
  descanso: { label: "En descanso", bg: "#FEF3C7", color: "#92400E" },
}
const TIPOS_PRADERA = ["Pradera permanente", "Pradera sembrada", "Alfalfa", "Cultivo forrajero"]

const animalVacio = {
  arete: "", nombre: "", categoria: "vaca_ordena", sexo: "hembra", potrero_id: "", estado: "activo", fecha_nacimiento: "",
  madre_id: "", padre_id: "", padre_externo: "",
}
// Datos de un animal listos para el formulario (null -> "")
const formAnimal = (a) => ({
  ...a,
  sexo: a.sexo ?? (a.categoria === "toro" ? "macho" : "hembra"),
  potrero_id: a.potrero_id ?? "",
  fecha_nacimiento: a.fecha_nacimiento ?? "",
  madre_id: a.madre_id ?? "",
  padre_id: a.padre_id ?? "",
  padre_externo: a.padre_externo ?? "",
})
const potreroVacio = { nombre: "", superficie_ha: 0, tipo_pradera: TIPOS_PRADERA[0], estado: "disponible", capacidad: 0 }

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

  const [modal, setModal] = useState(null) // { tipo: "animal" | "potrero", form }
  const [modalError, setModalError] = useState(null)
  const [guardando, setGuardando] = useState(false)

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

  const abrir = (tipo, datos) => {
    setModalError(null)
    setModal({ tipo, form: datos ?? (tipo === "animal" ? { ...animalVacio } : { ...potreroVacio }) })
  }
  const setCampo = (campo, valor) => setModal((m) => ({ ...m, form: { ...m.form, [campo]: valor } }))

  const guardar = async () => {
    const { tipo, form } = modal
    setModalError(null)

    let payload
    if (tipo === "animal") {
      const arete = form.arete.trim()
      if (!arete) return setModalError("El arete (identificador) es obligatorio")
      if (animales.some((a) => a.arete.toLowerCase() === arete.toLowerCase() && a.id !== form.id))
        return setModalError("Ya existe un animal con ese arete")
      const madreId = form.madre_id === "" || form.madre_id === null ? null : Number(form.madre_id)
      const padreId = form.padre_id === "" || form.padre_id === null ? null : Number(form.padre_id)
      if (form.id) {
        if (madreId === form.id || padreId === form.id)
          return setModalError("Un animal no puede ser su propio padre o madre")
        const desc = descendientes(animales, form.id)
        if ((madreId && desc.has(madreId)) || (padreId && desc.has(padreId)))
          return setModalError("El padre o la madre no puede ser un descendiente de este animal")
      }
      payload = {
        arete,
        nombre: form.nombre.trim(),
        categoria: form.categoria,
        sexo: form.sexo,
        potrero_id: form.potrero_id === "" || form.potrero_id === null ? null : Number(form.potrero_id),
        estado: form.estado,
        fecha_nacimiento: form.fecha_nacimiento || null,
        madre_id: madreId,
        padre_id: padreId,
        // el padre "externo" (toro/semen de fuera del predio) solo aplica si no hay padre en el sistema
        padre_externo: padreId ? null : form.padre_externo.trim() || null,
      }
    } else {
      const nombre = form.nombre.trim()
      if (!nombre) return setModalError("El nombre del potrero es obligatorio")
      if (potreros.some((p) => p.nombre.toLowerCase() === nombre.toLowerCase() && p.id !== form.id))
        return setModalError("Ya existe un potrero con ese nombre")
      if (Number(form.superficie_ha) < 0 || Number(form.capacidad) < 0)
        return setModalError("Superficie y capacidad no pueden ser negativas")
      payload = {
        nombre,
        superficie_ha: Number(form.superficie_ha) || 0,
        tipo_pradera: form.tipo_pradera,
        estado: form.estado,
        capacidad: Number(form.capacidad) || 0,
      }
    }

    try {
      setGuardando(true)
      const api = tipo === "animal" ? animalesApi : potrerosApi
      if (form.id) await api.actualizar(form.id, payload)
      else await api.crear(payload)
      setModal(null)
      await cargar()
    } catch (e) {
      setModalError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  const eliminarAnimal = async (a) => {
    if (!window.confirm(`¿Eliminar a ${a.arete}? También se borrará su historial sanitario.`)) return
    try { await animalesApi.eliminar(a.id); await cargar() } catch (e) { setError(e.message) }
  }
  const eliminarPotrero = async (p) => {
    const n = ocupacion(p.id)
    const aviso = n > 0 ? ` Tiene ${n} animal(es) que quedarán sin potrero.` : ""
    if (!window.confirm(`¿Eliminar ${p.nombre}?${aviso}`)) return
    try { await potrerosApi.eliminar(p.id); await cargar() } catch (e) { setError(e.message) }
  }

  if (cargando) return <p style={s.sub}>Cargando...</p>

  return (
    <div className={tw.container}>
      <div className={tw.topBar}>
        <div>
          <h2 style={s.title}>Rebaño y Potreros</h2>
          <p style={s.sub}>{activos.length} animales activos · {potreros.length} potreros</p>
        </div>
        <button style={s.btnAdd} onClick={() => abrir(tab === "animales" ? "animal" : "potrero")}>
          <Plus size={15} /> {tab === "animales" ? "Agregar animal" : "Agregar potrero"}
        </button>
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
                        <button style={s.iconBtnGreen} title="Editar" onClick={() => abrir("animal", formAnimal(a))}><Pencil size={14} /></button>
                        <button style={s.iconBtnRed} onClick={() => eliminarAnimal(a)}><Trash2 size={14} /></button>
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
                  <button style={s.iconBtnGreen} onClick={() => abrir("potrero", { ...p })}><Pencil size={14} /></button>
                  <button style={s.iconBtnRed} onClick={() => eliminarPotrero(p)}><Trash2 size={14} /></button>
                </div>
              </div>
            )
          })}
          {potreros.length === 0 && <p style={s.vacio}>Aún no hay potreros registrados.</p>}
        </div>
      )}

      {modal?.tipo === "animal" && (
        <ModalLecheria titulo={modal.form.id ? "Editar animal" : "Nuevo animal"} onClose={() => setModal(null)} onSave={guardar} error={modalError} guardando={guardando}>
          <Campo label="Arete / ID"><input style={s.input} value={modal.form.arete} onChange={(e) => setCampo("arete", e.target.value)} /></Campo>
          <Campo label="Nombre (opcional)"><input style={s.input} value={modal.form.nombre} onChange={(e) => setCampo("nombre", e.target.value)} /></Campo>
          <Campo label="Categoría">
            <select
              style={s.input}
              value={modal.form.categoria}
              onChange={(e) => {
                setCampo("categoria", e.target.value)
                if (e.target.value === "toro") setCampo("sexo", "macho")
              }}
            >
              {Object.entries(CATEGORIAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </Campo>
          <Campo label="Sexo">
            <select style={s.input} value={modal.form.sexo} onChange={(e) => setCampo("sexo", e.target.value)}>
              <option value="hembra">Hembra</option>
              <option value="macho">Macho</option>
            </select>
          </Campo>
          <Campo label="Potrero">
            <select style={s.input} value={modal.form.potrero_id} onChange={(e) => setCampo("potrero_id", e.target.value)}>
              <option value="">Sin potrero</option>
              {potreros.map((p) => <option key={p.id} value={p.id}>{p.nombre}</option>)}
            </select>
          </Campo>
          <Campo label="Nacimiento"><input style={s.input} type="date" value={modal.form.fecha_nacimiento} onChange={(e) => setCampo("fecha_nacimiento", e.target.value)} /></Campo>
          <Campo label="Estado">
            <select style={s.input} value={modal.form.estado} onChange={(e) => setCampo("estado", e.target.value)}>
              <option value="activo">Activo</option>
              <option value="baja">Baja</option>
            </select>
          </Campo>
          <Campo label="Madre">
            <select style={s.input} value={modal.form.madre_id} onChange={(e) => setCampo("madre_id", e.target.value)}>
              <option value="">Desconocida</option>
              {animales
                .filter((a) => (a.sexo ?? "hembra") === "hembra" && a.id !== modal.form.id)
                .map((a) => <option key={a.id} value={a.id}>{etiquetaAnimal(a)}</option>)}
            </select>
          </Campo>
          <Campo label="Padre">
            <select style={s.input} value={modal.form.padre_id} onChange={(e) => setCampo("padre_id", e.target.value)}>
              <option value="">Desconocido / externo</option>
              {animales
                .filter((a) => a.sexo === "macho" && a.id !== modal.form.id)
                .map((a) => <option key={a.id} value={a.id}>{etiquetaAnimal(a)}</option>)}
            </select>
          </Campo>
          {!modal.form.padre_id && (
            <Campo label="Padre externo (toro o semen de fuera, opcional)" full>
              <input style={s.input} placeholder="Ej: Holstein 'Rex' (inseminación)" value={modal.form.padre_externo} onChange={(e) => setCampo("padre_externo", e.target.value)} />
            </Campo>
          )}
        </ModalLecheria>
      )}

      {modal?.tipo === "potrero" && (
        <ModalLecheria titulo={modal.form.id ? "Editar potrero" : "Nuevo potrero"} onClose={() => setModal(null)} onSave={guardar} error={modalError} guardando={guardando}>
          <Campo label="Nombre" full><input style={s.input} value={modal.form.nombre} onChange={(e) => setCampo("nombre", e.target.value)} /></Campo>
          <Campo label="Superficie (ha)"><input style={s.input} type="number" min="0" step="0.1" value={modal.form.superficie_ha} onChange={(e) => setCampo("superficie_ha", e.target.value)} /></Campo>
          <Campo label="Capacidad (animales)"><input style={s.input} type="number" min="0" value={modal.form.capacidad} onChange={(e) => setCampo("capacidad", e.target.value)} /></Campo>
          <Campo label="Tipo de pradera">
            <select style={s.input} value={modal.form.tipo_pradera} onChange={(e) => setCampo("tipo_pradera", e.target.value)}>
              {TIPOS_PRADERA.map((t) => <option key={t}>{t}</option>)}
            </select>
          </Campo>
          <Campo label="Estado">
            <select style={s.input} value={modal.form.estado} onChange={(e) => setCampo("estado", e.target.value)}>
              {Object.entries(ESTADOS_POTRERO).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </Campo>
        </ModalLecheria>
      )}
    </div>
  )
}
