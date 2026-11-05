import { useCallback, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Pencil, Trash2, Search, ClipboardList, Wrench, Settings, Users } from "lucide-react"
import { arriendos as arriendosApi, maquinas as maquinasApi, servicios as serviciosApi, clientes as clientesApi } from "@/services/maquinaria"
import useCarga from "@/lib/useCarga"
import { clp, fechaCL } from "@/lib/formato"
import EstadoCarga from "@/components/EstadoCarga"
import FormArriendo from "@/components/maquinaria/forms/FormArriendo"
import FormMaquina from "@/components/maquinaria/forms/FormMaquina"
import FormServicio from "@/components/maquinaria/forms/FormServicio"
import FormCliente from "@/components/maquinaria/forms/FormCliente"
import s, { AZUL, ESTADO_ARRIENDO, ESTADO_MAQUINA } from "./EstilosMaquinaria"

// Página de ingreso del módulo maquinaria. Todo lo que escribe datos vive aquí;
// las vistas (resumen, arriendos, equipos, servicios, clientes) son solo de lectura.
// URL: /maquinaria/registrar?tipo=arriendo|maquina|servicio|cliente&id=5&inicio=2026-11-05
const TABS = [
  { id: "arriendo", label: "Arriendos", icono: ClipboardList },
  { id: "maquina", label: "Equipos", icono: Wrench },
  { id: "servicio", label: "Servicios", icono: Settings },
  { id: "cliente", label: "Clientes", icono: Users },
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
  const { arriendos, maquinas, servicios, clientes } = datos
  const catalogo = { clientes, maquinas, servicios }

  const lista = { arriendo: arriendos, maquina: maquinas, servicio: servicios, cliente: clientes }[tipo]
  const editando = id ? lista.find((x) => String(x.id) === id) : null

  // Valores iniciales para un registro nuevo (p. ej. fecha elegida en el calendario)
  const inicialNuevo = tipo === "arriendo" && params.get("inicio")
    ? { inicio: params.get("inicio"), fin: params.get("inicio") }
    : undefined

  const cambiarTab = (t) => { setQ(""); setParams({ tipo: t }) }
  const editar = (item) => { setParams({ tipo, id: String(item.id) }); window.scrollTo({ top: 0, behavior: "smooth" }) }
  const cancelar = () => setParams({ tipo })
  const alGuardar = async () => { setParams({ tipo }); await recargar() }

  const eliminar = async (item, texto, api) => {
    if (!window.confirm(texto)) return
    try { await api.eliminar(item.id); if (String(item.id) === id) cancelar(); await recargar() } catch (e) { setError(e.message) }
  }
  const togglePago = async (a) => {
    try { await arriendosApi.actualizar(a.id, { ...a, pagado: !a.pagado }); await recargar() } catch (e) { setError(e.message) }
  }

  // ---------- Formulario según pestaña ----------
  // key: fuerza a React a crear el formulario de nuevo al cambiar de registro (así toma el `inicial` nuevo)
  const key = `${tipo}-${editando?.id ?? "nuevo"}`
  const props = { inicial: editando ?? inicialNuevo, onGuardado: alGuardar, onCancel: editando ? cancelar : undefined }
  const formulario = {
    arriendo: <FormArriendo key={key} {...props} catalogo={catalogo} />,
    maquina: <FormMaquina key={key} {...props} />,
    servicio: <FormServicio key={key} {...props} maquinas={maquinas} />,
    cliente: <FormCliente key={key} {...props} />,
  }[tipo]

  // ---------- Lista de gestión (editar / eliminar) ----------
  const filas = useMemo(() => {
    const t = q.trim().toLowerCase()
    const texto = {
      arriendo: (a) => `${a.cliente?.nombre} ${a.maquina?.nombre} ${a.servicio?.nombre} ${a.predio ?? ""}`,
      maquina: (m) => `${m.nombre} ${m.modelo} ${m.tipo}`,
      servicio: (sv) => `${sv.nombre} ${sv.descripcion ?? ""}`,
      cliente: (c) => `${c.nombre} ${c.rut ?? ""} ${c.comuna ?? ""}`,
    }[tipo]
    let r = lista.filter((x) => !t || texto(x).toLowerCase().includes(t))
    if (tipo === "arriendo") r = [...r].sort((a, b) => b.inicio.localeCompare(a.inicio))
    return r.slice(0, 50)
  }, [lista, q, tipo])

  const columnas = {
    arriendo: ["Cliente", "Máquina / Servicio", "Inicio", "Monto", "Pago", "Estado", ""],
    maquina: ["Nombre / Modelo", "Tipo", "Estado", ""],
    servicio: ["Servicio", "Unidad", "Máquinas", ""],
    cliente: ["Nombre / RUT", "Comuna", "Tipo", "Estado", ""],
  }[tipo]

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
          <p style={s.sub}>Ingreso y edición de arriendos, equipos, servicios y clientes</p>
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

      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar} />

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
