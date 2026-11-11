import { useCallback, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Pencil, TrendingUp, TrendingDown, DollarSign, ShoppingCart } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from "recharts"
import { gastos as api, proveedores as proveedoresApi } from "../services/lecheria"
import useCarga from "../lib/useCarga"
import { clp, fechaCL, MESES_CORTO as MESES } from "../lib/formato"
import EstadoCarga from "../components/EstadoCarga"
import s from "./estilosLecheria"

import { CATEGORIAS_GASTO as categorias, COLORES_GASTO as categoriasColors } from "./constantesLecheria"
const POR_PAGINA = 100

const sumarPor = (lista, clave) => {
  const acc = {}
  for (const g of lista) acc[clave(g)] = (acc[clave(g)] || 0) + Number(g.monto)
  return acc
}

// Vista de solo lectura. Crear, editar y eliminar: /lecheria/registrar?tipo=gasto
export default function VistaHistoricosGastos() {
  const navigate = useNavigate()
  const cargarTodo = useCallback(async () => {
    const [gastos, proveedores] = await Promise.all([api.listar(), proveedoresApi.listar()])
    return { gastos, proveedores }
  }, [])
  const { datos, cargando, error, recargar } = useCarga(cargarTodo, { gastos: [], proveedores: [] })
  const { gastos, proveedores } = datos

  const hoy = new Date()
  const [anio, setAnio] = useState(String(hoy.getFullYear())) // "todos" = todos los años
  const [filtroCategoria, setFiltroCategoria] = useState("Todos")
  const [limite, setLimite] = useState(POR_PAGINA)

  const anios = useMemo(() => {
    const a = new Set(gastos.map((g) => g.fecha.slice(0, 4)))
    a.add(String(hoy.getFullYear()))
    return [...a].sort().reverse()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [gastos])

  const delPeriodo = useMemo(() => (anio === "todos" ? gastos : gastos.filter((g) => g.fecha.startsWith(anio))), [gastos, anio])
  const nombreProveedor = (id) => proveedores.find((p) => p.id === id)?.nombre

  // Stats
  const totalGastos = delPeriodo.reduce((sum, g) => sum + Number(g.monto), 0)
  const mesActual = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, "0")}`
  const gastosMes = gastos.filter((g) => g.fecha.startsWith(mesActual)).reduce((sum, g) => sum + Number(g.monto), 0)
  const porCategoria = sumarPor(delPeriodo, (g) => g.categoria)
  const maxCategoria = Object.entries(porCategoria).sort((a, b) => b[1] - a[1])[0]

  // Gráfico de barras: por mes si hay un año elegido, por año si son "todos"
  const datosMes = useMemo(() => {
    if (anio === "todos") {
      const porAnio = sumarPor(gastos, (g) => g.fecha.slice(0, 4))
      return Object.keys(porAnio).sort().map((a) => ({ mes: a, total: porAnio[a] }))
    }
    const porMes = sumarPor(delPeriodo, (g) => g.fecha.slice(5, 7))
    return MESES.map((mes, i) => ({ mes, total: porMes[String(i + 1).padStart(2, "0")] || 0 }))
  }, [anio, gastos, delPeriodo])

  const datosCat = Object.entries(porCategoria).map(([name, value]) => ({ name, value }))

  const gastosFiltrados = useMemo(
    () => (filtroCategoria === "Todos" ? delPeriodo : delPeriodo.filter((g) => g.categoria === filtroCategoria)),
    [delPeriodo, filtroCategoria]
  )

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <div>
          <h2 style={styles.title}>Histórico de Gastos</h2>
          <p style={styles.sub}>{delPeriodo.length.toLocaleString("es-CL")} registros · {anio === "todos" ? "todos los años" : anio}</p>
        </div>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <select style={s.select} value={anio} onChange={(e) => { setAnio(e.target.value); setLimite(POR_PAGINA) }}>
            <option value="todos">Todos los años</option>
            {anios.map((a) => <option key={a} value={a}>{a}</option>)}
          </select>
          <button style={styles.btnAdd} onClick={() => navigate("/lecheria/registrar?tipo=gasto")}>
            <Plus size={15} /> Registrar gasto
          </button>
        </div>
      </div>

      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar} />

      {!cargando && !error && (<>
      {/* Cards resumen */}
      <div style={styles.statsGrid}>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: "#D1FAE5" }}>
            <DollarSign size={18} color="#3D6B4F" />
          </div>
          <div>
            <p style={styles.statValue}>{clp(totalGastos)}</p>
            <p style={styles.statLabel}>{anio === "todos" ? "Total histórico" : `Total ${anio}`}</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: "#DBEAFE" }}>
            <TrendingUp size={18} color="#3B82F6" />
          </div>
          <div>
            <p style={styles.statValue}>{clp(gastosMes)}</p>
            <p style={styles.statLabel}>Gastos este mes</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: "#EDE9FE" }}>
            <ShoppingCart size={18} color="#8B5CF6" />
          </div>
          <div>
            <p style={styles.statValue}>{maxCategoria?.[0] ?? "—"}</p>
            <p style={styles.statLabel}>Mayor categoría</p>
          </div>
        </div>
        <div style={styles.statCard}>
          <div style={{ ...styles.statIcon, backgroundColor: "#FEF3C7" }}>
            <TrendingDown size={18} color="#F59E0B" />
          </div>
          <div>
            <p style={styles.statValue}>{clp(delPeriodo.length ? totalGastos / delPeriodo.length : 0)}</p>
            <p style={styles.statLabel}>Gasto promedio</p>
          </div>
        </div>
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>{anio === "todos" ? "Gastos por año" : `Gastos por mes ${anio}`}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={datosMes}>
              <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${(v/1000000).toFixed(1)}M`} />
              <Tooltip formatter={v => [clp(v), "Total"]} />
              <Bar dataKey="total" fill="#3D6B4F" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Distribución por categoría</h3>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={datosCat} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={70}>
                {datosCat.map(entry => (
                  <Cell key={entry.name} fill={categoriasColors[entry.name] || "#94A3B8"} />
                ))}
              </Pie>
              <Legend iconSize={10} wrapperStyle={{ fontSize: 11 }} />
              <Tooltip formatter={v => [clp(v)]} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tabla */}
      <div style={styles.tableCard}>
        <div style={styles.tableTopBar}>
          <h3 style={styles.tableTitle}>Detalle de gastos ({gastosFiltrados.length.toLocaleString("es-CL")})</h3>
          <div style={styles.filtros}>
            {["Todos", ...categorias].map(c => (
              <button key={c} onClick={() => { setFiltroCategoria(c); setLimite(POR_PAGINA) }}
                style={{ ...styles.filtroBadge, backgroundColor: filtroCategoria === c ? "#1E3128" : "#F1F5F9", color: filtroCategoria === c ? "#fff" : "#64748B" }}>
                {c}
              </button>
            ))}
          </div>
        </div>
        <table style={styles.table}>
          <thead>
            <tr>
              {["Fecha", "Categoría", "Descripción", "Proveedor", "Monto", ""].map(h => (
                <th key={h} style={styles.th}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {gastosFiltrados.slice(0, limite).map((g, i) => (
              <tr key={g.id} style={{ backgroundColor: i % 2 === 0 ? "#F8FAFC" : "#ffffff" }}>
                <td style={styles.td}>{fechaCL(g.fecha)}</td>
                <td style={styles.td}>
                  <span style={{ ...styles.catBadge, backgroundColor: categoriasColors[g.categoria] + "20", color: categoriasColors[g.categoria] }}>
                    {g.categoria}
                  </span>
                </td>
                <td style={styles.td}>{g.descripcion}{g.documento && <span style={{ display: "block", fontSize: 11, color: "#94A3B8" }}>Doc. {g.documento}</span>}</td>
                <td style={styles.td}>{nombreProveedor(g.proveedor_id) ?? "—"}</td>
                <td style={{ ...styles.td, fontWeight: 600 }}>{clp(g.monto)}</td>
                <td style={styles.td}>
                  <button style={styles.editBtn} title="Editar en Registrar" onClick={() => navigate(`/lecheria/registrar?tipo=gasto&id=${g.id}`)}><Pencil size={14} /></button>
                </td>
              </tr>
            ))}
            {gastosFiltrados.length === 0 && <tr><td colSpan={6} style={{ ...styles.td, textAlign: "center", color: "#94A3B8" }}>Sin gastos para este filtro.</td></tr>}
          </tbody>
        </table>
        {gastosFiltrados.length > limite && (
          <div style={{ padding: 12, textAlign: "center" }}>
            <button style={s.btnCancel} onClick={() => setLimite(l => l + POR_PAGINA)}>Ver más ({(gastosFiltrados.length - limite).toLocaleString("es-CL")} restantes)</button>
          </div>
        )}
      </div>
      </>)}

    </div>
  )
}

