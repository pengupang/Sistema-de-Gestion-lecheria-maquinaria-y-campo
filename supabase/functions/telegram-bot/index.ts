// Bot de Telegram de PlantCare (un solo archivo).
// Despliegue:  supabase functions deploy telegram-bot --no-verify-jwt
// @ts-nocheck  (el editor usa TypeScript de Node y no entiende Deno; esto solo silencia el editor)
import { createClient } from "npm:@supabase/supabase-js@2"

// Cliente con clave de servicio (solo en el servidor): se salta RLS, por eso SIEMPRE filtramos por empresa_id.
export const admin = () =>
  createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, {
    auth: { persistSession: false },
  })
export type Sb = ReturnType<typeof admin>

// ── utilidades ──────────────────────────────────────────────
export const esc = (v: unknown) =>
  String(v ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
export const hoyChile = () => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date())
export const sumarDias = (iso: string, n: number) => {
  const d = new Date(iso + "T12:00:00Z")
  d.setUTCDate(d.getUTCDate() + n)
  return d.toISOString().slice(0, 10)
}
const fmt = (iso: string) => iso.slice(8, 10) + "/" + iso.slice(5, 7)
const clp = (n: number) => "$" + Number(n).toLocaleString("es-CL")
// deno-lint-ignore no-explicit-any
const un = (x: any) => (Array.isArray(x) ? x[0] : x)
// deno-lint-ignore no-explicit-any
const nombreAnimal = (a: any) => {
  a = un(a)
  return a ? esc(a.arete) + (a.nombre ? ` (${esc(a.nombre)})` : "") : "—"
}
const bloque = (titulo: string, lineas: string[]) => (lineas.length ? `<b>${titulo}</b>\n${lineas.join("\n")}` : "")

export async function enviar(chatId: string | number, texto: string) {
  if (texto.length > 4000) texto = texto.slice(0, texto.lastIndexOf("\n", 4000)) + "\n…"
  const token = Deno.env.get("TELEGRAM_BOT_TOKEN")!
  const r = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text: texto, parse_mode: "HTML", disable_web_page_preview: true }),
  })
  return r.ok
}

// ── permisos: qué áreas puede ver un usuario en una empresa ──
export async function areasUsuario(sb: Sb, userId: string, empresaId: string): Promise<string[]> {
  const [{ data: ms }, { data: mods }] = await Promise.all([
    sb.from("membresias").select("rol").eq("user_id", userId).eq("empresa_id", empresaId).eq("activa", true),
    sb.from("empresa_modulos").select("modulo").eq("empresa_id", empresaId).eq("activo", true),
  ])
  const roles = (ms ?? []).map((m) => m.rol)
  const modulos = (mods ?? []).map((m) => m.modulo)
  const set = new Set<string>()
  if (roles.includes("admin")) modulos.forEach((m) => set.add(m))
  for (const r of roles) if ((r === "lecheria" || r === "maquinaria") && modulos.includes(r)) set.add(r)
  return [...set]
}

// ── consultas de lechería ───────────────────────────────────
export async function stockBajo(sb: Sb, emp: string) {
  const { data, error } = await sb.from("insumos").select("nombre, stock, minimo, unidad").eq("empresa_id", emp).order("nombre")
  if (error) throw error
  return (data ?? [])
    .filter((i) => Number(i.stock) <= Number(i.minimo))
    .map((i) => `• ${esc(i.nombre)}: ${i.stock} ${esc(i.unidad)} (mín. ${i.minimo})`)
}

async function sanidad(sb: Sb, emp: string, hoy: string, hasta: string) {
  const { data, error } = await sb
    .from("sanidad_registros")
    .select("tipo, fecha, animales(arete, nombre)")
    .eq("empresa_id", emp)
    .eq("estado", "pendiente")
    .lte("fecha", hasta)
    .order("fecha")
  if (error) throw error
  // deno-lint-ignore no-explicit-any
  const linea = (r: any) => `• ${fmt(r.fecha)} · ${esc(r.tipo)} · ${nombreAnimal(r.animales)}`
  const filas = data ?? []
  return {
    atrasados: filas.filter((r) => r.fecha < hoy).map(linea),
    proximos: filas.filter((r) => r.fecha >= hoy).map(linea),
  }
}

