// ─────────────────────────────────────────────────────────────────────────────
// Capa de datos de MAQUINARIA (Supabase)
// Tablas: clientes_maquinaria, maquinas, servicios, maquina_servicio, arriendos, facturas,
//         mantenciones_maquinas · Vistas: calendario_maquinas, historico_ingresos_mensual
// Los montos están en pesos NETOS (sin IVA); la factura agrega el 19 %.
// ─────────────────────────────────────────────────────────────────────────────
import { supabase } from "../lib/supabase"
import { crud, traerTodo, check, mensajeAmigable } from "./db"
import { normalizarRut, formatearRut } from "../lib/auth"

export const IVA = 0.19

const iso = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
export const hoyISO = () => iso(new Date())

// ───────────── Máquinas ─────────────
export const maquinas = crud("maquinas")

// ───────────── Servicios (con las máquinas que pueden realizarlos) ─────────────
const COLS_SERVICIO = ["nombre", "descripcion", "unidad", "nota"]
const pick = (obj, cols) => Object.fromEntries(cols.filter((c) => c in obj).map((c) => [c, obj[c]]))

async function fijarMaquinas(servicioId, ids = []) {
  const del = await supabase.from("maquina_servicio").delete().eq("servicio_id", servicioId)
  if (del.error) throw new Error(mensajeAmigable(del.error))
  if (ids.length) {
    const ins = await supabase
      .from("maquina_servicio")
      .insert(ids.map((maquina_id) => ({ maquina_id, servicio_id: servicioId })))
    if (ins.error) throw new Error(mensajeAmigable(ins.error))
  }
}

export const servicios = {
  listar: async () => {
    const filas = await traerTodo(() =>
      supabase.from("servicios").select("*, maquina_servicio(maquina_id)").order("id")
    )
    return filas.map(({ maquina_servicio, ...s }) => ({ ...s, maquinas: maquina_servicio.map((m) => m.maquina_id) }))
  },
  crear: async (datos) => {
    const s = check(await supabase.from("servicios").insert(pick(datos, COLS_SERVICIO)).select().single())
    await fijarMaquinas(s.id, datos.maquinas)
    return s
  },
  actualizar: async (id, datos) => {
    check(await supabase.from("servicios").update(pick(datos, COLS_SERVICIO)).eq("id", id).select().single())
    await fijarMaquinas(id, datos.maquinas)
  },
  eliminar: async (id) => {
    const { error } = await supabase.from("servicios").delete().eq("id", id)
    if (error) throw new Error(mensajeAmigable(error))
  },
}

// ───────────── Clientes ─────────────
// Los clientes de maquinaria tienen su propia tabla (clientes_maquinaria).
const aUI = (c) => ({
  ...c,
  rut: c.rut_numero ? formatearRut(`${c.rut_numero}${c.rut_dv ?? ""}`) : "",
  telefono_txt: c.telefono ? `+${c.codigo_pais ?? 56} ${c.telefono}` : "",
})

// "+56 9 7219 5866" -> { codigo_pais: 56, telefono: 972195866 }
function leerTelefono(txt = "") {
  const t = txt.trim()
  const digitos = t.replace(/\D/g, "")
  if (!digitos) return { codigo_pais: 56, telefono: null }
  if (t.startsWith("+") && !t.startsWith("+56")) return { codigo_pais: Number(digitos.slice(0, 2)), telefono: Number(digitos.slice(2)) }
  const local = digitos.startsWith("56") ? digitos.slice(2) : digitos
  return { codigo_pais: 56, telefono: local ? Number(local) : null }
}

function aBD(f) {
  const rut = normalizarRut(f.rut)
  return {
    nombre: f.nombre.trim(),
    rut_numero: rut ? Number(rut.slice(0, -1)) : null,
    rut_dv: rut ? rut.slice(-1) : null,
    ...leerTelefono(f.telefono_txt),
    email: f.email?.trim() || null,
    direccion: f.direccion?.trim() || null,
    comuna: f.comuna?.trim() || null,
    tipo: f.tipo || "Agrícola",
    activo: !!f.activo,
  }
}

