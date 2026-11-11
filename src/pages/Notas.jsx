import { useMemo, useState } from "react"
import { useLocation } from "react-router-dom"
import { Pin, PinOff, Check, RotateCcw, Pencil, Trash2, Search, Bell, StickyNote } from "lucide-react"
import { notas as api, faltaTablaNotas } from "@/services/notas"
import useCarga from "@/lib/useCarga"
import EstadoCarga from "@/components/EstadoCarga"
import tw from "@/lib/ui"

// Notas y recordatorios del dueño. Se usa en los dos módulos (/maquinaria/notas y /lecheria/notas);
// cada nota puede quedar asociada al módulo donde se escribió o ser general.
const COLORES = {
  amarillo: { bg: "#FEF9C3", borde: "#FDE68A" },
  verde: { bg: "#DCFCE7", borde: "#BBF7D0" },
  azul: { bg: "#DBEAFE", borde: "#BFDBFE" },
  rosa: { bg: "#FCE7F3", borde: "#FBCFE8" },
  gris: { bg: "#F1F5F9", borde: "#E2E8F0" },
}
const NOMBRE_MODULO = { maquinaria: "Maquinaria", lecheria: "Lechería" }
const hoyISO = () => {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
}
const fechaCorta = (iso) => (iso ? iso.split("-").reverse().join("/") : "")
const vacia = (modulo) => ({ titulo: "", contenido: "", color: "amarillo", recordar_el: "", modulo })

const input = "w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-[13px] text-slate-700 outline-none focus:border-slate-400"
const boton = "rounded-md border border-slate-200 bg-white px-3 py-1.5 text-[13px] text-slate-600 hover:bg-slate-50"