const styles = {
  container: { display: "flex", flexDirection: "column", gap: "20px" },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: "12px" },
  title: { fontSize: "18px", fontWeight: 700, color: "#1E293B", margin: 0 },
  sub: { fontSize: "13px", color: "#94A3B8", margin: "4px 0 0 0" },
  btnAdd: { display: "flex", alignItems: "center", gap: "6px", padding: "8px 16px", backgroundColor: "#3D6B4F", border: "none", borderRadius: "6px", color: "#fff", fontSize: "13px", fontWeight: 600, cursor: "pointer" },
  statsGrid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: "16px" },
  statCard: { backgroundColor: "#fff", borderRadius: "10px", padding: "18px", display: "flex", alignItems: "center", gap: "14px", border: "1px solid #D1E8DA" },
  statIcon: { width: 40, height: 40, borderRadius: "8px", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 },
  statValue: { fontSize: "20px", fontWeight: 700, color: "#1E293B", margin: "0 0 2px 0" },
  statLabel: { fontSize: "12px", color: "#94A3B8", margin: 0 },
  chartsRow: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" },
  chartCard: { backgroundColor: "#fff", borderRadius: "10px", padding: "20px", border: "1px solid #D1E8DA", minWidth: 0 },
  chartTitle: { fontSize: "14px", fontWeight: 600, color: "#1E293B", margin: "0 0 16px 0" },
  tableCard: { backgroundColor: "#fff", borderRadius: "10px", border: "1px solid #D1E8DA", overflowX: "auto" },
  tableTopBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 16px 0 16px", flexWrap: "wrap", gap: "10px" },
  tableTitle: { fontSize: "14px", fontWeight: 600, color: "#1E293B", margin: 0 },
  filtros: { display: "flex", gap: "6px", flexWrap: "wrap" },
  filtroBadge: { padding: "4px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 500, border: "none", cursor: "pointer" },
  table: { width: "100%", borderCollapse: "collapse", marginTop: "12px", minWidth: "640px" },
  th: { textAlign: "left", fontSize: "11px", fontWeight: 600, color: "#94A3B8", padding: "10px 16px", borderBottom: "1px solid #E2E8F0", textTransform: "uppercase", letterSpacing: "0.05em", backgroundColor: "#F8FAFC" },
  td: { padding: "11px 16px", fontSize: "13px", color: "#334155", borderBottom: "1px solid #F1F5F9" },
  catBadge: { padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 500 },
  editBtn: { background: "#D1FAE5", border: "none", borderRadius: "4px", padding: "5px", cursor: "pointer", color: "#065F46" },
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