// ── consultas de maquinaria ─────────────────────────────────
async function maquinaria(sb: Sb, emp: string, hoy: string, hasta: string) {
  const [arr, man, fac] = await Promise.all([
    sb.from("arriendos").select("inicio, fin, clientes_maquinaria(nombre), maquinas(nombre)").eq("empresa_id", emp)
      .in("estado", ["Activo", "Pendiente"])
      .or(`and(inicio.gte.${hoy},inicio.lte.${hasta}),and(fin.gte.${hoy},fin.lte.${hasta})`),
    sb.from("mantenciones_maquinas").select("inicio, fin, tipo, maquinas(nombre)").eq("empresa_id", emp)
      .eq("estado", "Programada").lte("inicio", hasta).gte("fin", hoy),
    sb.from("facturas").select("numero, total, fecha_vencimiento, clientes_maquinaria(nombre)").eq("empresa_id", emp)
      .neq("estado", "Pagada").lt("fecha_vencimiento", hoy).order("fecha_vencimiento"),
  ])
  for (const r of [arr, man, fac]) if (r.error) throw r.error

  const eventos: { f: string; t: string }[] = []
  for (const r of arr.data ?? []) {
    const quien = `${esc(un(r.maquinas)?.nombre)} → ${esc(un(r.clientes_maquinaria)?.nombre)}`
    if (r.inicio >= hoy && r.inicio <= hasta) eventos.push({ f: r.inicio, t: `• ${fmt(r.inicio)} inicia arriendo · ${quien}` })
    if (r.fin >= hoy && r.fin <= hasta) eventos.push({ f: r.fin, t: `• ${fmt(r.fin)} termina arriendo · ${quien}` })
  }
  for (const r of man.data ?? []) {
    eventos.push({ f: r.inicio, t: `• ${fmt(r.inicio)} mantención (${esc(r.tipo)}) · ${esc(un(r.maquinas)?.nombre)}` })
  }
  eventos.sort((a, b) => a.f.localeCompare(b.f))
  return {
    eventos: eventos.map((e) => e.t),
    vencidas: (fac.data ?? []).map(
      (f) => `• N° ${f.numero} · ${esc(un(f.clientes_maquinaria)?.nombre)} · ${clp(f.total)} (venció ${fmt(f.fecha_vencimiento)})`,
    ),
  }
}

// ── textos que arma el bot ──────────────────────────────────
export async function agendaTexto(sb: Sb, emp: string, areas: string[], dias: number) {
  const hoy = hoyChile()
  const hasta = sumarDias(hoy, dias)
  const partes: string[] = []
  if (areas.includes("lecheria")) {
    const s = await sanidad(sb, emp, hoy, hasta)
    partes.push(bloque("⚠️ Controles atrasados", s.atrasados), bloque(`🐄 Sanidad · próximos ${dias} días`, s.proximos))
  }
  if (areas.includes("maquinaria")) {
    const m = await maquinaria(sb, emp, hoy, hasta)
    partes.push(bloque(`🚜 Maquinaria · próximos ${dias} días`, m.eventos), bloque("💸 Facturas vencidas", m.vencidas))
  }
  return partes.filter(Boolean).join("\n\n")
}

export async function resumenTexto(sb: Sb, emp: string, areas: string[]) {
  const partes: string[] = []
  if (areas.includes("lecheria")) partes.push(bloque("📦 Insumos bajo el mínimo", await stockBajo(sb, emp)))
  partes.push(await agendaTexto(sb, emp, areas, 3))
  return partes.filter(Boolean).join("\n\n")
}