function Editor({ inicial, onGuardar, onCancelar, guardando, textoBoton }) {
  const [f, setF] = useState(inicial)
  const campo = (k, v) => setF((x) => ({ ...x, [k]: v }))
  const guardar = () => { if (f.titulo.trim() || f.contenido.trim()) onGuardar(f) }
  return (
    <div className="flex flex-col gap-2">
      <input className={input} placeholder="Título (opcional)" value={f.titulo} onChange={(e) => campo("titulo", e.target.value)} />
      <textarea className={`${input} min-h-[80px] resize-y`} placeholder="Escribe una nota o un pendiente…" value={f.contenido}
        onChange={(e) => campo("contenido", e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) guardar() }} />
      <div className="flex flex-wrap items-center gap-2">
        <label className="flex items-center gap-1.5 text-[12px] text-slate-500">
          <Bell size={13} /> Recordar el
          <input type="date" className="rounded-md border border-slate-200 px-2 py-1 text-[12px]" value={f.recordar_el ?? ""}
            onChange={(e) => campo("recordar_el", e.target.value)} />
        </label>
        <div className="flex gap-1">
          {Object.entries(COLORES).map(([k, c]) => (
            <button key={k} type="button" title={k} onClick={() => campo("color", k)}
              className="h-5 w-5 rounded-full border-2" style={{ backgroundColor: c.bg, borderColor: f.color === k ? "#475569" : c.borde }} />
          ))}
        </div>
        <div className="ml-auto flex gap-2">
          {onCancelar && <button className={boton} onClick={onCancelar}>Cancelar</button>}
          <button className="rounded-md bg-slate-800 px-3 py-1.5 text-[13px] font-semibold text-white disabled:opacity-60"
            disabled={guardando || !(f.titulo.trim() || f.contenido.trim())} onClick={guardar}>
            {guardando ? "Guardando…" : textoBoton}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Notas() {
  const location = useLocation()
  const modulo = location.pathname.startsWith("/lecheria") ? "lecheria" : "maquinaria"
  const { datos: lista, cargando, error, setError, recargar } = useCarga(api.listar, [])
  const [filtro, setFiltro] = useState("pendientes")
  const [soloModulo, setSoloModulo] = useState(false)
  const [q, setQ] = useState("")
  const [editando, setEditando] = useState(null)
  const [guardando, setGuardando] = useState(false)
  const [claveNueva, setClaveNueva] = useState(0) // reinicia el editor de nota nueva al guardar
  const hoy = hoyISO()

  const accion = async (fn) => {
    try { setGuardando(true); await fn(); await recargar() } catch (e) { setError(e.message) } finally { setGuardando(false) }
  }
  const crear = (f) => accion(async () => {
    await api.crear({ ...f, titulo: f.titulo.trim(), contenido: f.contenido.trim(), recordar_el: f.recordar_el || null })
    setClaveNueva((k) => k + 1)
  })
  const actualizar = (n, cambios) => accion(() => api.actualizar(n.id, { ...n, ...cambios }))
  const eliminar = (n) => { if (window.confirm("¿Eliminar esta nota?")) accion(() => api.eliminar(n.id)) }

  const visibles = useMemo(() => {
    const t = q.trim().toLowerCase()
    return lista
      .filter((n) => filtro === "todas" || (filtro === "hechas" ? n.hecha : !n.hecha))
      .filter((n) => !soloModulo || n.modulo === modulo)
      .filter((n) => !t || `${n.titulo} ${n.contenido}`.toLowerCase().includes(t))
      .sort((a, b) => Number(b.fijada) - Number(a.fijada) || b.created_at.localeCompare(a.created_at))
  }, [lista, filtro, soloModulo, modulo, q])

  const recordatorios = lista.filter((n) => !n.hecha && n.recordar_el && n.recordar_el <= hoy)
    .sort((a, b) => a.recordar_el.localeCompare(b.recordar_el))
  const pendientes = lista.filter((n) => !n.hecha).length

  if (error && faltaTablaNotas(error)) {
    return (
      <div className={tw.container}>
        <h2 className="text-lg font-bold text-slate-800">Notas</h2>
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-[13px] text-amber-800">
          Las notas todavía no están activadas en la base de datos. Falta ejecutar <b>supabase/sql/notas.sql</b> en el SQL Editor de Supabase.
        </div>
      </div>
    )
  }

  return (
    <div className={tw.container}>
      <div className={tw.topBar}>
        <div>
          <h2 className="m-0 text-lg font-bold text-slate-800">Notas</h2>
          <p className="m-0 mt-1 text-[13px] text-slate-400">{pendientes} pendiente(s) · solo tú ves tus notas</p>
        </div>
      </div>

      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar} />

      {recordatorios.length > 0 && (
        <div className="flex flex-col gap-1.5 rounded-lg border border-amber-200 bg-amber-50 p-3 text-[13px] text-amber-900">
          <span className="flex items-center gap-1.5 font-semibold"><Bell size={14} /> Recordatorios para hoy o atrasados</span>
          {recordatorios.map((n) => (
            <div key={n.id} className="flex flex-wrap items-center gap-2">
              <span className={n.recordar_el < hoy ? "font-semibold text-red-700" : ""}>{fechaCorta(n.recordar_el)}</span>
              <span className="min-w-0 flex-1 truncate">{n.titulo || n.contenido}</span>
              <button className={boton} onClick={() => actualizar(n, { hecha: true })}><Check size={13} className="inline" /> Hecha</button>
            </div>
          ))}
        </div>
      )}

      <div className="rounded-[10px] border border-slate-200 bg-white p-4">
        <Editor key={claveNueva} inicial={vacia(modulo)} onGuardar={crear} guardando={guardando} textoBoton="Agregar nota" />
      </div>

      <div className={tw.filtros}>
        <div className={tw.buscador}>
          <Search size={14} color="#94A3B8" />
          <input className={tw.buscadorInput} placeholder="Buscar en las notas..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="flex overflow-hidden rounded-md border border-slate-200 bg-white text-[13px]">
          {[["pendientes", "Pendientes"], ["hechas", "Hechas"], ["todas", "Todas"]].map(([k, l]) => (
            <button key={k} onClick={() => setFiltro(k)} className={`px-3 py-1.5 ${filtro === k ? "bg-slate-800 text-white" : "text-slate-600 hover:bg-slate-50"}`}>{l}</button>
          ))}
        </div>
        <label className="flex items-center gap-1.5 text-[13px] text-slate-500">
          <input type="checkbox" checked={soloModulo} onChange={(e) => setSoloModulo(e.target.checked)} /> Solo {NOMBRE_MODULO[modulo]}
        </label>
      </div>

      {!cargando && visibles.length === 0 && (
        <div className="flex flex-col items-center gap-2 py-10 text-[13px] text-slate-400">
          <StickyNote size={28} /> {filtro === "hechas" ? "No hay notas marcadas como hechas." : "No hay notas. Escribe la primera arriba."}
        </div>
      )}

      <div className={tw.cardsGrid}>
        {visibles.map((n) => {
          const c = COLORES[n.color] ?? COLORES.amarillo
          const vencida = !n.hecha && n.recordar_el && n.recordar_el < hoy
          if (editando === n.id)
            return (
              <div key={n.id} className="rounded-[10px] border p-3" style={{ backgroundColor: c.bg, borderColor: c.borde }}>
                <Editor inicial={{ ...n, recordar_el: n.recordar_el ?? "" }} guardando={guardando} textoBoton="Guardar"
                  onCancelar={() => setEditando(null)}
                  onGuardar={(f) => { setEditando(null); actualizar(n, { ...f, recordar_el: f.recordar_el || null }) }} />
              </div>
            )
          return (
            <div key={n.id} className={`flex flex-col gap-2 rounded-[10px] border p-3 ${n.hecha ? "opacity-60" : ""}`}
              style={{ backgroundColor: c.bg, borderColor: c.borde }}>
              <div className="flex items-start gap-2">
                <p className={`m-0 min-w-0 flex-1 text-[14px] font-semibold text-slate-800 ${n.hecha ? "line-through" : ""}`}>
                  {n.titulo || (n.contenido.length > 40 ? n.contenido.slice(0, 40) + "…" : n.contenido)}
                </p>
                {n.fijada && <Pin size={14} className="shrink-0 text-slate-500" />}
              </div>
              {n.titulo && n.contenido && <p className="m-0 whitespace-pre-wrap text-[13px] text-slate-700">{n.contenido}</p>}
              <div className="mt-auto flex flex-wrap items-center gap-1.5 text-[11px] text-slate-500">
                {n.recordar_el && (
                  <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 ${vencida ? "bg-red-100 text-red-700" : "bg-white/70"}`}>
                    <Bell size={11} /> {fechaCorta(n.recordar_el)}
                  </span>
                )}
                {n.modulo && <span className="rounded-full bg-white/70 px-2 py-0.5">{NOMBRE_MODULO[n.modulo] ?? n.modulo}</span>}
                <span>{new Date(n.created_at).toLocaleDateString("es-CL")}</span>
                <div className="ml-auto flex gap-1">
                  <button title={n.fijada ? "Desfijar" : "Fijar arriba"} className="rounded p-1 hover:bg-white/60" onClick={() => actualizar(n, { fijada: !n.fijada })}>
                    {n.fijada ? <PinOff size={14} /> : <Pin size={14} />}
                  </button>
                  <button title={n.hecha ? "Marcar pendiente" : "Marcar hecha"} className="rounded p-1 hover:bg-white/60" onClick={() => actualizar(n, { hecha: !n.hecha })}>
                    {n.hecha ? <RotateCcw size={14} /> : <Check size={14} />}
                  </button>
                  <button title="Editar" className="rounded p-1 hover:bg-white/60" onClick={() => setEditando(n.id)}><Pencil size={14} /></button>
                  <button title="Eliminar" className="rounded p-1 text-red-600 hover:bg-white/60" onClick={() => eliminar(n)}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
