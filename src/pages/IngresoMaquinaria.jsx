import { useCallback, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Pencil, Trash2, Search, ClipboardList, Wrench, Settings, Users,Hammer,AlertTriangle, FileText } from "lucide-react"
import { arriendos as arriendosApi, maquinas as maquinasApi, servicios as serviciosApi, clientes as clientesApi, fallas as fallasApi, mantenciones_maquinas as mantencionesApi, documentos as documentosApi } from "@/services/maquinaria"
import useCarga from "@/lib/useCarga"
import { clp, fechaCL, fechaHoraCL, duracionFalla } from "@/lib/formato"
import EstadoCarga from "@/components/EstadoCarga"
import FormArriendo from "@/components/maquinaria/forms/FormArriendo"
import FormMaquina from "@/components/maquinaria/forms/FormMaquina"
import FormServicio from "@/components/maquinaria/forms/FormServicio"
import FormCliente from "@/components/maquinaria/forms/FormCliente"
import FormMantencion from "@/components/maquinaria/forms/FormMantencion"
import FormFalla from "@/components/maquinaria/forms/FormFalla"
import FormDocumento from "@/components/maquinaria/forms/FormDocumento"
import s, { AZUL, ESTADO_ARRIENDO, ESTADO_MAQUINA, ESTADO_MANTENCION} from "./EstilosMaquinaria"



// Página de ingreso del módulo maquinaria. Todo lo que escribe datos vive aquí;
// las vistas (resumen, arriendos, equipos, servicios, clientes) son solo de lectura.
// URL: /maquinaria/registrar?tipo=arriendo|maquina|servicio|cliente&id=5&inicio=2026-11-05
const TABS = [
  { id: "arriendo", label: "Arriendos", icono: ClipboardList },
  { id: "maquina", label: "Equipos", icono: Wrench },
  { id: "servicio", label: "Servicios", icono: Settings },
  { id: "cliente", label: "Clientes", icono: Users },
  { id: "falla", label: "Fallas", icono: AlertTriangle},
  { id: "mantencion", label: "Mantención", icono: Hammer},
  { id: "documento", label: "Documentos", icono: FileText },
]