export async function fichaAnimal(sb: Sb, emp: string, arete: string) {
  const { data: a, error } = await sb.from("animales").select("*, potreros(nombre)").eq("empresa_id", emp)
    .ilike("arete", arete.replace(/[%_\\]/g, "\\$&")).maybeSingle()
  if (error) throw error
  if (!a) return null
  const ids = [a.madre_id, a.padre_id].filter(Boolean)
  const { data: padres } = ids.length
    ? await sb.from("animales").select("id, arete, nombre").eq("empresa_id", emp).in("id", ids)
    : { data: [] }
  const por = (id: number | null) => (id ? nombreAnimal((padres ?? []).find((p) => p.id === id)) : null)
  const { data: pend } = await sb.from("sanidad_registros").select("tipo, fecha").eq("empresa_id", emp)
    .eq("animal_id", a.id).eq("estado", "pendiente").order("fecha").limit(3)

  const l = [
    `<b>${nombreAnimal(a)}</b> · ${esc(a.categoria.replace("_", " "))}${a.sexo ? " · " + esc(a.sexo) : ""}`,
    `Estado: ${esc(a.estado)}${a.estado === "baja" && a.motivo_baja ? " (" + esc(a.motivo_baja) + ")" : ""}`,
    `Potrero: ${esc(un(a.potreros)?.nombre ?? "sin potrero")}`,
    `Nacimiento: ${a.fecha_nacimiento ? a.fecha_nacimiento.split("-").reverse().join("/") : "—"}`,
    `Madre: ${por(a.madre_id) ?? "desconocida"}`,
    `Padre: ${por(a.padre_id) ?? (a.padre_externo ? esc(a.padre_externo) + " (externo)" : "desconocido")}`,
  ]
  if (pend?.length) l.push("", "<b>Controles pendientes</b>", ...pend.map((p) => `• ${fmt(p.fecha)} · ${esc(p.tipo)}`))
  return l.join("\n")
}

// ── Bot ─────────────────────────────────────────────────────

const AYUDA = `<b>Comandos</b>

<b>Día a día</b>
/resumen · alertas y agenda de los próximos 3 días
/agenda [días] · calendario (por defecto 7 días)
/stock · insumos bajo el mínimo
/animal ARETE · ficha de un animal

<b>Compras e inventario</b>
/pendientes · facturas por importar y compras por recibir
/compras [n] · últimas compras
/diferencias [n] · lo que dice la factura vs lo que llegó
/perdidas · plata perdida por faltantes
/movimientos [n] · últimos movimientos de inventario

<b>Facturas</b>
📎 Envíame la foto o el PDF y lo guardo (en el pie de foto escribe el N° o el proveedor).
/facturas [n] · últimas facturas guardadas

/menu · ver esta lista
/desvincular · desconectar este chat

Cada mañana a las 6:30 te llega el resumen automáticamente.`

const NO_VINCULADO = `Este chat aún no está vinculado.\nEn la app toca <b>Conectar Telegram</b>, copia el código y escribe aquí:\n/vincular CODIGO`


async function contexto(sb: Sb, chatId: string) {
  const { data } = await sb.from("vinculos_mensajeria").select("user_id, empresa_id, perfiles(empresa_activa_id, activo)")
    .eq("plataforma", "telegram").eq("chat_id", chatId).eq("verificado", true)
  const vs = (data ?? []).filter((v) => un(v.perfiles)?.activo !== false)
  if (!vs.length) return null
  const v = vs.find((x) => x.empresa_id === un(x.perfiles)?.empresa_activa_id) ?? vs[0]
  const areas = await areasUsuario(sb, v.user_id, v.empresa_id)
  return { userId: v.user_id as string, empresaId: v.empresa_id as string, areas }
}

