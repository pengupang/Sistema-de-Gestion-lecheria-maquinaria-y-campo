import { useState } from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { calendario, maquinas as maquinasApi } from "@/services/maquinaria"
import useCarga from "@/lib/useCarga"
import { fechaCL } from "@/lib/formato"
import EstadoCarga from "@/components/EstadoCarga"

// Un color por máquina (se asignan en orden; si hay más de 6 máquinas se repiten)
const PALETA = [
  { color:"#1D4ED8", bg:"#DBEAFE" },
  { color:"#065F46", bg:"#D1FAE5" },
  { color:"#7C3AED", bg:"#EDE9FE" },
  { color:"#B45309", bg:"#FEF3C7" },
  { color:"#0E7490", bg:"#CFFAFE" },
  { color:"#BE185D", bg:"#FCE7F3" },
]
const MANTENCION = { color:"#991B1B", bg:"#FEE2E2" }

const DIAS = ["Dom","Lun","Mar","Mié","Jue","Vie","Sáb"]
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]
const iso = (y, m, d) => `${y}-${String(m + 1).padStart(2,"0")}-${String(d).padStart(2,"0")}`

// Vista de solo lectura: los arriendos se registran en /maquinaria/registrar
export default function VistaCalendarioArriendo() {
  const today = new Date()
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState(null)
  const [fMaquina, setFMaquina] = useState("")

  const anio = viewDate.getFullYear()
  const mes = viewDate.getMonth()
  const daysInMonth = new Date(anio, mes + 1, 0).getDate()
  const firstDay = new Date(anio, mes, 1).getDay()
  const desde = iso(anio, mes, 1)
  const hasta = iso(anio, mes, daysInMonth)

  // Eventos (arriendos + mantenciones) que tocan el mes visible; se recarga al cambiar de mes
  const { datos: todos, cargando, error, recargar } = useCarga(() => calendario(desde, hasta), [], desde)
  const eventos = fMaquina ? todos.filter((e) => String(e.maquina_id) === fMaquina) : todos
  const { datos: maquinas } = useCarga(maquinasApi.listar, [])

  const colorDe = (e) => (e.origen === "mantencion" ? MANTENCION : PALETA[Math.max(0, maquinas.findIndex((m) => m.id === e.maquina_id)) % PALETA.length])

  const eventosDia = (day) => {
    const d = iso(anio, mes, day)
    return eventos.filter((e) => e.inicio <= d && e.fin >= d)
  }
  const prevMonth = () => { setSelectedDay(null); setViewDate(new Date(anio, mes - 1, 1)) }
  const nextMonth = () => { setSelectedDay(null); setViewDate(new Date(anio, mes + 1, 1)) }

  const panel = selectedDay ? eventosDia(selectedDay) : eventos
  const nArriendos = eventos.filter((e) => e.origen === "arriendo").length

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <div><h2 style={styles.title}>Calendario de Arriendos</h2><p style={styles.sub}>{nArriendos} arriendos y {eventos.length - nArriendos} mantenciones en {MESES[mes].toLowerCase()} {anio}</p></div>
      </div>

      {/* Leyenda */}
      <div style={styles.leyenda}>
        {maquinas.map((m, i)=>(
          <span key={m.id} onClick={()=>setFMaquina(f => f === String(m.id) ? "" : String(m.id))} title="Filtrar por esta máquina"
            style={{...styles.leyendaItem,cursor:"pointer",opacity:fMaquina && fMaquina !== String(m.id) ? 0.35 : 1,backgroundColor:PALETA[i % PALETA.length].bg,color:PALETA[i % PALETA.length].color}}><span style={{...styles.dot,backgroundColor:PALETA[i % PALETA.length].color}}/>{m.nombre} {m.modelo}</span>
        ))}
        <span style={{...styles.leyendaItem,backgroundColor:MANTENCION.bg,color:MANTENCION.color}}><span style={{...styles.dot,backgroundColor:MANTENCION.color}}/>Mantención</span>
        {fMaquina && <button onClick={()=>setFMaquina("")} style={{...styles.leyendaItem,border:"1px solid #E2E8F0",background:"#fff",color:"#64748B",cursor:"pointer"}}>Ver todas</button>}
      </div>

      <EstadoCarga cargando={false} error={error} onReintentar={recargar} />

      <div style={styles.calLayout}>
        <div style={styles.calCard}>
          <div style={styles.calHeader}>
            <button style={styles.navBtn} onClick={prevMonth}><ChevronLeft size={16}/></button>
            <span style={styles.mesLabel}>{MESES[mes]} {anio}{cargando ? " …" : ""}</span>
            <button style={styles.navBtn} onClick={nextMonth}><ChevronRight size={16}/></button>
          </div>
          <div style={styles.diasSemana}>{DIAS.map(d=><div key={d} style={styles.diaSemana}>{d}</div>)}</div>
          <div style={styles.grid}>
            {Array(firstDay).fill(null).map((_,i)=><div key={`e${i}`}/>)}
            {Array(daysInMonth).fill(null).map((_,i)=>{
              const day = i+1
              const evs = eventosDia(day)
              const isToday = today.getDate()===day && today.getMonth()===mes && today.getFullYear()===anio
              const isSelected = selectedDay===day
              return (
                <div key={day} style={{...styles.dayCell,backgroundColor:isSelected?"#1B2A4A":isToday?"#EBF2FB":"#fff",border:isToday?"1px solid #4A6FA5":"1px solid #F1F5F9"}}
                  onClick={()=>setSelectedDay(isSelected ? null : day)}>
                  <span style={{...styles.dayNum,color:isSelected?"#fff":isToday?"#4A6FA5":"#334155",fontWeight:isToday?700:400}}>{day}</span>
                  <div style={styles.eventDots}>
                    {evs.slice(0,3).map(e=><span key={`${e.origen}${e.id}`} style={{...styles.eventDot,backgroundColor:colorDe(e).color}}/>)}
                    {evs.length > 3 && <span style={{fontSize:9,color:isSelected?"#fff":"#64748B"}}>+{evs.length-3}</span>}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        <div style={styles.sidePanel}>
          <h3 style={styles.sidePanelTitle}>{selectedDay ? `${selectedDay} de ${MESES[mes]}` : `Todo ${MESES[mes].toLowerCase()}`}</h3>
          {panel.length === 0
            ? <p style={styles.noEventos}>Sin arriendos ni mantenciones</p>
            : panel.map(e=>(
              <div key={`${e.origen}${e.id}`} style={styles.eventoCard}>
                <div style={{...styles.maqBadge,backgroundColor:colorDe(e).bg,color:colorDe(e).color}}>{e.maquina}</div>
                <p style={styles.clienteLabel}>{e.origen === "mantencion" ? `🔧 ${e.titulo}` : `${e.cliente} · ${e.titulo}`}</p>
                <p style={styles.fechaLabel}>{fechaCL(e.inicio)}{e.fin !== e.inicio ? ` → ${fechaCL(e.fin)}` : ""} · {e.estado}</p>
              </div>
            ))
          }
        </div>
      </div>

    </div>
  )
}

const styles = {
  container:{display:"flex",flexDirection:"column",gap:"20px"},
  topBar:{display:"flex",justifyContent:"space-between",alignItems:"flex-start"},
  title:{fontSize:"18px",fontWeight:700,color:"#1E293B",margin:0},
  sub:{fontSize:"13px",color:"#94A3B8",margin:"4px 0 0 0"},
  leyenda:{display:"flex",gap:"10px",flexWrap:"wrap"},
  leyendaItem:{display:"flex",alignItems:"center",gap:"6px",padding:"4px 10px",borderRadius:"20px",fontSize:"11px",fontWeight:500},
  dot:{width:8,height:8,borderRadius:"50%",flexShrink:0},
  calLayout:{display:"flex",gap:"16px",alignItems:"flex-start"},
  calCard:{backgroundColor:"#fff",borderRadius:"10px",border:"1px solid #E2E8F0",padding:"20px",flex:1},
  calHeader:{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:"16px"},
  mesLabel:{fontSize:"15px",fontWeight:700,color:"#1E293B"},
  navBtn:{background:"none",border:"1px solid #E2E8F0",borderRadius:"6px",padding:"4px 8px",cursor:"pointer",color:"#64748B"},
  diasSemana:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",marginBottom:"4px"},
  diaSemana:{textAlign:"center",fontSize:"11px",fontWeight:600,color:"#94A3B8",padding:"6px 0"},
  grid:{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:"3px"},
  dayCell:{borderRadius:"6px",padding:"6px 4px",minHeight:"52px",cursor:"pointer",transition:"background 0.15s"},
  dayNum:{fontSize:"13px",display:"block",textAlign:"center"},
  eventDots:{display:"flex",justifyContent:"center",gap:"2px",marginTop:"4px"},
  eventDot:{width:6,height:6,borderRadius:"50%"},
  sidePanel:{backgroundColor:"#fff",borderRadius:"10px",border:"1px solid #E2E8F0",padding:"20px",width:"240px",flexShrink:0},
  sidePanelTitle:{fontSize:"14px",fontWeight:700,color:"#1E293B",margin:"0 0 16px 0"},
  noEventos:{fontSize:"13px",color:"#94A3B8"},
  eventoCard:{backgroundColor:"#F8FAFC",borderRadius:"8px",padding:"10px 12px",marginBottom:"10px",border:"1px solid #F1F5F9"},
  maqBadge:{display:"inline-block",padding:"2px 8px",borderRadius:"20px",fontSize:"10px",fontWeight:600,marginBottom:"6px"},
  clienteLabel:{fontSize:"13px",fontWeight:600,color:"#1E293B",margin:"0 0 4px 0"},
  fechaLabel:{fontSize:"11px",color:"#94A3B8",margin:0},
  iconBtn:{background:"none",border:"none",cursor:"pointer",padding:"4px",color:"#64748B"},
}