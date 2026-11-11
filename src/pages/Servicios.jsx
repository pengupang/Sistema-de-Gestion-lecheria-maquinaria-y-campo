import { useCallback, useMemo, useState } from "react"
import { Wrench, Search, Clock, Map as MapIcon, TrendingUp } from "lucide-react"
import { servicios as api, maquinas as maquinasApi, arriendos as arriendosApi } from "@/services/maquinaria"
import useCarga from "@/lib/useCarga"
import EstadoCarga from "@/components/EstadoCarga"
import Scorecard from "@/components/maquinaria/Scorecard"
import s, { AZUL } from "./EstilosMaquinaria"
import tw from "@/lib/ui"

// Vista de solo lectura. Ingreso y edición: /maquinaria/registrar?tipo=servicio (desde el menú "Registrar")
export default function VistaServicios() {
  const cargarTodo = useCallback(async () => {
    const [servicios, maquinas, arriendos] = await Promise.all([api.listar(), maquinasApi.listar(), arriendosApi.listar()])
    return { servicios, maquinas, arriendos }
  }, [])
  const { datos, cargando, error, recargar } = useCarga(cargarTodo, { servicios: [], maquinas: [], arriendos: [] })
  const { servicios, maquinas, arriendos } = datos

  const anio = String(new Date().getFullYear())
  const [q, setQ] = useState("")
  const [fUnidad, setFUnidad] = useState("")
  const [fMaquina, setFMaquina] = useState("")
  const [orden, setOrden] = useState("uso")

  const nombreMaquina = (id) => {
    const m = maquinas.find((x) => x.id === id)
    return m ? `${m.nombre} ${m.modelo}` : `#${id}`
  }

  // Veces que se pidió cada servicio en el año y cantidad trabajada
  const uso = useMemo(() => {
    const r = {}
    for (const a of arriendos) {
      if (!a.inicio?.startsWith(anio)) continue
      const u = (r[a.servicio_id] ??= { n: 0, cantidad: 0 })
      u.n += 1
      u.cantidad += Number(a.cantidad) || 0
    }
    return r
  }, [arriendos, anio])

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase()
    const r = servicios.filter(
      (sv) =>
        (!fUnidad || sv.unidad === fUnidad) &&
        (!fMaquina || sv.maquinas.some((id) => String(id) === fMaquina)) &&
        (!t || `${sv.nombre} ${sv.descripcion ?? ""}`.toLowerCase().includes(t))
    )
    return [...r].sort((a, b) => (orden === "uso" ? (uso[b.id]?.n ?? 0) - (uso[a.id]?.n ?? 0) : a.nombre.localeCompare(b.nombre)))
  }, [servicios, q, fUnidad, fMaquina, orden, uso])

  const masPedido = servicios.reduce((top, sv) => ((uso[sv.id]?.n ?? 0) > (uso[top?.id]?.n ?? 0) ? sv : top), null)
  const sinMaquina = servicios.filter((sv) => sv.maquinas.length === 0).length

  return (
    <div className={tw.container}>
      <div className={tw.topBar}>
        <div>
          <h2 style={s.title}>Tipos de Servicio</h2>
          <p style={s.sub}>{filtrados.length} de {servicios.length} servicios</p>
        </div>
      </div>

      <div className={tw.statsRow}>
        <Scorecard icono={Wrench} color="#4A6FA5" bg="#EBF2FB" valor={servicios.length} etiqueta="Servicios ofrecidos"
          detalle={sinMaquina ? `${sinMaquina} sin máquina asignada` : "todos con máquina asignada"} />
        <Scorecard icono={MapIcon} color="#065F46" bg="#D1FAE5" valor={servicios.filter((sv) => sv.unidad !== "horas").length} etiqueta="Por hectárea" />
        <Scorecard icono={Clock} color="#92400E" bg="#FEF3C7" valor={servicios.filter((sv) => sv.unidad === "horas").length} etiqueta="Por hora" />
        <Scorecard icono={TrendingUp} color="#7C3AED" bg="#EDE9FE"
          valor={masPedido && uso[masPedido.id] ? masPedido.nombre : "—"}
          etiqueta={`Más pedido en ${anio}`}
          detalle={masPedido && uso[masPedido.id] ? `${uso[masPedido.id].n} arriendos` : null} />
      </div>

      <div className={tw.filtros}>
        <div className={tw.buscador}>
          <Search size={14} color="#94A3B8" />
          <input className={tw.buscadorInput} placeholder="Buscar servicio..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select style={s.select} value={fUnidad} onChange={(e) => setFUnidad(e.target.value)}>
          <option value="">Todas las unidades</option>
          <option value="hectáreas">Por hectárea</option>
          <option value="horas">Por hora</option>
        </select>
        <select style={s.select} value={fMaquina} onChange={(e) => setFMaquina(e.target.value)}>
          <option value="">Cualquier máquina</option>
          {maquinas.map((m) => <option key={m.id} value={m.id}>{m.nombre} {m.modelo}</option>)}
        </select>
        <select style={s.select} value={orden} onChange={(e) => setOrden(e.target.value)}>
          <option value="uso">Ordenar: más pedidos</option>
          <option value="nombre">Ordenar: nombre</option>
        </select>
      </div>

      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar} />

      {!cargando && !error && (
        <div className={tw.cardsGrid}>
          {filtrados.map((sv) => (
            <div key={sv.id} style={s.card}>
              <div style={s.cardHead}>
                <div style={{ width: 36, height: 36, borderRadius: 8, backgroundColor: "#EBF2FB", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <Wrench size={16} color={AZUL} />
                </div>
              </div>
              <h3 style={s.cardTitle}>{sv.nombre}</h3>
              <p style={{ ...s.cardMeta, lineHeight: 1.5 }}>{sv.descripcion}</p>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {sv.maquinas.map((id) => (
                  <span key={id} style={{ padding: "3px 8px", borderRadius: 4, fontSize: 11, backgroundColor: "#EBF2FB", color: AZUL, fontWeight: 500 }}>
                    {nombreMaquina(id)}
                  </span>
                ))}
                {sv.maquinas.length === 0 && <span style={{ ...s.badge, backgroundColor: "#FEF3C7", color: "#92400E" }}>Sin máquina asignada</span>}
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", borderTop: "1px solid #F1F5F9", paddingTop: 8 }}>
                <p style={s.cardMeta}>Se cobra por {sv.unidad === "horas" ? "hora" : "hectárea"}</p>
                <p style={{ ...s.cardMeta, fontWeight: 600 }}>
                  {uso[sv.id] ? `${uso[sv.id].n} arriendos · ${uso[sv.id].cantidad.toLocaleString("es-CL")} ${sv.unidad === "horas" ? "h" : "ha"} en ${anio}` : `Sin uso en ${anio}`}
                </p>
              </div>
              {sv.nota && <p style={{ ...s.cardMeta, fontStyle: "italic" }}>{sv.nota}</p>}
            </div>
          ))}
          {filtrados.length === 0 && <p style={s.vacio}>No hay servicios con esos filtros.</p>}
        </div>
      )}
    </div>
  )
}