async function manejar(sb: Sb, chatId: string, texto: string) {
  const [cmdRaw, ...resto] = texto.trim().split(/\s+/)
  const cmd = cmdRaw.split("@")[0].toLowerCase()

  if (cmd === "/start" || cmd === "/ayuda" || cmd === "/help" || cmd === "/menu") {
    return enviar(chatId, (await contexto(sb, chatId)) ? AYUDA : NO_VINCULADO)
  }

  if (cmd === "/vincular") {
    const codigo = (resto[0] ?? "").toUpperCase()
    if (!codigo) return enviar(chatId, "Uso: /vincular CODIGO\n(el código se genera en la app con <b>Conectar Telegram</b>)")
    const { data: c } = await sb.from("codigos_vinculacion").select("id, user_id, empresa_id").eq("codigo", codigo)
      .eq("usado", false).gt("expira_en", new Date().toISOString()).maybeSingle()
    if (!c) return enviar(chatId, "Código inválido o vencido. Genera uno nuevo en la app.")
    const { error } = await sb.from("vinculos_mensajeria").upsert(
      { user_id: c.user_id, empresa_id: c.empresa_id, plataforma: "telegram", chat_id: chatId, verificado: true },
      { onConflict: "plataforma,chat_id,empresa_id" },
    )
    if (error) throw error
    await sb.from("codigos_vinculacion").update({ usado: true }).eq("id", c.id)
    return enviar(chatId, "✅ Chat vinculado.\n\n" + AYUDA)
  }

  if (cmd === "/desvincular") {
    await sb.from("vinculos_mensajeria").delete().eq("plataforma", "telegram").eq("chat_id", chatId)
    return enviar(chatId, "Chat desvinculado. Ya no recibirás notificaciones.")
  }

  const ctx = await contexto(sb, chatId)
  if (!ctx) return enviar(chatId, NO_VINCULADO)
  if (!ctx.areas.length) return enviar(chatId, "Tu usuario no tiene acceso a ningún módulo en esta empresa.")
  const { empresaId, areas } = ctx

  if (cmd === "/resumen") return enviar(chatId, (await resumenTexto(sb, empresaId, areas)) || "Sin pendientes por ahora 🎉")

  if (cmd === "/agenda") {
    const dias = Math.min(Math.max(parseInt(resto[0] ?? "7") || 7, 1), 30)
    return enviar(chatId, (await agendaTexto(sb, empresaId, areas, dias)) || `Nada agendado en los próximos ${dias} días.`)
  }

  if (cmd === "/stock") {
    if (!areas.includes("lecheria")) return enviar(chatId, "Tu usuario no tiene acceso a Lechería.")
    const l = await stockBajo(sb, empresaId)
    return enviar(chatId, l.length ? "<b>📦 Insumos bajo el mínimo</b>\n" + l.join("\n") : "Todos los insumos están sobre el mínimo ✅")
  }

  if (cmd === "/animal") {
    if (!areas.includes("lecheria")) return enviar(chatId, "Tu usuario no tiene acceso a Lechería.")
    if (!resto[0]) return enviar(chatId, "Uso: /animal ARETE   (ej: /animal CL-0001)")
    return enviar(chatId, (await fichaAnimal(sb, empresaId, resto[0])) ?? "No encontré un animal con ese arete.")
  }

  if (["/compras", "/diferencias", "/perdidas", "/movimientos", "/pendientes"].includes(cmd)) {
    if (!areas.includes("lecheria")) return enviar(chatId, "Tu usuario no tiene acceso a Lechería.")
    if (cmd === "/compras") return conCompras(chatId, () => comprasTexto(sb, empresaId, nEntre(resto[0], 5, 15)))
    if (cmd === "/diferencias") return conCompras(chatId, () => diferenciasTexto(sb, empresaId, nEntre(resto[0], 5, 15)))
    if (cmd === "/perdidas") return conCompras(chatId, () => perdidasTexto(sb, empresaId, hoyChile()))
    if (cmd === "/movimientos") return conCompras(chatId, () => movimientosTexto(sb, empresaId, nEntre(resto[0], 10, 20)))
    return conCompras(chatId, () => pendientesTexto(sb, empresaId))
  }

  if (cmd === "/facturas") {
    const n = Math.min(Math.max(parseInt(resto[0] ?? "5") || 5, 1), 10)
    return enviar(chatId, await listarFacturas(sb, empresaId, n))
  }

  return enviar(chatId, "No reconozco ese comando.\n\n" + AYUDA)
}

