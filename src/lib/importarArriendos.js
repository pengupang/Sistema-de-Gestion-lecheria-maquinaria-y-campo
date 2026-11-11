import { fechaDesdeCL, numeroCL } from "./exportar"

// Para comparar nombres sin que importen mayúsculas, tildes ni espacios de más
const norm = (s = "") =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim()

const ESTADOS = ["Activo", "Finalizado", "Pendiente"]
const SI = ["si", "s", "x", "1", "true", "pagado"]

// filas: resultado de leerCSV · catalogo: { clientes, maquinas, servicios, arriendos }
// Devuelve [{ linea, datos, errores }]: datos listos para insertar si errores está vacío
export function validarArriendos(filas, { clientes = [], maquinas = [], servicios = [], arriendos = [] }) {
  // Índices por nombre normalizado
  const porNombre = (lista, etiqueta) => new Map(lista.map((x) => [norm(etiqueta(x)), x]))
  const cli = porNombre(clientes, (c) => c.nombre)
  const maqCompleta = porNombre(maquinas, (m) => `${m.nombre} ${m.modelo ?? ""}`)
  const maqNombre = porNombre(maquinas, (m) => m.nombre)
  const serv = porNombre(servicios, (s) => s.nombre)

  const aceptadas = [] // filas válidas de este mismo archivo, para detectar choques entre ellas
  const seCruzan = (a, b) => String(a.maquina_id) === String(b.maquina_id) && a.inicio <= b.fin && a.fin >= b.inicio

  return filas.map((f, i) => {
    const errores = []
    const linea = i + 2 // +1 por los títulos, +1 porque Excel cuenta desde 1

    const cliente = cli.get(norm(f["Cliente"]))
    if (!f["Cliente"]) errores.push("Falta el cliente")
    else if (!cliente) errores.push(`Cliente "${f["Cliente"]}" no existe`)

    const maquina = maqCompleta.get(norm(f["Máquina"])) ?? maqNombre.get(norm(f["Máquina"]))
    if (!f["Máquina"]) errores.push("Falta la máquina")
    else if (!maquina) errores.push(`Máquina "${f["Máquina"]}" no existe`)

    const servicio = serv.get(norm(f["Servicio"]))
    if (!f["Servicio"]) errores.push("Falta el servicio")
    else if (!servicio) errores.push(`Servicio "${f["Servicio"]}" no existe`)

    const inicio = fechaDesdeCL(f["Inicio"])
    if (!inicio) errores.push("Fecha de inicio inválida (usa dd-mm-aaaa)")
    const fin = f["Término"] ? fechaDesdeCL(f["Término"]) : inicio // sin término = un solo día
    if (f["Término"] && !fin) errores.push("Fecha de término inválida")
    if (inicio && fin && fin < inicio) errores.push("El término es anterior al inicio")

    const cantidad = numeroCL(f["Cantidad"])
    if (!(cantidad > 0)) errores.push("Cantidad inválida")
    const monto = numeroCL(f["Monto"])
    if (!(monto > 0)) errores.push("Monto inválido")

    const u = norm(f["Unidad"])
    const unidad = u.startsWith("h") && u !== "hectareas" && u !== "ha" ? "horas"
      : u ? "hectáreas"
      : servicio?.unidad ?? "hectáreas"

    const estado = ESTADOS.find((e) => norm(e) === norm(f["Estado"])) ?? "Finalizado"
    const datos = {
      cliente_id: cliente?.id, maquina_id: maquina?.id, servicio_id: servicio?.id,
      inicio, fin, cantidad, unidad, monto: Math.round(monto ?? 0),
      pagado: SI.includes(norm(f["Pagado"])), estado,
      predio: f["Predio"] ?? "", comuna: f["Comuna"] ?? "",
      notas: "Importado desde historial",
    }

    // Choques: con lo ya registrado y con filas anteriores de este archivo
    if (!errores.length) {
      const existente = arriendos.find((a) => seCruzan(a, datos))
      if (existente) {
        const mismo = String(existente.cliente_id) === String(datos.cliente_id) && existente.inicio === inicio
        errores.push(mismo ? "Ya está registrado" : `Choca con un arriendo del ${existente.inicio} al ${existente.fin}`)
      } else if (aceptadas.some((a) => seCruzan(a, datos))) {
        errores.push("Choca con otra fila de este archivo")
      }
    }

    if (!errores.length) aceptadas.push(datos)
    return { linea, original: f, datos: errores.length ? null : datos, errores }
  })
}