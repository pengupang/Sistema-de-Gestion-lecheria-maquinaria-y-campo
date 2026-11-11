import { Wrench, FileText, Users, CalendarCheck, TrendingUp, AlertCircle } from "lucide-react"
import { resumenMaquinaria } from "../services/maquinaria"
import useCarga from "../lib/useCarga"
import { clp, fechaCL, hoyLargo } from "../lib/formato"
import EstadoCarga from "../components/EstadoCarga"

export default function DashboardMaquinaria() {
  const { datos: r, cargando, error, recargar } = useCarga(resumenMaquinaria, null)
  const mesTxt = new Date().toLocaleDateString("es-CL", { month: "long", year: "numeric" })

  const stats = r && [
    { label: "Máquinas disponibles", value: r.disponibles, icon: Wrench, color: "#4A6FA5", bg: "#EBF2FB", sub: `de ${r.totalMaquinas} en total` },
    { label: "En arriendo", value: r.arrendadas, icon: FileText, color: "#F59E0B", bg: "#FEF3C7", sub: "actualmente" },
    { label: "En mantención", value: r.enMantencion, icon: AlertCircle, color: "#EF4444", bg: "#FEE2E2", sub: "fuera de servicio" },
    { label: "Arriendos del mes", value: r.arriendosMes, icon: CalendarCheck, color: "#10B981", bg: "#D1FAE5", sub: mesTxt },
    { label: "Clientes activos", value: r.clientesActivos, icon: Users, color: "#8B5CF6", bg: "#EDE9FE", sub: "registrados" },
    { label: "Ingresos del mes", value: clp(r.ingresosMes), icon: TrendingUp, color: "#0EA5E9", bg: "#E0F2FE", sub: "CLP neto, sin pendientes" },
  ]

  return (
    <div style={styles.container}>
      <p style={styles.fecha}>{hoyLargo()}</p>
      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar} />
      
      {r && (<>
      {/* Stats */}
      
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {stats.map(({ label, value, icon: Icon, color, bg, sub }) => (
          <div key={label} style={styles.card}>
            <div style={{ ...styles.iconBox, backgroundColor: bg }}>
              <Icon size={20} color={color} />
            </div>
            <div>
              <p style={styles.statValue}>{value}</p>
              <p style={styles.statLabel}>{label}</p>
              <p style={styles.statSub}>{sub}</p>
            </div>
          </div>
        ))}
        </div>
   
      

      {/* Arriendos recientes */}
      <div className="grid grid-cols-1 items-start gap-4 xl:grid-cols-[3fr_2fr]">
      <div className="min-w-0 overflow-x-auto" style={styles.tableCard}>
        <h3 style={styles.tableTitle}>Arriendos recientes</h3>
        <table style={styles.table}>
          <thead>
            <tr>
              {["Cliente", "Máquina", "Servicio", "Desde", "Hasta", "Estado"].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {r.recientes.map((a, i) => (
              <tr key={a.id} style={{ backgroundColor: i % 2 === 0 ? "#F8FAFC" : "#ffffff" }}>
                <td style={styles.td}>{a.cliente?.nombre}</td>
                <td style={styles.td}>{a.maquina?.nombre} {a.maquina?.modelo}</td>
                <td style={styles.td}>{a.servicio?.nombre}</td>
                <td style={styles.td}>{fechaCL(a.inicio)}</td>
                <td style={styles.td}>{fechaCL(a.fin)}</td>
                <td style={styles.td}>
                  <span style={{
                    ...styles.badge,
                    backgroundColor: a.estado === "Activo" ? "#D1FAE5" : "#F1F5F9",
                    color: a.estado === "Activo" ? "#065F46" : "#64748B",
                  }}>
                    {a.estado}
                  </span>
                </td>
              </tr>
            ))}
            {r.recientes.length === 0 && <tr><td colSpan={6} style={{ ...styles.td, textAlign: "center", color: "#94A3B8" }}>Sin arriendos recientes.</td></tr>}
          </tbody>
        </table>
      </div>

      {/* Próximas mantenciones */}
      <div className="min-w-0 overflow-x-auto" style={styles.tableCard}>
        <h3 style={styles.tableTitle}>Próximas mantenciones</h3>
        <table style={styles.table}>
          <thead>
            <tr>{["Máquina", "Tipo", "Taller", "Fecha"].map(h => <th key={h} style={styles.th}>{h}</th>)}</tr>
          </thead>
          <tbody>
            {r.proximasMantenciones.map((m, i) => (
              <tr key={m.id} style={{ backgroundColor: i % 2 === 0 ? "#F8FAFC" : "#ffffff" }}>
                <td style={styles.td}>{m.maquina?.nombre} {m.maquina?.modelo}</td>
                <td style={styles.td}>{m.tipo}</td>
                <td style={styles.td}>{m.taller}</td>
                <td style={styles.td}>{fechaCL(m.inicio)}</td>
              </tr>
            ))}
            {r.proximasMantenciones.length === 0 && <tr><td colSpan={4} style={{ ...styles.td, textAlign: "center", color: "#94A3B8" }}>No hay mantenciones programadas.</td></tr>}
          </tbody>
        </table>
      </div>
      </div>
      </>)}
    </div>
  )
}

const styles = {
  container: {
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  fecha: {
    fontSize: "13px",
    color: "#94A3B8",
    margin: 0,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: "16px",
  },
  card: {
    backgroundColor: "#ffffff",
    borderRadius: "10px",
    padding: "20px",
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
    border: "1px solid #E2E8F0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  iconBox: {
    width: 40,
    height: 40,
    borderRadius: "8px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  statValue: {
    fontSize: "22px",
    fontWeight: 700,
    color: "#1E293B",
    margin: "0 0 2px 0",
  },
  statLabel: {
    fontSize: "13px",
    color: "#475569",
    margin: "0 0 2px 0",
    fontWeight: 500,
  },
  statSub: {
    fontSize: "11px",
    color: "#94A3B8",
    margin: 0,
  },
  tableCard: {
    backgroundColor: "#ffffff",
    borderRadius: "10px",
    padding: "15px",
    border: "1px solid #E2E8F0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
  },
  tableTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#1E293B",
    margin: "0 0 16px 0",
  },
  table: {
    width: "100%",
    minWidth: "480px",
    borderCollapse: "collapse",
  },
  th: {
    textAlign: "left",
    fontSize: "11px",
    fontWeight: 600,
    color: "#94A3B8",
    padding: "8px 12px",
    borderBottom: "1px solid #E2E8F0",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
  },
  td: {
    padding: "10px 12px",
    fontSize: "13px",
    color: "#334155",
    borderBottom: "1px solid #F1F5F9",
  },
  badge: {
    padding: "3px 10px",
    borderRadius: "20px",
    fontSize: "12px",
    fontWeight: 500,
  },
}