// ── Compras e inventario (requiere aplicar sql/02_compras_inventario.sql) ───
const diaChile = (ts: string) => new Intl.DateTimeFormat("en-CA", { timeZone: "America/Santiago" }).format(new Date(ts))
const num = (n: unknown) => Number(n).toLocaleString("es-CL", { maximumFractionDigits: 3 })
const nEntre = (txt: string | undefined, def: number, max: number) => Math.min(Math.max(parseInt(txt ?? String(def)) || def, 1), max)
const ICONO_ESTADO: Record<string, string> = { "Por recibir": "⏳", "Recibida completa": "✅", "Con diferencias": "⚠️" }
const ETIQUETA_MOV: Record<string, string> = { entrada_compra: "entrada por compra", ajuste: "ajuste", consumo: "consumo", merma: "merma" }

// Si falta aplicar la migración, avisamos en vez de mostrar un error genérico
async function conCompras(chatId: string, fn: () => Promise<string>) {
  try {
    return await enviar(chatId, await fn())
  } catch (e) {
    // deno-lint-ignore no-explicit-any
    const code = (e as any)?.code
    if (code === "PGRST205" || code === "42P01") {
      return enviar(chatId, "Compras e inventario aún no está activado en la base de datos (falta aplicar la migración 02_compras_inventario.sql).")
    }
    throw e
  }
}

// deno-lint-ignore no-explicit-any
const lineaCompra = (c: any) =>
  `• #${c.id} · ${fmt(c.fecha_documento)} · ${esc(c.proveedor ?? "Sin proveedor")} · ${esc(c.tipo_documento)}${c.numero_documento ? " " + esc(c.numero_documento) : ""}` +
  `${c.total != null ? " · " + clp(c.total) : ""}\n   ${ICONO_ESTADO[c.estado] ?? ""} ${c.estado}` +
  `${c.estado === "Por recibir" ? ` (${c.lineas_contadas}/${c.lineas} líneas contadas)` : ""}` +
  `${Number(c.valor_perdido) > 0 ? " · perdido " + clp(c.valor_perdido) : ""}`

async function comprasTexto(sb: Sb, emp: string, n: number) {
  const { data, error } = await sb.from("compras_resumen").select("*").eq("empresa_id", emp)
    .order("fecha_documento", { ascending: false }).order("id", { ascending: false }).limit(n)
  if (error) throw error
  if (!data?.length) return "Aún no hay compras registradas."
  return "<b>🧾 Últimas compras</b>\n" + data.map(lineaCompra).join("\n")
}

async function diferenciasTexto(sb: Sb, emp: string, n: number) {
  const { data, error } = await sb.from("compras_diferencias").select("*").eq("empresa_id", emp)
    .order("recibido_en", { ascending: false }).limit(n)
  if (error) throw error
  if (!data?.length) return "No hay diferencias: todo lo contado coincide con las facturas ✅"
  const lineas = data.map((d) => {
    const u = d.unidad ? " " + esc(d.unidad) : ""
    const que = d.tipo === "Faltante" ? `faltan ${num(d.diferencia)}${u}` : `sobran ${num(Math.abs(d.diferencia))}${u}`
    return `• #${d.compra_id} · ${esc(d.proveedor ?? "Sin proveedor")} · ${esc(d.descripcion)}\n   factura ${num(d.dice_factura)}, hay ${num(d.hay_realmente)} → ${que} (${clp(Math.abs(d.valor_diferencia))})` +
      (d.motivo_diferencia ? `\n   📝 ${esc(d.motivo_diferencia)}` : "")
  })
  return "<b>⚠️ Dice la factura vs lo que hay</b>\n" + lineas.join("\n")
}