export const clientes = {
  listar: async () =>
    (await traerTodo(() => supabase.from("clientes_maquinaria").select("*").order("nombre").order("id"))).map(aUI),
  crear: async (f) => aUI(check(await supabase.from("clientes_maquinaria").insert(aBD(f)).select().single())),
  actualizar: async (id, f) => aUI(check(await supabase.from("clientes_maquinaria").update(aBD(f)).eq("id", id).select().single())),
  eliminar: async (id) => {
    const { error } = await supabase.from("clientes_maquinaria").delete().eq("id", id)
    if (error)
      throw new Error(
        error.code === "23503"
          ? "Este cliente tiene arriendos o facturas. En vez de eliminarlo, márcalo como Inactivo."
          : mensajeAmigable(error)
      )
  },
}

// ───────────── Arriendos ─────────────
const SEL_ARRIENDO = "*, cliente:clientes_maquinaria(nombre), maquina:maquinas(nombre, modelo), servicio:servicios(nombre)"
const COLS_ARRIENDO = [
  "cliente_id", "maquina_id", "servicio_id", "inicio", "fin", "cantidad", "unidad",
  "monto", "pagado", "estado", "notas", "predio", "comuna", "operador",
]
const baseArriendos = crud("arriendos", { select: SEL_ARRIENDO, orden: "inicio", ascendente: false })

export const arriendos = {
  listar: baseArriendos.listar,
  crear: (datos) => baseArriendos.crear(pick(datos, COLS_ARRIENDO)),
  actualizar: (id, datos) => baseArriendos.actualizar(id, pick(datos, COLS_ARRIENDO)),
  eliminar: baseArriendos.eliminar, // las facturas del arriendo se borran en cascada
}

// ───────────── Facturas ─────────────
export const facturas = {
  listar: () =>
    traerTodo(() =>
      supabase
        .from("facturas")
        .select("*, cliente:clientes_maquinaria(nombre), arriendo:arriendos(predio, maquina:maquinas(nombre, modelo), servicio:servicios(nombre))")
        .order("fecha_emision", { ascending: false })
        .order("id")
    ),
}

// ───────────── Documentos (facturas y boletas escaneadas; también llegan por el bot) ─────────────
const baseDocumentos = crud("facturas_archivos", { orden: "creado_en", ascendente: false })

const TIPOS_DOC = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }
const MAX_DOC = 15 * 1024 * 1024 // 15 MB, igual que el bot

export const documentos = {
  listar: baseDocumentos.listar,       // tal cual: solo lee la tabla
  actualizar: baseDocumentos.actualizar, // para editar la nota

  // Enlace temporal (1 hora) para abrir un archivo del bucket privado
  urlFirmada: async (ruta) => {
    const { data, error } = await supabase.storage.from("facturas").createSignedUrl(ruta, 3600)
    if (error) throw new Error(error.message)
    return data.signedUrl
  },

  // Sube el archivo al bucket y registra la fila; si la fila falla, borra el archivo
  subir: async (archivo, nota, empresaId, userId) => {
    const ext = TIPOS_DOC[archivo.type]
    if (!ext) throw new Error("Solo se aceptan PDF o imágenes (JPG, PNG, WEBP).")
    if (archivo.size > MAX_DOC) throw new Error("El archivo pesa más de 15 MB.")

    const hoy = hoyISO()
    const ruta = `${empresaId}/${hoy.slice(0, 4)}/${hoy.slice(5, 7)}/${crypto.randomUUID()}.${ext}`

    const { error: errSubida } = await supabase.storage.from("facturas").upload(ruta, archivo, { contentType: archivo.type })
    if (errSubida) throw new Error(errSubida.message)

    try {
      return await baseDocumentos.crear({
        empresa_id: empresaId, subido_por: userId, ruta,
        nombre_original: archivo.name.slice(0, 200), tipo_mime: archivo.type,
        tamano: archivo.size, nota: nota?.trim() || null, origen: "web",
      })
    } catch (e) {
      await supabase.storage.from("facturas").remove([ruta]) // no dejar archivos huérfanos
      throw e
    }
  },

  // Borra la fila y después el archivo
  eliminar: async (doc) => {
    await baseDocumentos.eliminar(doc.id)
    await supabase.storage.from("facturas").remove([doc.ruta])
  },
}