export default function IngresoMaquinaria() {
  const [params, setParams] = useSearchParams()
  const tipo = TABS.some((t) => t.id === params.get("tipo")) ? params.get("tipo") : "arriendo"
  const id = params.get("id")
  const [q, setQ] = useState("")

  const cargarTodo = useCallback(async () => {
    const [arriendos, maquinas, servicios, clientes] = await Promise.all([
      arriendosApi.listar(), maquinasApi.listar(), serviciosApi.listar(), clientesApi.listar(),
    ])
    return { arriendos, maquinas, servicios, clientes }
  }, [])
  const { datos, cargando, error, setError, recargar } = useCarga(cargarTodo, { arriendos: [], maquinas: [], servicios: [], clientes: [] })
  const esExtra = ["falla", "mantencion", "documento"].includes(tipo)

const cargarExtra = async () => {
  const vacio = { fallas: [], mantenciones: [], documentos: [] }
  if (tipo === "documento") return { ...vacio, documentos: await documentosApi.listar() }
  if (tipo === "falla" || tipo === "mantencion") {
    const [fallas, mantenciones] = await Promise.all([fallasApi.listar(), mantencionesApi.listar()])
    return { ...vacio, fallas, mantenciones }
  }
  return vacio
}
  const {
  datos: extra,
  error: errorExtra,
  setError: setErrorExtra,
  recargar: recargarExtra,
} = useCarga(cargarExtra, { fallas: [], mantenciones: [], documentos: [] },
  tipo === "documento" ? "doc" : esExtra ? "extra" : "")
  const recargarAmbos = async () => { await Promise.all([recargar(), recargarExtra()]) }
  const { arriendos, maquinas, servicios, clientes } = datos
  const catalogo = { clientes, maquinas, servicios, arriendos }

  const lista = { arriendo: arriendos, maquina: maquinas, servicio: servicios, cliente: clientes, falla: extra.fallas, mantencion: extra.mantenciones,documento: extra.documentos,}[tipo]
  const editando = id ? lista.find((x) => String(x.id) === id) : null
  const fallaOrigen = tipo === "mantencion" && params.get("falla")
  ? extra.fallas.find((f) => String(f.id) === params.get("falla"))
  : null
  // Valores iniciales para un registro nuevo (p. ej. fecha elegida en el calendario)
const inicialNuevo =
  tipo === "arriendo" && params.get("inicio")
    ? { inicio: params.get("inicio"), fin: params.get("inicio") }
    : fallaOrigen
    ? {
        maquina_id: fallaOrigen.maquina_id,
        falla_id: fallaOrigen.id,
        tipo: "Correctiva",
        notas: `Falla (${fallaOrigen.categoria}): ${fallaOrigen.descripcion ?? ""}`,
      }
    : undefined

  const cambiarTab = (t) => { setQ(""); setParams({ tipo: t }) }
  const editar = (item) => { setParams({ tipo, id: String(item.id) }); window.scrollTo({ top: 0, behavior: "smooth" }) }
  const cancelar = () => setParams({ tipo })
  const alGuardar = async () => { setParams({ tipo }); await recargarAmbos() }

  const eliminar = async (item, texto, api) => {
    if (!window.confirm(texto)) return
    try { await api.eliminar(item.id); if (String(item.id) === id) cancelar(); await recargarAmbos() } catch (e) { setError(e.message) }
  }
  const togglePago = async (a) => {
    try { await arriendosApi.actualizar(a.id, { ...a, pagado: !a.pagado }); await recargar() } catch (e) { setError(e.message) }
  }

  // ---------- Formulario según pestaña ----------
  // key: fuerza a React a crear el formulario de nuevo al cambiar de registro (así toma el `inicial` nuevo)
  const key = `${tipo}-${editando?.id ?? "nuevo"}-${fallaOrigen?.id ?? ""}`
  const props = { inicial: editando ?? inicialNuevo, onGuardado: alGuardar, onCancel: editando ? cancelar : undefined }
  const formulario = {
    arriendo: <FormArriendo key={key} {...props} catalogo={catalogo} />,
    maquina: <FormMaquina key={key} {...props} />,
    servicio: <FormServicio key={key} {...props} maquinas={maquinas} />,
    cliente: <FormCliente key={key} {...props} />,
    falla: <FormFalla key={key} {...props} catalogo={catalogo}/>,
    mantencion: <FormMantencion key={key} {...props} catalogo={catalogo}/>,
    documento: <FormDocumento key={key} {...props} />,
  }[tipo]

  // ---------- Lista de gestión (editar / eliminar) ----------
  const filas = useMemo(() => {
    const t = q.trim().toLowerCase()
    const texto = {
      arriendo: (a) => `${a.cliente?.nombre} ${a.maquina?.nombre} ${a.servicio?.nombre} ${a.predio ?? ""}`,
      maquina: (m) => `${m.nombre} ${m.modelo} ${m.tipo}`,
      servicio: (sv) => `${sv.nombre} ${sv.descripcion ?? ""}`,
      cliente: (c) => `${c.nombre} ${c.rut ?? ""} ${c.comuna ?? ""}`,
      falla: (f) => `${f.maquina?.nombre} ${f.categoria} ${f.descripcion ?? ""} ${f.arriendo?.cliente?.nombre ?? ""}`,
      mantencion: (m) => `${m.maquina?.nombre} ${m.tipo} ${m.taller ?? ""} ${m.notas ?? ""}`,
      documento: (d) => `${d.nota ?? ""} ${d.nombre_original ?? ""} ${d.origen ?? ""}`,
    }[tipo]
    let r = lista.filter((x) => !t || texto(x).toLowerCase().includes(t))
    if (tipo === "arriendo") r = [...r].sort((a, b) => b.inicio.localeCompare(a.inicio))
    return r.slice(0, 50)
  }, [lista, q, tipo])

  const columnas = {
    arriendo: ["Cliente", "Máquina / Servicio", "Inicio", "Monto", "Pago", "Estado", ""],
    maquina: ["Nombre / Modelo", "Tipo", "Estado", ""],
    mantencion: ["Máquina", "Tipo", "Inicio", "Estado", ""],
    servicio: ["Servicio", "Unidad", "Máquinas", ""],
    cliente: ["Nombre / RUT", "Comuna", "Tipo", "Estado", ""],
    falla: ["Máquina", "Inicio", "Duración", "Categoría", "Arriendo / Cliente", "Mantención",""],
    documento: ["Fecha", "Documento", "Origen", "Archivo", ""],
  }[tipo]

  const abrirDocumento = async (doc) => {
  const ventana = window.open("", "_blank") // se abre antes del await para que el navegador no la bloquee
  try {
    ventana.location = await documentosApi.urlFirmada(doc.ruta)
  } catch (e) {
    ventana.close()
    setErrorExtra(e.message)
  }
}

  const acciones = (item, texto, api) => (
    <td style={s.td}>
      <div style={s.actions}>
        <button style={s.iconBtnBlue} title="Editar" onClick={() => editar(item)}><Pencil size={14} /></button>
        <button style={s.iconBtnRed} title="Eliminar" onClick={() => eliminar(item, texto, api)}><Trash2 size={14} /></button>
      </div>
    </td>
  )

  const fila = (x) => {
    const marcada = String(x.id) === id ? { outline: `2px solid ${AZUL}`, outlineOffset: -2 } : {}
    if (tipo === "arriendo") return (
      <tr key={x.id} style={marcada}>
        <td style={s.td}><span style={s.nombre}>{x.cliente?.nombre}</span><span style={s.rutTxt}>{x.predio}</span></td>
        <td style={s.td}><span style={{ fontSize: 12 }}>{x.maquina?.nombre} {x.maquina?.modelo}</span><span style={s.rutTxt}>{x.servicio?.nombre}</span></td>
        <td style={s.td}>{fechaCL(x.inicio)}</td>
        <td style={{ ...s.td, fontWeight: 600 }}>
          {x.monto == null ? "—" : clp(x.monto)}
        </td>
        <td style={s.td}>
          <button onClick={() => togglePago(x)} title="Cambiar estado de pago"
            style={{ ...s.badge, border: "none", cursor: "pointer", backgroundColor: x.pagado ? "#D1FAE5" : "#FEF3C7", color: x.pagado ? "#065F46" : "#92400E" }}>
            {x.pagado ? "✓ Pagado" : "Pendiente"}
          </button>
        </td>
        <td style={s.td}><span style={{ ...s.badge, ...ESTADO_ARRIENDO[x.estado] }}>{x.estado}</span></td>
        {acciones(x, `¿Eliminar el arriendo de ${x.cliente?.nombre} (${fechaCL(x.inicio)})? También se elimina su factura.`, arriendosApi)}
      </tr>
    )
    if (tipo === "maquina") return (
      <tr key={x.id} style={marcada}>
        <td style={s.td}><span style={s.nombre}>{x.nombre}</span><span style={s.rutTxt}>{x.modelo}</span></td>
        <td style={s.td}>{x.tipo}</td>
        <td style={s.td}><span style={{ ...s.badge, ...ESTADO_MAQUINA[x.estado] }}>{x.estado}</span></td>
        {acciones(x, `¿Eliminar ${x.nombre} ${x.modelo}? También se borrarán sus mantenciones.`, maquinasApi)}
      </tr>
    )
    if (tipo === "servicio") return (
      <tr key={x.id} style={marcada}>
        <td style={s.td}><span style={s.nombre}>{x.nombre}</span></td>
        <td style={s.td}>{x.unidad}</td>
        <td style={s.td}>{x.maquinas?.length ?? 0}</td>
        {acciones(x, `¿Eliminar el servicio "${x.nombre}"?`, serviciosApi)}
      </tr>
    )
    if(tipo === "falla")return(
      <tr key={x.id} style={marcada}>
        <td style={s.td}><span style={s.nombre}>{x.maquina?.nombre}</span><span style={s.rutTxt}>{x.maquina?.modelo}</span></td>
        <td style={s.td}>{fechaHoraCL(x.inicio)}</td>
        <td style={s.td}>{duracionFalla(x)}</td>
        <td style={s.td}>{x.categoria}</td>
        <td style={s.td}>{x.arriendo?.cliente?.nombre ?? "Sin arriendo"}</td>
        <td style={s.td}>
            {(() => {
              const m = extra.mantenciones.find((mt) => String(mt.falla_id) === String(x.id))
              return m
                ? <button style={s.btnCancel} onClick={() => setParams({ tipo: "mantencion", id: String(m.id) })}>Ver ({m.estado})</button>
                : <button style={s.btnCancel} onClick={() => setParams({ tipo: "mantencion", falla: String(x.id) })}>Generar</button>
            })()}
        </td>
        {acciones(x, `¿Eliminar la falla de ${x.maquina?.nombre}?`, fallasApi)}
      </tr>
    )
    if (tipo === "mantencion") return (
      <tr key={x.id} style={marcada}>
        <td style={s.td}><span style={s.nombre}>{x.maquina?.nombre}</span><span style={s.rutTxt}>{x.maquina?.modelo}</span></td>
        <td style={s.td}>{x.tipo}{x.falla_id && <span style={s.rutTxt}>por falla</span>}</td>
        <td style={s.td}>{fechaCL(x.inicio)}</td>
        <td style={s.td}><span style={{ ...s.badge, ...ESTADO_MANTENCION[x.estado] }}>{x.estado}</span></td>
        {acciones(x, `¿Eliminar la mantención de ${x.maquina?.nombre}?`, mantencionesApi)}
      </tr>
)

if (tipo === "documento") return (
  <tr key={x.id} style={marcada}>
    <td style={s.td}>{fechaHoraCL(x.creado_en)}</td>
    <td style={s.td}>
      <span style={s.nombre}>{x.nota || x.nombre_original}</span>
      {x.nota && <span style={s.rutTxt}>{x.nombre_original}</span>}
    </td>
    <td style={s.td}>{x.origen === "telegram" ? "Telegram" : "Web"}</td>
    <td style={s.td}>
      <button style={s.btnCancel} onClick={() => abrirDocumento(x)}>Abrir</button>
    </td>
    {acciones(x, `¿Eliminar "${x.nota || x.nombre_original}"? Se borrará también el archivo.`,
      { eliminar: () => documentosApi.eliminar(x) })}
  </tr>
)
    return (
      <tr key={x.id} style={marcada}>
        <td style={s.td}><span style={s.nombre}>{x.nombre}</span><span style={s.rutTxt}>{x.rut}</span></td>
        <td style={s.td}>{x.comuna}</td>
        <td style={s.td}>{x.tipo}</td>
        <td style={s.td}>{x.activo ? "Activo" : "Inactivo"}</td>
        {acciones(x, `¿Eliminar a ${x.nombre}?`, clientesApi)}
      </tr>
    )
  }

  return (
    <div style={s.container}>
      <div style={s.topBar}>
        <div>
          <h2 style={s.title}>Registrar en Maquinaria</h2>
          <p style={s.sub}>Ingreso y edición de arriendos, equipos, servicios, clientes, fallas y mantenciones</p>
        </div>
      </div>

      <div style={s.tabs}>
        {TABS.map(({ id: t, label, icono: Icono }) => (
          <button key={t} onClick={() => cambiarTab(t)}
            style={{ ...s.tab, display: "flex", alignItems: "center", gap: 6, ...(tipo === t ? { color: AZUL, borderBottom: `2px solid ${AZUL}` } : {}) }}>
            <Icono size={14} /> {label}
          </button>
        ))}
      </div>

      <EstadoCarga cargando={false} error={error} onReintentar={recargar} />
      <EstadoCarga cargando={false} error={errorExtra} onReintentar={recargarExtra} />

      {!cargando && (
        <>
          {id && !editando
            ? <div style={s.errorBox}>No se encontró el registro #{id}. <button style={s.btnCancel} onClick={cancelar}>Crear uno nuevo</button></div>
            : formulario}

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <div style={{ ...s.filtros, justifyContent: "space-between" }}>
              <h3 style={{ ...s.modalTitle, fontSize: 14 }}>Registros existentes</h3>
              <div style={s.filtros}>
                <div style={s.buscador}>
                  <Search size={14} color="#94A3B8" />
                  <input style={s.buscadorInput} placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} />
                </div>
              </div>
            </div>
            <div style={s.tableCard}>
              <table style={s.table}>
                <thead><tr>{columnas.map((h) => <th key={h} style={s.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {filas.map(fila)}
                  {filas.length === 0 && <tr><td colSpan={columnas.length} style={s.vacio}>Sin registros.</td></tr>}
                </tbody>
              </table>
            </div>
            <p style={{ ...s.sub, margin: 0 }}>Se muestran hasta 50 registros; usa el buscador para encontrar otros.</p>
          </div>
        </>
      )}
    </div>
  )
}