async function perdidasTexto(sb: Sb, emp: string, hoy: string) {
  const { data, error } = await sb.from("compras_diferencias").select("proveedor, fecha_documento, valor_diferencia")
    .eq("empresa_id", emp).eq("tipo", "Faltante").limit(5000)
  if (error) throw error
  if (!data?.length) return "No hay pérdidas registradas ✅"
  const mes = hoy.slice(0, 7)
  let total = 0, delMes = 0
  const porProv = new Map<string, number>()
  for (const d of data) {
    const v = Number(d.valor_diferencia)
    total += v
    if (String(d.fecha_documento).startsWith(mes)) delMes += v
    const p = d.proveedor ?? "Sin proveedor"
    porProv.set(p, (porProv.get(p) ?? 0) + v)
  }
  const top = [...porProv.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5).map(([p, v]) => `• ${esc(p)}: ${clp(v)}`)
  return `<b>📉 Pérdidas por faltantes</b>\nEste mes (por fecha de factura): ${clp(delMes)}\nTotal acumulado: ${clp(total)}\n\n<b>Por proveedor</b>\n${top.join("\n")}`
}

async function movimientosTexto(sb: Sb, emp: string, n: number) {
  const { data, error } = await sb.from("movimientos_insumo")
    .select("tipo, cantidad, origen, created_at, insumos(nombre, unidad)")
    .eq("empresa_id", emp).order("created_at", { ascending: false }).limit(n)
  if (error) throw error
  if (!data?.length) return "Aún no hay movimientos de inventario."
  return "<b>📦 Últimos movimientos</b>\n" + data.map((m) => {
    const i = un(m.insumos)
    const c = Number(m.cantidad)
    return `• ${fmt(diaChile(m.created_at))} · ${esc(i?.nombre ?? "insumo")}: ${c > 0 ? "+" : ""}${num(c)} ${esc(i?.unidad ?? "")}\n   ${ETIQUETA_MOV[m.tipo] ?? esc(m.tipo)}${m.origen ? " · " + esc(m.origen) : ""}`
  }).join("\n")
}

// "Por importar" = facturas guardadas que todavía no tienen compra · "Por recibir" = compras sin contar
async function pendientesTexto(sb: Sb, emp: string) {
  const [{ data: facs, error: e1 }, { data: porRecibir, error: e2 }] = await Promise.all([
    sb.from("facturas_archivos").select("id, nombre_original, nota, creado_en, compras(id)")
      .eq("empresa_id", emp).order("creado_en", { ascending: false }).limit(200),
    sb.from("compras_resumen").select("*").eq("empresa_id", emp).eq("estado", "Por recibir")
      .order("fecha_documento", { ascending: false }).limit(10),
  ])
  if (e1) throw e1
  if (e2) throw e2
  const sinCompra = (facs ?? []).filter((f) => !un(f.compras))
  const bloques: string[] = []
  if (sinCompra.length) {
    bloques.push(
      `<b>📥 Facturas guardadas sin compra</b> (${sinCompra.length}, por importar)\n` +
        sinCompra.slice(0, 10).map((f) => `• ${fmt(diaChile(f.creado_en))} · ${esc(f.nota || f.nombre_original || "factura")}`).join("\n") +
        (sinCompra.length > 10 ? "\n… y más" : ""),
    )
  }
  if (porRecibir?.length) bloques.push("<b>⏳ Compras por recibir</b> (falta contar)\n" + porRecibir.map(lineaCompra).join("\n"))
  return bloques.length ? bloques.join("\n\n") : "No hay nada pendiente ✅"
}