// ───────────── Calendario (arriendos + mantenciones que tocan el rango) ─────────────
export const calendario = async (desde, hasta) =>
  traerTodo(() =>
    supabase
      .from("calendario_maquinas")
      .select("*")
      .lte("inicio", hasta)
      .gte("fin", desde)
      .order("inicio")
      .order("origen")
      .order("id")
  )

// ───────────── Históricos ─────────────
// [{ anio, mes, ingresos_neto, trabajos }] solo de trabajos finalizados
export const ingresosMensuales = () =>
  traerTodo(() => supabase.from("historico_ingresos_mensual").select("*").order("anio").order("mes"))

// ───────────── Dashboard ─────────────
export async function resumenMaquinaria() {
  const hoy = new Date()
  const ini = iso(new Date(hoy.getFullYear(), hoy.getMonth(), 1))
  const fin = iso(new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0))

  const [maq, cli, delMes, recientes, mant] = await Promise.all([
    supabase.from("maquinas").select("id, estado"),
    supabase.from("clientes_maquinaria").select("id", { count: "exact", head: true }).eq("activo", true),
    supabase.from("arriendos").select("monto, estado").gte("inicio", ini).lte("inicio", fin),
    supabase
      .from("arriendos")
      .select(SEL_ARRIENDO)
      .in("estado", ["Activo", "Finalizado"])
      .lte("inicio", hoyISO())
      .order("inicio", { ascending: false })
      .limit(8),
    supabase
      .from("mantenciones_maquinas")
      .select("id, inicio, tipo, taller, maquina:maquinas(nombre, modelo)")
      .eq("estado", "Programada")
      .gte("inicio", hoyISO())
      .order("inicio")
      .limit(5),
  ])
  for (const r of [maq, cli, delMes, recientes, mant]) if (r.error) throw new Error(r.error.message)

  const cuenta = (e) => maq.data.filter((m) => m.estado === e).length
  return {
    totalMaquinas: maq.data.length,
    disponibles: cuenta("Disponible"),
    arrendadas: cuenta("Arrendada"),
    enMantencion: cuenta("Mantención"),
    clientesActivos: cli.count ?? 0,
    arriendosMes: delMes.data.length,
    ingresosMes: delMes.data.filter((a) => a.estado !== "Pendiente").reduce((s, a) => s + Number(a.monto), 0),
    recientes: recientes.data,
    proximasMantenciones: mant.data,
  }
}

export const etiquetaMaquina = (m) => (m ? `${m.nombre} ${m.modelo}`.trim() : "—")

// Listas para los formularios de arriendo: clientes activos, máquinas y servicios (con sus máquinas)
export async function catalogos() {
  const [cl, mq, sv] = await Promise.all([
    traerTodo(() => supabase.from("clientes_maquinaria").select("id, nombre").eq("activo", true).order("nombre").order("id")),
    maquinas.listar(),
    servicios.listar(),
  ])
  return { clientes: cl, maquinas: mq, servicios: sv }
}

//____________Falllas________
export const fallas = crud("fallas_maquinas", {
  select: "*, maquina:maquinas(nombre,modelo),arriendo:arriendos(inicio,fin,cliente:clientes_maquinaria(nombre))",
  orden: "inicio",
  ascendente: false,
})

//______Mantenciones________
export const mantenciones_maquinas = crud("mantenciones_maquinas",{
  select: "*, maquina:maquinas(nombre,modelo)",
  orden:"inicio",
  ascendente: false,
})


