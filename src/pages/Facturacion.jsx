import { useMemo, useState } from "react"
import { DollarSign, TrendingUp, Users, Search } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line } from "recharts"
import { facturas as api } from "../services/maquinaria"
import useCarga from "../lib/useCarga"
import { clp, fechaCL, MESES_CORTO } from "../lib/formato"
import EstadoCarga from "../components/EstadoCarga"
import s,{ ESTADO_FACTURA } from "./EstilosMaquinaria"
import { descargarCSV } from "@/lib/exportar"

const POR_PAGINA = 100
const nombreMaq = (f) => `${f.arriendo?.maquina?.nombre ?? ""} ${f.arriendo?.maquina?.modelo ?? ""}`.trim()

// Suma neto y cantidad de facturas agrupadas por una clave; devuelve lista ordenada de mayor a menor
const ranking = (lista, clave) => {
  const acc = {}
  for (const f of lista) {
    const k = clave(f) || "—"
    acc[k] ??= { nombre: k, total: 0, arriendos: 0 }
    acc[k].total += Number(f.neto)
    acc[k].arriendos += 1
  }
  return Object.values(acc).sort((a, b) => b.total - a.total).slice(0, 5)
}

export default function VistaFacturacion() {
  const { datos: facturas, cargando, error, recargar } = useCarga(api.listar, [])
  const hoy = new Date()
  const [anio, setAnio] = useState(String(hoy.getFullYear()))
  const [busqueda, setBusqueda] = useState("")
  const [limite, setLimite] = useState(POR_PAGINA)

  const anios = useMemo(() => {
    const a = new Set(facturas.map((f) => f.fecha_emision.slice(0, 4)))
    a.add(String(hoy.getFullYear()))
    return [...a].sort().reverse()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [facturas])

  const delAnio = useMemo(() => facturas.filter((f) => f.fecha_emision.startsWith(anio)), [facturas, anio])

  const datos = useMemo(
    () =>
      MESES_CORTO.map((mes, i) => {
        const mm = String(i + 1).padStart(2, "0")
        const f = delAnio.filter((x) => x.fecha_emision.slice(5, 7) === mm)
        return { mes, ingresos: f.reduce((t, x) => t + Number(x.neto), 0), arriendos: f.length }
      }),
    [delAnio]
  )

  const esAnioActual = anio === String(hoy.getFullYear())
  const totalAnual = datos.reduce((t, d) => t + d.ingresos, 0)
  const mesesConDatos = datos.filter((d) => d.ingresos > 0).length
  const kpiMes = esAnioActual ? datos[hoy.getMonth()].ingresos : mesesConDatos ? totalAnual / mesesConDatos : 0
  const porCobrar = facturas.filter((f) => f.estado !== "Pagada").reduce((t, f) => t + Number(f.total), 0)
  const vencidas = facturas.filter((f) => f.estado === "Vencida").reduce((t, f) => t + Number(f.total), 0)
  const totalClientes = new Set(delAnio.map((f) => f.cliente_id)).size

  const topServicios = useMemo(() => ranking(delAnio, (f) => f.arriendo?.servicio?.nombre), [delAnio])
  const topMaquinas = useMemo(() => ranking(delAnio, nombreMaq), [delAnio])

  const registrosFiltrados = useMemo(() => {
    const t = busqueda.trim().toLowerCase()
    return delAnio.filter(
      (f) => !t || `${f.cliente?.nombre} ${nombreMaq(f)} ${f.arriendo?.servicio?.nombre} ${f.numero}`.toLowerCase().includes(t)
    )
  }, [delAnio, busqueda])

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <div><h2 style={styles.title}>Facturación e Inteligencia de Negocio</h2><p style={styles.sub}>Resumen financiero del año {anio} · montos netos (sin IVA) salvo donde se indica</p></div>
        <button
  style={s.btnCancel}
  onClick={() =>
    descargarCSV(`facturas-${anio}`, [
      { titulo: "N° factura", valor: (f) => f.numero },
      { titulo: "Fecha emisión", valor: (f) => fechaCL(f.fecha_emision) },
      { titulo: "Cliente", valor: (f) => f.cliente?.nombre },
      { titulo: "Máquina", valor: (f) => nombreMaq(f) },
      { titulo: "Servicio", valor: (f) => f.arriendo?.servicio?.nombre },
      { titulo: "Neto", valor: (f) => f.neto },
      { titulo: "Total (con IVA)", valor: (f) => f.total },
      { titulo: "Estado", valor: (f) => f.estado },
    ], registrosFiltrados)
  }
>
  Exportar a Excel
</button>
        <select style={styles.select} value={anio} onChange={(e) => { setAnio(e.target.value); setLimite(POR_PAGINA) }}>
          {anios.map((a) => <option key={a} value={a}>{a}</option>)}
        </select>
      </div>

      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar} />

      {!cargando && !error && (<>
      {/* KPIs */}
      <div style={styles.kpiGrid}>
        {[
          { label:`Ingresos totales ${anio}`, value:clp(totalAnual), icon:DollarSign, bg:"#D1FAE5", color:"#065F46" },
          { label:esAnioActual ? "Ingresos este mes" : "Promedio mensual", value:clp(kpiMes), icon:TrendingUp, bg:"#DBEAFE", color:"#1D4ED8" },
          { label:`Por cobrar (con IVA)${vencidas ? ` · ${clp(vencidas)} vencido` : ""}`, value:clp(porCobrar), icon:DollarSign, bg:"#FEF3C7", color:"#92400E" },
          { label:`Clientes facturados ${anio}`, value:totalClientes, icon:Users, bg:"#EDE9FE", color:"#7C3AED" },
        ].map(({label,value,icon:Icon,bg,color})=>(
          <div key={label} style={styles.kpiCard}>
            <div style={{...styles.kpiIcon,backgroundColor:bg}}><Icon size={18} color={color}/></div>
            <div><p style={styles.kpiVal}>{value}</p><p style={styles.kpiLab}>{label}</p></div>
          </div>
        ))}
      </div>

      {/* Gráficos */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Ingresos mensuales {anio}</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={datos}>
              <XAxis dataKey="mes" tick={{fontSize:11}} />
              <YAxis tick={{fontSize:11}} tickFormatter={v=>`$${(v/1000000).toFixed(1)}M`} />
              <Tooltip formatter={v=>[clp(v), "Ingresos"]} />
              <Bar dataKey="ingresos" fill="#4A6FA5" radius={[4,4,0,0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div style={styles.chartCard}>
          <h3 style={styles.chartTitle}>Facturas emitidas por mes</h3>
          <ResponsiveContainer width="100%" height={200}>
            <LineChart data={datos}>
              <XAxis dataKey="mes" tick={{fontSize:11}} />
              <YAxis tick={{fontSize:11}} allowDecimals={false} />
              <Tooltip formatter={v=>[v, "Facturas"]} />
              <Line type="monotone" dataKey="arriendos" stroke="#4A6FA5" strokeWidth={2} dot={{r:4}} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Top servicios y máquinas */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {[["Top servicios", topServicios, "#4A6FA5"], ["Top maquinaria", topMaquinas, "#1B2A4A"]].map(([titulo, lista, color]) => (
          <div key={titulo} style={styles.topCard}>
            <h3 style={styles.chartTitle}>{titulo}</h3>
            {lista.length === 0 && <p style={{fontSize:13,color:"#94A3B8"}}>Sin facturas en {anio}</p>}
            {lista.map((x,i)=>(
              <div key={x.nombre} style={styles.topItem}>
                <div style={styles.topRank}>#{i+1}</div>
                <div style={{flex:1}}>
                  <div style={styles.topNombre}>{x.nombre} <span style={{color:"#94A3B8",fontWeight:400}}>· {x.arriendos} trabajos</span></div>
                  <div style={styles.topBar2}>
                    <div style={{...styles.topBarFill, width:`${(x.total/lista[0].total)*100}%`, backgroundColor:color}} />
                  </div>
                </div>
                <div style={styles.topMonto}>${(x.total/1000000).toFixed(1)}M</div>
              </div>
            ))}
          </div>
        ))}
      </div>

      {/* Tabla con búsqueda */}
      <div style={styles.tableCard}>
        <div style={styles.tableTopBar}>
          <h3 style={styles.chartTitle}>Facturas {anio} ({registrosFiltrados.length})</h3>
          <div style={styles.searchBox}>
            <Search size={14} color="#94A3B8" />
            <input style={styles.searchInput} placeholder="Buscar cliente, máquina, servicio o N°..."
              value={busqueda} onChange={e=>{ setBusqueda(e.target.value); setLimite(POR_PAGINA) }} />
          </div>
        </div>
        <table style={styles.table}>
          <thead><tr>{["Emisión","N°","Cliente","Máquina","Servicio","Neto","Total c/IVA","Estado"].map(h=><th key={h} style={styles.th}>{h}</th>)}</tr></thead>
          <tbody>
            {registrosFiltrados.slice(0, limite).map((f,i)=>(
              <tr key={f.id} style={{backgroundColor:i%2===0?"#F8FAFC":"#fff"}}>
                <td style={styles.td}>{fechaCL(f.fecha_emision)}</td>
                <td style={styles.td}>{f.numero}</td>
                <td style={styles.td}>{f.cliente?.nombre}</td>
                <td style={{...styles.td,fontSize:"12px"}}>{nombreMaq(f)}</td>
                <td style={styles.td}>{f.arriendo?.servicio?.nombre}</td>
                <td style={{...styles.td,fontWeight:600}}>{clp(f.neto)}</td>
                <td style={styles.td}>{clp(f.total)}</td>
                <td style={styles.td}><span style={{padding:"3px 10px",borderRadius:"20px",fontSize:"12px",fontWeight:500,...ESTADO_FACTURA[f.estado]}}>{f.estado}</span></td>
              </tr>
            ))}
            {registrosFiltrados.length === 0 && <tr><td colSpan={8} style={{...styles.td,textAlign:"center",color:"#94A3B8"}}>Sin facturas.</td></tr>}
          </tbody>
        </table>
        {registrosFiltrados.length > limite && (
          <div style={{padding:12,textAlign:"center"}}>
            <button onClick={()=>setLimite(l=>l+POR_PAGINA)} style={{padding:"8px 16px",border:"1px solid #E2E8F0",borderRadius:6,background:"transparent",color:"#64748B",fontSize:13,cursor:"pointer"}}>
              Ver más ({registrosFiltrados.length - limite} restantes)
            </button>
          </div>
        )}
      </div>
      </>)}
    </div>
  )
}

const styles = {
  select:{padding:"8px 10px",border:"1px solid #E2E8F0",borderRadius:"6px",fontSize:"13px",backgroundColor:"#fff",color:"#334155"},
  container:{display:"flex",flexDirection:"column",gap:"20px"},
  topBar:{display:"flex",justifyContent:"space-between",alignItems:"flex-start",flexWrap:"wrap",gap:"12px"},
  title:{fontSize:"18px",fontWeight:700,color:"#1E293B",margin:0},
  sub:{fontSize:"13px",color:"#94A3B8",margin:"4px 0 0 0"},
  kpiGrid:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"16px"},
  kpiCard:{backgroundColor:"#fff",borderRadius:"10px",padding:"18px",display:"flex",alignItems:"center",gap:"14px",border:"1px solid #E2E8F0"},
  kpiIcon:{width:40,height:40,borderRadius:"8px",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0},
  kpiVal:{fontSize:"20px",fontWeight:700,color:"#1E293B",margin:"0 0 2px 0"},
  kpiLab:{fontSize:"12px",color:"#94A3B8",margin:0},
  chartsRow:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"},
  chartCard:{backgroundColor:"#fff",borderRadius:"10px",padding:"20px",border:"1px solid #E2E8F0",minWidth:0},
  chartTitle:{fontSize:"14px",fontWeight:600,color:"#1E293B",margin:"0 0 16px 0"},
  topRow:{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"},
  topCard:{backgroundColor:"#fff",borderRadius:"10px",padding:"20px",border:"1px solid #E2E8F0"},
  topItem:{display:"flex",alignItems:"center",gap:"10px",marginBottom:"14px"},
  topRank:{width:24,height:24,borderRadius:"50%",backgroundColor:"#EBF2FB",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",fontWeight:700,color:"#4A6FA5",flexShrink:0},
  topNombre:{fontSize:"12px",fontWeight:500,color:"#334155",marginBottom:"4px"},
  topBar2:{height:6,backgroundColor:"#F1F5F9",borderRadius:"3px",overflow:"hidden"},
  topBarFill:{height:"100%",borderRadius:"3px",transition:"width 0.3s"},
  topMonto:{fontSize:"12px",fontWeight:700,color:"#1E293B",flexShrink:0},
  tableCard:{backgroundColor:"#fff",borderRadius:"10px",border:"1px solid #E2E8F0",overflowX:"auto"},
  tableTopBar:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"10px",padding:"16px 16px 0 16px"},
  searchBox:{display:"flex",alignItems:"center",gap:"8px",padding:"7px 12px",border:"1px solid #E2E8F0",borderRadius:"6px",backgroundColor:"#F8FAFC",flex:"1 1 240px",maxWidth:"360px"},
  searchInput:{border:"none",background:"none",fontSize:"13px",outline:"none",width:"100%",minWidth:0,color:"#334155"},
  table:{width:"100%",borderCollapse:"collapse",marginTop:"12px",minWidth:"720px"},
  th:{textAlign:"left",fontSize:"11px",fontWeight:600,color:"#94A3B8",padding:"10px 16px",borderBottom:"1px solid #E2E8F0",textTransform:"uppercase",letterSpacing:"0.05em",backgroundColor:"#F8FAFC"},
  td:{padding:"11px 16px",fontSize:"13px",color:"#334155",borderBottom:"1px solid #F1F5F9"},
}