// ── Facturas: el bot guarda fotos/PDF en Supabase Storage ───
const LIMITE_BYTES = 15 * 1024 * 1024 // Telegram solo deja descargar hasta 20 MB
const EXT: Record<string, string> = { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" }

// deno-lint-ignore no-explicit-any
function archivoDe(msg: any) {
  if (msg.document) {
    return { fileId: msg.document.file_id as string, nombre: (msg.document.file_name ?? "factura") as string,
      mime: (msg.document.mime_type ?? "") as string, tam: (msg.document.file_size ?? 0) as number }
  }
  if (msg.photo?.length) {
    const f = msg.photo[msg.photo.length - 1] // la de mayor resolución
    return { fileId: f.file_id as string, nombre: "foto.jpg", mime: "image/jpeg", tam: (f.file_size ?? 0) as number }
  }
  return null
}

async function guardarFactura(sb: Sb, chatId: string, a: NonNullable<ReturnType<typeof archivoDe>>, pie: string) {
  const ctx = await contexto(sb, chatId)
  if (!ctx) return enviar(chatId, NO_VINCULADO)
  if (!ctx.areas.length) return enviar(chatId, "Tu usuario no tiene acceso a ningún módulo en esta empresa.")
  if (!EXT[a.mime]) return enviar(chatId, "Solo puedo guardar facturas en PDF o imagen (JPG, PNG, WEBP).")
  if (a.tam > LIMITE_BYTES) return enviar(chatId, "El archivo pesa más de 15 MB. Envíalo comprimido o como foto.")

  const token = Deno.env.get("TELEGRAM_BOT_TOKEN")!
  const info = await (await fetch(`https://api.telegram.org/bot${token}/getFile?file_id=${encodeURIComponent(a.fileId)}`)).json()
  if (!info.ok) throw new Error("Telegram no entregó el archivo (getFile)")
  const res = await fetch(`https://api.telegram.org/file/bot${token}/${info.result.file_path}`)
  if (!res.ok) throw new Error("No se pudo descargar el archivo desde Telegram")
  const bytes = new Uint8Array(await res.arrayBuffer())

  const hoy = hoyChile()
  const ruta = `${ctx.empresaId}/${hoy.slice(0, 4)}/${hoy.slice(5, 7)}/${crypto.randomUUID()}.${EXT[a.mime]}`
  const { error: up } = await sb.storage.from("facturas").upload(ruta, bytes, { contentType: a.mime, upsert: false })
  if (up) throw up
  const { error: ins } = await sb.from("facturas_archivos").insert({
    empresa_id: ctx.empresaId, subido_por: ctx.userId, ruta, nombre_original: a.nombre.slice(0, 200),
    tipo_mime: a.mime, tamano: bytes.length, nota: pie.trim().slice(0, 300) || null, origen: "telegram",
  })
  if (ins) {
    await sb.storage.from("facturas").remove([ruta]) // no dejamos archivos huérfanos
    throw ins
  }
  return enviar(chatId, `✅ Factura guardada (${fmt(hoy)}).${pie.trim() ? "\nNota: " + esc(pie.trim().slice(0, 100)) : ""}\nVer las últimas: /facturas`)
}

async function listarFacturas(sb: Sb, emp: string, n: number) {
  const { data, error } = await sb.from("facturas_archivos").select("ruta, nombre_original, nota, creado_en")
    .eq("empresa_id", emp).order("creado_en", { ascending: false }).limit(n)
  if (error) throw error
  if (!data?.length) return "Aún no hay facturas guardadas. Envíame una foto o un PDF."
  const lineas: string[] = []
  for (const f of data) {
    const { data: firmada } = await sb.storage.from("facturas").createSignedUrl(f.ruta, 3600) // enlace válido 1 hora
    const dia = f.creado_en.slice(0, 10)
    const etiqueta = esc(f.nota || f.nombre_original || "factura")
    lineas.push(firmada?.signedUrl ? `• ${fmt(dia)} · <a href="${esc(firmada.signedUrl)}">${etiqueta}</a>` : `• ${fmt(dia)} · ${etiqueta}`)
  }
  return "<b>🧾 Últimas facturas</b> (los enlaces duran 1 hora)\n" + lineas.join("\n")
}

// ── Webhook de Telegram ─────────────────────────────────────
async function webhook(req: Request) {
  const ok = new Response("ok") // siempre 200: si no, Telegram reintenta
  try {
    const update = await req.json()
    const msg = update.message
    const archivo = msg ? archivoDe(msg) : null
    if ((!msg?.text && !archivo) || msg.chat?.type !== "private") return ok // solo chats privados
    const sb = admin()
    const chatId = String(msg.chat.id)
    const mensajeId = String(update.update_id)

    // evita procesar dos veces el mismo mensaje (reintentos de Telegram)
    const { error: dup } = await sb.from("mensajes_bot").insert({
      plataforma: "telegram", mensaje_id: mensajeId, chat_id: chatId, contenido: (msg.text ?? msg.caption ?? "[archivo]").slice(0, 500),
    })
    if (dup?.code === "23505") return ok

    try {
      if (archivo) await guardarFactura(sb, chatId, archivo, msg.caption ?? "")
      else await manejar(sb, chatId, msg.text)
      await sb.from("mensajes_bot").update({ estado: "procesado" }).eq("plataforma", "telegram").eq("mensaje_id", mensajeId)
    } catch (e) {
      console.error(e)
      await sb.from("mensajes_bot").update({ estado: "error", error: String((e as Error).message ?? e) })
        .eq("plataforma", "telegram").eq("mensaje_id", mensajeId)
      await enviar(chatId, "Ocurrió un error procesando tu mensaje. Inténtalo de nuevo en un momento.")
    }
  } catch (e) {
    console.error(e)
  }
  return ok
}

// ── Resumen diario (lo llama pg_cron) ───────────────────────
// Chile cambia de horario (UTC-3 verano / UTC-4 invierno). pg_cron trabaja en UTC, así que el job corre
// a las 09:30 y 10:30 UTC y solo se envía cuando en Santiago son las 6:xx → siempre llega a las 6:30.
const horaChile = () =>
  Number(new Intl.DateTimeFormat("en-GB", { timeZone: "America/Santiago", hour: "2-digit", hour12: false }).format(new Date())) % 24

async function resumenDiario() {
  const sb = admin()
  const { data: vs, error } = await sb.from("vinculos_mensajeria").select("user_id, empresa_id, chat_id, perfiles(activo)")
    .eq("plataforma", "telegram").eq("verificado", true)
  if (error) return new Response(error.message, { status: 500 })

  const cache = new Map<string, string>()
  let enviados = 0
  for (const v of vs ?? []) {
    try {
      if (un(v.perfiles)?.activo === false) continue
      const areas = (await areasUsuario(sb, v.user_id, v.empresa_id)).sort()
      if (!areas.length) continue
      const clave = `${v.empresa_id}:${areas.join(",")}`
      if (!cache.has(clave)) cache.set(clave, await resumenTexto(sb, v.empresa_id, areas))
      const texto = cache.get(clave)!
      if (!texto) continue // nada que avisar: no molestamos
      if (await enviar(v.chat_id, "☀️ <b>Resumen de hoy</b>\n\n" + texto)) {
        enviados++
        await sb.from("notificaciones").insert({
          user_id: v.user_id, empresa_id: v.empresa_id, tipo: "resumen_diario_telegram",
          mensaje: texto.replace(/<[^>]+>/g, "").slice(0, 1000), leida: true,
        })
      }
    } catch (e) {
      console.error("fallo con", v.chat_id, e)
    }
  }
  return Response.json({ enviados })
}

// ── Entrada: decide por la cabecera quién llama ─────────────
Deno.serve((req) => {
  const cron = Deno.env.get("CRON_SECRET")
  const hook = Deno.env.get("TELEGRAM_WEBHOOK_SECRET")
  if (cron && req.headers.get("authorization") === `Bearer ${cron}`) {
    const forzar = new URL(req.url).searchParams.get("forzar") === "1" // para probar a mano: ...?forzar=1
    if (!forzar && horaChile() !== 6) return Response.json({ omitido: true, horaChile: horaChile() })
    return resumenDiario()
  }
  if (hook && req.headers.get("x-telegram-bot-api-secret-token") === hook) return webhook(req)
  return new Response("forbidden", { status: 403 })
})