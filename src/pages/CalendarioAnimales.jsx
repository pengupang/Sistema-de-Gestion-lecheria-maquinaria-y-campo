import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Pencil, ChevronLeft, ChevronRight } from "lucide-react"
import { animales as animalesApi, sanidad as sanidadApi, etiquetaAnimal } from "../services/lecheria"
import { TIPOS_EVENTO } from "./estilosLecheria"

const tiposEvento = TIPOS_EVENTO

const today = new Date()

const DIAS = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"]
const MESES = ["Enero","Febrero","Marzo","Abril","Mayo","Junio","Julio","Agosto","Septiembre","Octubre","Noviembre","Diciembre"]

// Vista de solo lectura: los eventos son registros de Sanidad y se crean/editan en /lecheria/registrar?tipo=sanidad
export default function VistaCalendarioAnimales() {
  const navigate = useNavigate()
  const [eventos, setEventos] = useState([])
  const [error, setError] = useState(null)

  // Los eventos salen de los registros de Sanidad (misma fuente de datos)
  const cargar = async () => {
    try {
      const [a, reg] = await Promise.all([animalesApi.listar(), sanidadApi.listar()])
      setEventos(reg.map(r => {
        const [y, m, d] = r.fecha.split("-").map(Number)
        return {
          id: r.id,
          animal: etiquetaAnimal(a.find(x => x.id === r.animal_id)),
          tipo: r.tipo,
          fecha: new Date(y, m - 1, d),
          nota: r.nota || r.producto || "",
        }
      }))
    } catch (e) {
      setError(e.message)
    }
  }
  useEffect(() => { cargar() }, [])
  const [viewDate, setViewDate] = useState(new Date(today.getFullYear(), today.getMonth(), 1))
  const [selectedDay, setSelectedDay] = useState(null)

  const prevMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))
  const nextMonth = () => setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))

  const daysInMonth = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0).getDate()
  const firstDay = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1).getDay()

  const getEventosDelDia = (day) => eventos.filter(e =>
    e.fecha.getFullYear() === viewDate.getFullYear() &&
    e.fecha.getMonth() === viewDate.getMonth() &&
    e.fecha.getDate() === day
  )


  const eventosDelDiaSeleccionado = selectedDay ? getEventosDelDia(selectedDay) : []
  const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
  // Nuevo evento: si hay un día elegido, se prellena esa fecha
  const nuevoEvento = () => {
    const fecha = selectedDay ? iso(new Date(viewDate.getFullYear(), viewDate.getMonth(), selectedDay)) : null
    navigate(`/lecheria/registrar?tipo=sanidad${fecha ? `&fecha=${fecha}` : ""}`)
  }

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <div>
          <h2 style={styles.title}>Calendario de Animales</h2>
          <p style={styles.sub}>{eventos.length} eventos registrados</p>
        </div>
        <button style={styles.btnAdd} onClick={nuevoEvento}>
          <Plus size={15} /> {selectedDay ? `Agregar el ${selectedDay}` : "Agregar evento"}
        </button>
      </div>

      {error && <div style={{ padding: "12px 16px", backgroundColor: "#FEF2F2", border: "1px solid #FECACA", borderRadius: 8, fontSize: 13, color: "#991B1B" }}>No se pudieron cargar los eventos: {error}</div>}

      {/* Leyenda */}
      <div style={styles.leyenda}>
        {Object.entries(tiposEvento).map(([tipo, { color, bg }]) => (
          <span key={tipo} style={{ ...styles.leyendaItem, backgroundColor: bg, color }}>
            <span style={{ ...styles.dot, backgroundColor: color }} />
            {tipo}
          </span>
        ))}
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        {/* Calendario */}
        <div className="w-full min-w-0" style={styles.calCard}>
          <div style={styles.calHeader}>
            <button style={styles.navBtn} onClick={prevMonth}><ChevronLeft size={16} /></button>
            <span style={styles.mesLabel}>{MESES[viewDate.getMonth()]} {viewDate.getFullYear()}</span>
            <button style={styles.navBtn} onClick={nextMonth}><ChevronRight size={16} /></button>
          </div>
          <div style={styles.diasSemana}>
            {DIAS.map(d => <div key={d} style={styles.diaSemana}>{d}</div>)}
          </div>
          <div style={styles.grid}>
            {Array(firstDay).fill(null).map((_, i) => <div key={`e${i}`} />)}
            {Array(daysInMonth).fill(null).map((_, i) => {
              const day = i + 1
              const evs = getEventosDelDia(day)
              const isToday = today.getDate() === day && today.getMonth() === viewDate.getMonth() && today.getFullYear() === viewDate.getFullYear()
              const isSelected = selectedDay === day
              return (
                <div key={day} style={{
                  ...styles.dayCell,
                  backgroundColor: isSelected ? "#1E3128" : isToday ? "#F0F7F2" : "#fff",
                  border: isToday ? "1px solid #3D6B4F" : "1px solid #F1F5F9",
                }} onClick={() => setSelectedDay(day)}>
                  <span style={{ ...styles.dayNum, color: isSelected ? "#fff" : isToday ? "#3D6B4F" : "#334155", fontWeight: isToday ? 700 : 400 }}>
                    {day}
                  </span>
                  <div style={styles.eventDots}>
                    {evs.slice(0, 3).map(e => (
                      <span key={e.id} style={{ ...styles.eventDot, backgroundColor: tiposEvento[e.tipo]?.color }} />
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Panel lateral */}
        <div className="w-full shrink-0 lg:w-60" style={styles.sidePanel}>
          <h3 style={styles.sidePanelTitle}>
            {selectedDay ? `${selectedDay} de ${MESES[viewDate.getMonth()]}` : "Próximos eventos"}
          </h3>
          {selectedDay ? (
            eventosDelDiaSeleccionado.length === 0
              ? <p style={styles.noEventos}>Sin eventos este día</p>
              : eventosDelDiaSeleccionado.map(e => (
                <div key={e.id} style={styles.eventoCard}>
                  <div style={{ ...styles.eventoTipo, backgroundColor: tiposEvento[e.tipo]?.bg, color: tiposEvento[e.tipo]?.color }}>
                    {e.tipo}
                  </div>
                  <p style={styles.eventoAnimal}>{e.animal}</p>
                  {e.nota && <p style={styles.eventoNota}>{e.nota}</p>}
                  <button style={styles.deleteBtn} onClick={() => navigate(`/lecheria/registrar?tipo=sanidad&id=${e.id}`)}>
                    <Pencil size={12} /> Editar
                  </button>
                </div>
              ))
          ) : (
            eventos
              .filter(e => e.fecha >= today)
              .sort((a, b) => a.fecha - b.fecha)
              .slice(0, 5)
              .map(e => (
                <div key={e.id} style={styles.eventoCard}>
                  <div style={styles.eventoFecha}>
                    {e.fecha.getDate()} {MESES[e.fecha.getMonth()].slice(0,3)}
                  </div>
                  <div style={{ ...styles.eventoTipo, backgroundColor: tiposEvento[e.tipo]?.bg, color: tiposEvento[e.tipo]?.color }}>
                    {e.tipo}
                  </div>
                  <p style={styles.eventoAnimal}>{e.animal}</p>
                </div>
              ))
          )}
        </div>
      </div>

    </div>
  )
}

const styles = {
  container: { display: "flex", flexDirection: "column", gap: "20px" },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" },
  title: { fontSize: "18px", fontWeight: 700, color: "#1E293B", margin: 0 },
  sub: { fontSize: "13px", color: "#94A3B8", margin: "4px 0 0 0" },
  btnAdd: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", backgroundColor: "#3D6B4F", border: "none", borderRadius: "6px", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" },
  leyenda: { display: "flex", gap: "10px", flexWrap: "wrap" },
  leyendaItem: { display: "flex", alignItems: "center", gap: "6px", padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 500 },
  dot: { width: 8, height: 8, borderRadius: "50%", flexShrink: 0 },
  calendarLayout: { display: "flex", gap: "16px", alignItems: "flex-start" },
  calCard: { backgroundColor: "#fff", borderRadius: "10px", border: "1px solid #D1E8DA", padding: "20px", flex: 1 },
  calHeader: { display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "16px" },
  mesLabel: { fontSize: "15px", fontWeight: 700, color: "#1E293B" },
  navBtn: { background: "none", border: "1px solid #E2E8F0", borderRadius: "6px", padding: "4px 8px", cursor: "pointer", color: "#64748B" },
  diasSemana: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", marginBottom: "4px" },
  diaSemana: { textAlign: "center", fontSize: "11px", fontWeight: 600, color: "#94A3B8", padding: "6px 0" },
  grid: { display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: "3px" },
  dayCell: { borderRadius: "6px", padding: "6px 4px", minHeight: "52px", cursor: "pointer", transition: "background 0.15s" },
  dayNum: { fontSize: "13px", display: "block", textAlign: "center" },
  eventDots: { display: "flex", justifyContent: "center", gap: "2px", marginTop: "4px" },
  eventDot: { width: 6, height: 6, borderRadius: "50%" },
  sidePanel: { backgroundColor: "#fff", borderRadius: "10px", border: "1px solid #D1E8DA", padding: "20px" },
  sidePanelTitle: { fontSize: "14px", fontWeight: 700, color: "#1E293B", margin: "0 0 16px 0" },
  noEventos: { fontSize: "13px", color: "#94A3B8" },
  eventoCard: { backgroundColor: "#F8FAFC", borderRadius: "8px", padding: "10px 12px", marginBottom: "10px", border: "1px solid #F1F5F9" },
  eventoFecha: { fontSize: "11px", color: "#94A3B8", marginBottom: "4px" },
  eventoTipo: { display: "inline-block", padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: 600, marginBottom: "4px" },
  eventoAnimal: { fontSize: "13px", fontWeight: 600, color: "#1E293B", margin: "0 0 4px 0" },
  eventoNota: { fontSize: "12px", color: "#64748B", margin: "0 0 6px 0" },
  deleteBtn: { display: "flex", alignItems: "center", gap: "4px", background: "none", border: "none", color: "#3D6B4F", fontSize: "11px", cursor: "pointer", padding: 0 },
  modalOverlay: { position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.4)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 },
  modal: { backgroundColor: "#fff", borderRadius: "12px", padding: "24px", width: "100%", maxWidth: "440px", boxShadow: "0 20px 40px rgba(0,0,0,0.15)" },
  modalHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" },
  modalTitle: { fontSize: "16px", fontWeight: 700, color: "#1E293B", margin: 0 },
  modalFooter: { display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" },
  formGrid: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  label: { display: "block", fontSize: "11px", fontWeight: 600, color: "#64748B", marginBottom: "6px", textTransform: "uppercase", letterSpacing: "0.04em" },
  input: { width: "100%", padding: "9px 12px", border: "1px solid #E2E8F0", borderRadius: "6px", fontSize: "13px", boxSizing: "border-box", backgroundColor: "#F8FAFC" },
  btnCancel: { padding: "8px 16px", backgroundColor: "transparent", border: "1px solid #E2E8F0", borderRadius: "6px", color: "#64748B", fontSize: "13px", cursor: "pointer" },
  btnSave: { padding: "8px 20px", backgroundColor: "#3D6B4F", border: "none", borderRadius: "6px", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" },
  iconBtn: { background: "none", border: "none", cursor: "pointer", padding: "4px", color: "#64748B" },
}