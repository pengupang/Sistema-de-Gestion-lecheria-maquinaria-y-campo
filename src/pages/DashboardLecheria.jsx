import { Leaf, AlertTriangle, Package, Thermometer, Droplets } from "lucide-react"
import { Link } from "react-router-dom"
import { resumenLecheria } from "../services/lecheria"
import useCarga from "../lib/useCarga"
import { hoyLargo } from "../lib/formato"
import EstadoCarga from "../components/EstadoCarga"

// Variables de la última medición real (tabla mediciones). Se muestran solo las que vienen con dato.
const VARIABLES_MEDICION = [
  { campo: "humedad_suelo", parametro: "Humedad suelo / cama", unidad: "%", icono: Droplets, color: "#0EA5E9" },
  { campo: "temperatura_suelo", parametro: "Temperatura suelo / cama", unidad: "°C", icono: Thermometer, color: "#F59E0B" },
  { campo: "humedad_ambiente", parametro: "Humedad ambiente", unidad: "%", icono: Droplets, color: "#0E7490" },
  { campo: "temperatura_ambiente", parametro: "Temperatura ambiente", unidad: "°C", icono: Thermometer, color: "#EF4444" },
  { campo: "ph", parametro: "pH", unidad: "", icono: Leaf, color: "#10B981" },
  { campo: "nitrogeno", parametro: "Nitrógeno (N)", unidad: "kg/ha", icono: Leaf, color: "#8B5CF6" },
  { campo: "fosforo", parametro: "Fósforo (P)", unidad: "kg/ha", icono: Leaf, color: "#EC4899" },
  { campo: "potasio", parametro: "Potasio (K)", unidad: "kg/ha", icono: Leaf, color: "#F59E0B" },
]

export default function DashboardLecheria() {
  const { datos: r, cargando, error, recargar } = useCarga(resumenLecheria, null)

  const stats = r && [
    { label: "Animales activos", value: r.animalesActivos.toLocaleString("es-CL"), icon: Leaf, color: "#3D6B4F", bg: "#D1FAE5", sub: "en el rebaño" },
    { label: "Productos en stock", value: r.totalInsumos, icon: Package, color: "#0EA5E9", bg: "#E0F2FE", sub: "ítems en inventario" },
    { label: "Alertas de stock bajo", value: r.alertasStock.length, icon: AlertTriangle, color: "#EF4444", bg: "#FEE2E2", sub: "requieren atención" },
  ]

  return (
    <div style={styles.container}>
      <p style={styles.fecha}>{hoyLargo()}</p>
      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar} />

      {r && (<>
      {/* Stats */}
      <div style={styles.grid}>
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

      <div style={styles.row}>
        {/* Alertas stock bajo */}
        <div style={{ ...styles.tableCard, flex: 1 }}>
          <div style={styles.tableHeader}>
            <AlertTriangle size={16} color="#EF4444" />
            <h3 style={{ ...styles.tableTitle, color: "#EF4444" }}>Alertas de stock bajo</h3>
          </div>
          <table style={styles.table}>
            <thead>
              <tr>
                {["Producto", "Stock actual", "Mínimo", ""].map(h => (
                  <th key={h} style={styles.th}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {r.alertasStock.map((a, i) => (
                <tr key={a.id} style={{ backgroundColor: i % 2 === 0 ? "#FFF7F7" : "#ffffff" }}>
                  <td style={styles.td}>{a.nombre}</td>
                  <td style={styles.td}>
                    <span style={{ color: Number(a.stock) === 0 ? "#EF4444" : "#F59E0B", fontWeight: 600 }}>
                      {Number(a.stock).toLocaleString("es-CL")} {a.unidad}
                    </span>
                  </td>
                  <td style={styles.td}>{Number(a.minimo).toLocaleString("es-CL")} {a.unidad}</td>
                  <td style={styles.td}>
                    <span style={{
                      ...styles.badge,
                      backgroundColor: Number(a.stock) === 0 ? "#FEE2E2" : "#FEF3C7",
                      color: Number(a.stock) === 0 ? "#991B1B" : "#92400E",
                    }}>
                      {Number(a.stock) === 0 ? "Sin stock" : "Stock bajo"}
                    </span>
                  </td>
                </tr>
              ))}
              {r.alertasStock.length === 0 && <tr><td colSpan={4} style={{ ...styles.td, textAlign: "center", color: "#94A3B8" }}>Todo el inventario está sobre el mínimo.</td></tr>}
            </tbody>
          </table>
        </div>

        {/* Última medición */}
        <div style={{ ...styles.tableCard, flex: 1 }}>
          <div style={styles.tableHeader}>
            <Leaf size={16} color="#3D6B4F" />
            <h3 style={styles.tableTitle}>Última medición</h3>
          </div>
          <div style={styles.medicionesList}>
            {(() => {
              const m = r.ultimaMedicion
              const filas = m ? VARIABLES_MEDICION.filter((v) => m[v.campo] != null) : []
              if (!filas.length) return <p style={styles.medicionFecha}>Aún no hay mediciones registradas.</p>
              return filas.map(({ campo, parametro, unidad, icono: Icon, color }) => (
                <div key={campo} style={styles.medicionRow}>
                  <div style={{ ...styles.medicionIcon, backgroundColor: color + "18" }}>
                    <Icon size={14} color={color} />
                  </div>
                  <span style={styles.medicionLabel}>{parametro}</span>
                  <span style={styles.medicionValor}>{Number(m[campo]).toLocaleString("es-CL", { maximumFractionDigits: 1 })} {unidad}</span>
                </div>
              ))
            })()}
          </div>
          <p style={styles.medicionFecha}>
            {r.ultimaMedicion ? `Medida el ${new Date(r.ultimaMedicion.created_at).toLocaleString("es-CL", { dateStyle: "short", timeStyle: "short" })} · ` : ""}
            <Link to="/lecheria/mediciones" style={{ color: "#3D6B4F" }}>Ver mediciones</Link>
          </p>
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
    border: "1px solid #D1E8DA",
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
  row: {
    display: "flex",
    gap: "16px",
    flexWrap: "wrap",
  },
  tableCard: {
    backgroundColor: "#ffffff",
    borderRadius: "10px",
    padding: "20px",
    border: "1px solid #D1E8DA",
    boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
    minWidth: "min(280px, 100%)",
    flex: "1 1 320px",
    overflowX: "auto",
  },
  tableHeader: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "16px",
  },
  tableTitle: {
    fontSize: "14px",
    fontWeight: 600,
    color: "#1E293B",
    margin: 0,
  },
  table: {
    width: "100%",
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
  medicionesList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  medicionRow: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "8px 0",
    borderBottom: "1px solid #F1F5F9",
  },
  medicionIcon: {
    width: 28,
    height: 28,
    borderRadius: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  medicionLabel: {
    fontSize: "13px",
    color: "#475569",
    flex: 1,
  },
  medicionValor: {
    fontSize: "13px",
    fontWeight: 600,
    color: "#1E293B",
  },
  medicionFecha: {
    fontSize: "11px",
    color: "#94A3B8",
    marginTop: "12px",
    marginBottom: 0,
  },
}