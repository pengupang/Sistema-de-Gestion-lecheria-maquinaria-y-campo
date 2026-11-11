import { useCallback, useMemo, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { Pencil, Trash2, Search, Check, ShoppingBasket, Truck, Receipt, PawPrint, LandPlot, Stethoscope, Upload } from "lucide-react"
import {
  insumos as insumosApi, proveedores as proveedoresApi, gastos as gastosApi,
  animales as animalesApi, potreros as potrerosApi, sanidad as sanidadApi, etiquetaAnimal, hoyISO,
} from "@/services/lecheria"
import useCarga from "@/lib/useCarga"
import { clp } from "@/lib/formato"
import EstadoCarga from "@/components/EstadoCarga"
import FormInsumo from "@/components/lecheria/forms/FormInsumo"
import FormProveedor from "@/components/lecheria/forms/FormProveedor"
import FormGasto from "@/components/lecheria/forms/FormGasto"
import FormAnimal from "@/components/lecheria/forms/FormAnimal"
import FormPotrero from "@/components/lecheria/forms/FormPotrero"
import FormSanidad from "@/components/lecheria/forms/FormSanidad"
import ImportarAnimales from "@/components/lecheria/ImportarAnimales"
import s from "./estilosLecheria"
import tw from "@/lib/ui"
import {
  TIPOS_EVENTO, CATEGORIAS_ANIMAL, ESTADOS_POTRERO, COLORES_GASTO, ESTADO_SANIDAD, estadoStock, fechaCorta,
} from "./constantesLecheria"

const VERDE = "#3D6B4F"

// Página de ingreso del módulo lechería. Todo lo que escribe datos vive aquí;
// las vistas (comidas, proveedores, gastos, rebaño, sanidad, calendario) son solo de lectura.
// URL: /lecheria/registrar?tipo=insumo|proveedor|gasto|animal|potrero|sanidad|importar&id=5
//      (sanidad acepta además &fecha=2026-11-10 y &animal=3 para prellenar)
const TABS = [
  { id: "insumo", label: "Alimentos e insumos", icono: ShoppingBasket },
  { id: "proveedor", label: "Proveedores", icono: Truck },
  { id: "gasto", label: "Gastos", icono: Receipt },
  { id: "animal", label: "Animales", icono: PawPrint },
  { id: "potrero", label: "Potreros", icono: LandPlot },
  { id: "sanidad", label: "Sanidad", icono: Stethoscope },
  { id: "importar", label: "Importar animales", icono: Upload },
]

export default function IngresoLecheria() {
  const [params, setParams] = useSearchParams()
  const tipo = TABS.some((t) => t.id === params.get("tipo")) ? params.get("tipo") : "insumo"
  const id = params.get("id")
  const [q, setQ] = useState("")

  const cargarTodo = useCallback(async () => {
    const [insumos, proveedores, gastos, animales, potreros, sanidad] = await Promise.all([
      insumosApi.listar(), proveedoresApi.listar(), gastosApi.listar(),
      animalesApi.listar(), potrerosApi.listar(), sanidadApi.listar(),
    ])
    return { insumos, proveedores, gastos, animales, potreros, sanidad }
  }, [])
  const { datos, cargando, error, setError, recargar } = useCarga(cargarTodo, {
    insumos: [], proveedores: [], gastos: [], animales: [], potreros: [], sanidad: [],
  })
  const { insumos, proveedores, gastos, animales, potreros, sanidad } = datos
  const catalogo = { insumos, proveedores, animales, potreros }

  const lista = { insumo: insumos, proveedor: proveedores, gasto: gastos, animal: animales, potrero: potreros, sanidad, importar: animales }[tipo]
  const editando = id ? lista.find((x) => String(x.id) === id) : null

  // Valores iniciales para un registro nuevo (p. ej. día elegido en el calendario)
  const inicialNuevo =
    tipo === "sanidad" && (params.get("fecha") || params.get("animal"))
      ? { ...(params.get("fecha") ? { fecha: params.get("fecha") } : {}), ...(params.get("animal") ? { animal_id: params.get("animal") } : {}) }
      : undefined

  const nombreProveedor = (pid) => proveedores.find((p) => p.id === pid)?.nombre
  const nombrePotrero = (pid) => potreros.find((p) => p.id === pid)?.nombre
  const animalDe = (aid) => animales.find((a) => a.id === aid)
  const ocupacion = (pid) => animales.filter((a) => a.estado === "activo" && a.potrero_id === pid).length
  const hoy = hoyISO()
  const estadoSanidad = (r) => (r.estado === "pendiente" && r.fecha < hoy ? "vencido" : r.estado)

  const cambiarTab = (t) => { setQ(""); setParams({ tipo: t }) }
  const editar = (item) => { setParams({ tipo, id: String(item.id) }); window.scrollTo({ top: 0, behavior: "smooth" }) }
  const cancelar = () => setParams({ tipo })
  const alGuardar = async () => { setParams({ tipo }); await recargar() }

  const eliminar = async (item, texto, api) => {
    if (!window.confirm(texto)) return
    try { await api.eliminar(item.id); if (String(item.id) === id) cancelar(); await recargar() } catch (e) { setError(e.message) }
  }

  // Marca un registro sanitario como realizado y, si tenía próximo control, ofrece programarlo
  const marcarRealizado = async (r) => {
    try {
      await sanidadApi.actualizar(r.id, { estado: "realizado" })
      if (r.proximo_control && window.confirm(`¿Programar el siguiente control para el ${fechaCorta(r.proximo_control)}?`)) {
        const { id: _id, ...resto } = r // eslint-disable-line no-unused-vars
        await sanidadApi.crear({ ...resto, fecha: r.proximo_control, proximo_control: null, estado: "pendiente" })
      }
      await recargar()
    } catch (e) {
      setError(e.message)
    }
  }

  // ---------- Formulario según pestaña ----------
  // key: fuerza a React a crear el formulario de nuevo al cambiar de registro (así toma el `inicial` nuevo)
  const key = `${tipo}-${editando?.id ?? "nuevo"}-${params.get("fecha") ?? ""}-${params.get("animal") ?? ""}`
  const props = { inicial: editando ?? inicialNuevo, onGuardado: alGuardar, onCancel: editando ? cancelar : undefined, catalogo }
  const formulario = {
    insumo: <FormInsumo key={key} {...props} />,
    proveedor: <FormProveedor key={key} {...props} />,
    gasto: <FormGasto key={key} {...props} />,
    animal: <FormAnimal key={key} {...props} />,
    potrero: <FormPotrero key={key} {...props} />,
    sanidad: <FormSanidad key={key} {...props} />,
    importar: <ImportarAnimales key={key} catalogo={catalogo} onImportado={recargar} />,
  }[tipo]

  // ---------- Lista de gestión (editar / eliminar) ----------
  const filas = useMemo(() => {
    const t = q.trim().toLowerCase()
    const texto = {
      insumo: (i) => `${i.nombre} ${i.categoria ?? ""} ${nombreProveedor(i.proveedor_id) ?? ""}`,
      proveedor: (p) => `${p.nombre} ${p.rut ?? ""} ${p.rubro ?? ""} ${p.contacto ?? ""}`,
      gasto: (g) => `${g.descripcion} ${g.categoria} ${g.documento ?? ""} ${nombreProveedor(g.proveedor_id) ?? ""}`,
      animal: (a) => `${a.arete} ${a.nombre ?? ""} ${CATEGORIAS_ANIMAL[a.categoria] ?? ""}`,
      potrero: (p) => `${p.nombre} ${p.tipo_pradera ?? ""}`,
      sanidad: (r) => `${etiquetaAnimal(animalDe(r.animal_id))} ${r.tipo} ${r.producto ?? ""}`,
      importar: (a) => `${a.arete} ${a.nombre ?? ""}`,
    }[tipo]
    let r = lista.filter((x) => !t || texto(x).toLowerCase().includes(t))
    if (tipo === "sanidad")
      r = [...r].sort((a, b) => (a.estado !== b.estado ? (a.estado === "pendiente" ? -1 : 1) : b.fecha.localeCompare(a.fecha)))
    return r.slice(0, 50)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lista, q, tipo, proveedores, animales])

  const columnas = {
    insumo: ["Producto", "Stock", "Mínimo", "Estado", ""],
    proveedor: ["Empresa / RUT", "Rubro", "Contacto", ""],
    gasto: ["Fecha", "Descripción", "Categoría", "Monto", ""],
    animal: ["Arete / Nombre", "Categoría", "Potrero", "Estado", ""],
    potrero: ["Potrero", "Superficie", "Ocupación", "Estado", ""],
    sanidad: ["Fecha", "Animal", "Tipo", "Estado", ""],
    importar: [],
  }[tipo]

  const acciones = (item, texto, api) => (
    <td className={tw.td}>
      <div className={tw.actions}>
        <button style={s.iconBtnGreen} title="Editar" onClick={() => editar(item)}><Pencil size={14} /></button>
        <button style={s.iconBtnRed} title="Eliminar" onClick={() => eliminar(item, texto, api)}><Trash2 size={14} /></button>
      </div>
    </td>
  )
  const sub = (txt) => (txt ? <span style={{ display: "block", fontSize: 11, color: "#94A3B8" }}>{txt}</span> : null)

  const fila = (x) => {
    const marcada = String(x.id) === id ? { outline: `2px solid ${VERDE}`, outlineOffset: -2 } : {}
    if (tipo === "insumo") {
      const st = estadoStock(x.stock, x.minimo)
      return (
        <tr key={x.id} style={marcada}>
          <td className={tw.td}><span style={s.nombre}>{x.nombre}</span>{sub(x.categoria)}</td>
          <td className={tw.td}>{Number(x.stock).toLocaleString("es-CL")} {x.unidad}</td>
          <td className={tw.td}>{Number(x.minimo).toLocaleString("es-CL")} {x.unidad}</td>
          <td className={tw.td}><span style={{ ...s.badge, backgroundColor: st.bg, color: st.color }}>{st.label}</span></td>
          {acciones(x, `¿Eliminar "${x.nombre}"?`, insumosApi)}
        </tr>
      )
    }
    if (tipo === "proveedor") return (
      <tr key={x.id} style={marcada}>
        <td className={tw.td}><span style={s.nombre}>{x.nombre}</span>{sub(x.rut)}</td>
        <td className={tw.td}>{x.rubro || "—"}</td>
        <td className={tw.td}>{x.contacto || "—"}{sub(x.telefono)}</td>
        {acciones(x, `¿Eliminar a ${x.nombre}? Sus gastos e insumos quedarán sin proveedor.`, proveedoresApi)}
      </tr>
    )
    if (tipo === "gasto") return (
      <tr key={x.id} style={marcada}>
        <td className={tw.td}>{fechaCorta(x.fecha)}</td>
        <td className={tw.td}><span style={s.nombre}>{x.descripcion}</span>{sub(x.documento && `Doc. ${x.documento}`)}</td>
        <td className={tw.td}>
          <span style={{ ...s.badge, backgroundColor: (COLORES_GASTO[x.categoria] ?? "#94A3B8") + "20", color: COLORES_GASTO[x.categoria] ?? "#64748B" }}>{x.categoria}</span>
        </td>
        <td className={tw.td} style={{ fontWeight: 600 }}>{clp(x.monto)}</td>
        {acciones(x, `¿Eliminar "${x.descripcion}" (${fechaCorta(x.fecha)})?`, gastosApi)}
      </tr>
    )
    if (tipo === "animal") return (
      <tr key={x.id} style={marcada}>
        <td className={tw.td}><span style={s.nombre}>{x.arete}</span>{sub(x.nombre)}</td>
        <td className={tw.td}>{CATEGORIAS_ANIMAL[x.categoria] ?? x.categoria}</td>
        <td className={tw.td}>{nombrePotrero(x.potrero_id) ?? "Sin potrero"}</td>
        <td className={tw.td}>
          <span style={{ ...s.badge, backgroundColor: x.estado === "activo" ? "#D1FAE5" : "#F1F5F9", color: x.estado === "activo" ? "#065F46" : "#64748B" }}>
            {x.estado === "activo" ? "Activo" : "Baja"}
          </span>
        </td>
        {acciones(x, `¿Eliminar a ${x.arete}? También se borrará su historial sanitario.`, animalesApi)}
      </tr>
    )
    if (tipo === "potrero") {
      const est = ESTADOS_POTRERO[x.estado]
      const n = ocupacion(x.id)
      return (
        <tr key={x.id} style={marcada}>
          <td className={tw.td}><span style={s.nombre}>{x.nombre}</span>{sub(x.tipo_pradera)}</td>
          <td className={tw.td}>{x.superficie_ha} ha</td>
          <td className={tw.td} style={{ color: x.capacidad > 0 && n > x.capacidad ? "#DC2626" : undefined }}>{n} / {x.capacidad}</td>
          <td className={tw.td}>{est && <span style={{ ...s.badge, backgroundColor: est.bg, color: est.color }}>{est.label}</span>}</td>
          {acciones(x, `¿Eliminar ${x.nombre}?${n > 0 ? ` Tiene ${n} animal(es) que quedarán sin potrero.` : ""}`, potrerosApi)}
        </tr>
      )
    }
    // sanidad
    const t = TIPOS_EVENTO[x.tipo]
    const b = ESTADO_SANIDAD[estadoSanidad(x)]
    return (
      <tr key={x.id} style={marcada}>
        <td className={tw.td}>{fechaCorta(x.fecha)}</td>
        <td className={tw.td}><span style={s.nombre}>{etiquetaAnimal(animalDe(x.animal_id))}</span>{sub(x.producto)}</td>
        <td className={tw.td}><span style={{ ...s.badge, backgroundColor: t?.bg, color: t?.color }}>{x.tipo}</span></td>
        <td className={tw.td}>
          {x.estado === "pendiente" ? (
            <button onClick={() => marcarRealizado(x)} title="Marcar como realizado"
              style={{ ...s.badge, border: "none", cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 4, backgroundColor: b.bg, color: b.color }}>
              <Check size={12} /> {b.label}
            </button>
          ) : (
            <span style={{ ...s.badge, backgroundColor: b.bg, color: b.color }}>{b.label}</span>
          )}
        </td>
        {acciones(x, "¿Eliminar este registro sanitario?", sanidadApi)}
      </tr>
    )
  }

  return (
    <div className={tw.container}>
      <div className={tw.topBar}>
        <div>
          <h2 style={s.title}>Registrar en Lechería</h2>
          <p style={s.sub}>Ingreso y edición de insumos, proveedores, gastos, animales, potreros y registros sanitarios; importación de animales desde el lector RFID</p>
        </div>
      </div>

      <div className={tw.tabs}>
        {TABS.map(({ id: t, label, icono: Icono }) => (
          <button key={t} onClick={() => cambiarTab(t)}
            className={tw.tab} style={{ display: "flex", alignItems: "center", gap: 6, ...(tipo === t ? s.tabActive : {}) }}>
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

          {tipo !== "importar" && (
          <div className="flex flex-col gap-2.5">
            <div className={tw.filtros} style={{ justifyContent: "space-between" }}>
              <h3 style={{ ...s.modalTitle, fontSize: 14 }}>Registros existentes</h3>
              <div className={tw.buscador}>
                <Search size={14} color="#94A3B8" />
                <input className={tw.buscadorInput} placeholder="Buscar..." value={q} onChange={(e) => setQ(e.target.value)} />
              </div>
            </div>
            <div className={tw.tableCard}>
              <table className={tw.table}>
                <thead><tr>{columnas.map((h) => <th key={h} className={tw.th}>{h}</th>)}</tr></thead>
                <tbody>
                  {filas.map(fila)}
                  {filas.length === 0 && <tr><td colSpan={columnas.length} style={s.vacio}>Sin registros.</td></tr>}
                </tbody>
              </table>
            </div>
            <p style={{ ...s.sub, margin: 0 }}>Se muestran hasta 50 registros; usa el buscador para encontrar otros.</p>
          </div>
          )}
        </>
      )}
    </div>
  )
}
