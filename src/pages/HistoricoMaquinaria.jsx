import { useMemo, useState } from "react"
import { TrendingUp, TrendingDown, Minus } from "lucide-react"
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend } from "recharts"
import { ingresosMensuales } from "../services/maquinaria"
import useCarga from "../lib/useCarga"
import { clp, MESES_CORTO as MESES } from "../lib/formato"
import EstadoCarga from "../components/EstadoCarga"

const suma = (v) => v.reduce((s, x) => s + x, 0)
const diff = (actual, anterior) => (anterior ? ((actual - anterior) / anterior * 100).toFixed(1) : null)

const DiffBadge = ({ val }) => {
  if (val === null) return null
  const n = parseFloat(val)
  const up = n > 0
  const eq = n === 0
  return (
    <span style={{display:"inline-flex",alignItems:"center",gap:"3px",padding:"2px 8px",borderRadius:"20px",fontSize:"12px",fontWeight:600,
      backgroundColor: eq?"#F1F5F9":up?"#D1FAE5":"#FEE2E2",
      color: eq?"#64748B":up?"#065F46":"#991B1B"}}>
      {eq ? <Minus size={11}/> : up ? <TrendingUp size={11}/> : <TrendingDown size={11}/>}
      {up?"+":""}{val}%
    </span>
  )
}

export default function VistaHistoricosMaquinaria() {
  const { datos: filas, cargando, error, recargar } = useCarga(ingresosMensuales, [])

  // { 2024: [12 valores], 2025: [...], ... } con ingresos netos de trabajos finalizados
  const datosMap = useMemo(() => {
    const m = {}
    for (const f of filas) {
      m[f.anio] ??= Array(12).fill(0)
      m[f.anio][f.mes - 1] = Number(f.ingresos_neto)
    }
    return m
  }, [filas])
  const anios = useMemo(() => Object.keys(datosMap).map(Number).sort((a, b) => a - b), [datosMap])

  const [sel, setSel] = useState({ a1: null, a2: null })
  // Por defecto: el último año con datos contra el anterior
  const anio1 = sel.a1 ?? anios[anios.length - 1]
  const anio2 = sel.a2 ?? anios[anios.length - 2] ?? anio1

  if (cargando || error || anios.length === 0)
    return (
      <div style={styles.container}>
        <div style={styles.topBar}><div><h2 style={styles.title}>Datos Históricos</h2><p style={styles.sub}>Comparativa entre años</p></div></div>
        <EstadoCarga cargando={cargando} error={error} onReintentar={recargar} />
        {!cargando && !error && <p style={{fontSize:13,color:"#94A3B8"}}>Aún no hay trabajos finalizados para comparar.</p>}
      </div>
    )

  const d1 = datosMap[anio1] ?? Array(12).fill(0)
  const d2 = datosMap[anio2] ?? Array(12).fill(0)

  // Comparación justa: solo los meses en que el primer año tiene datos (ej. ene–oct si el año está en curso)
  const meses = d1.map((v, i) => (v > 0 ? i : -1)).filter((i) => i >= 0)
  const total1 = suma(meses.map((i) => d1[i]))
  const total2 = suma(meses.map((i) => d2[i]))
  const prom1 = meses.length ? total1 / meses.length : 0
  const prom2 = meses.length ? total2 / meses.length : 0
  const diffTotal = diff(total1, total2)
  const diffProm = diff(prom1, prom2)
  const maxV = Math.max(...d1)

  const dataComparativa = MESES.map((mes, i) => ({ mes, [String(anio1)]: d1[i], [String(anio2)]: d2[i] }))
    .filter((d) => d[String(anio1)] > 0 || d[String(anio2)] > 0)

  return (
    <div style={styles.container}>
      <div style={styles.topBar}>
        <div><h2 style={styles.title}>Datos Históricos</h2><p style={styles.sub}>Ingresos netos de trabajos finalizados · se comparan los mismos meses ({meses.length ? `${MESES[meses[0]]}–${MESES[meses[meses.length-1]]}` : "—"})</p></div>
        <div style={styles.anioSelector}>
          <span style={styles.anioLabel}>Comparar:</span>
          <select style={styles.select} value={anio1} onChange={e=>setSel({a1:Number(e.target.value),a2:anio2})}>
            {anios.map(a=><option key={a}>{a}</option>)}
          </select>
          <span style={styles.anioLabel}>vs</span>
          <select style={styles.select} value={anio2} onChange={e=>setSel({a1:anio1,a2:Number(e.target.value)})}>
            {anios.map(a=><option key={a}>{a}</option>)}
          </select>
        </div>
      </div>

      {/* Cards comparativas */}
      <div style={styles.cardsRow}>
        <div style={styles.compCard}>
          <p style={styles.compLabel}>Ingresos del período</p>
          <div style={styles.compValues}>
            <div><span style={styles.compAnio}>{anio1}</span><span style={styles.compVal}>${(total1/1000000).toFixed(2)}M</span></div>
            <div style={styles.compDivider}/>
            <div><span style={styles.compAnio}>{anio2}</span><span style={styles.compVal}>${(total2/1000000).toFixed(2)}M</span></div>
          </div>
          <DiffBadge val={diffTotal} />
        </div>
        <div style={styles.compCard}>
          <p style={styles.compLabel}>Promedio mensual</p>
          <div style={styles.compValues}>
            <div><span style={styles.compAnio}>{anio1}</span><span style={styles.compVal}>{clp(prom1)}</span></div>
            <div style={styles.compDivider}/>
            <div><span style={styles.compAnio}>{anio2}</span><span style={styles.compVal}>{clp(prom2)}</span></div>
          </div>
          <DiffBadge val={diffProm} />
        </div>
        <div style={styles.compCard}>
          <p style={styles.compLabel}>Mejor mes {anio1}</p>
          <span style={styles.compVal}>{maxV > 0 ? MESES[d1.indexOf(maxV)] : "—"}</span>
          <p style={styles.compSub}>{clp(maxV)}</p>
        </div>
        <div style={styles.compCard}>
          <p style={styles.compLabel}>Crecimiento {anio1} vs {anio2}</p>
          <DiffBadge val={diffTotal} />
          <p style={styles.compSub}>{diffTotal === null ? "Sin datos para comparar" : parseFloat(diffTotal)>0?"Mejor que el año comparado":"Por debajo del año comparado"}</p>
        </div>
      </div>

      {/* Gráfico comparativo */}
      <div style={styles.chartCard}>
        <h3 style={styles.chartTitle}>Ingresos mensuales — {anio1} vs {anio2}</h3>
        <ResponsiveContainer width="100%" height={260}>
          <BarChart data={dataComparativa} barGap={4}>
            <XAxis dataKey="mes" tick={{fontSize:11}} />
            <YAxis tick={{fontSize:11}} tickFormatter={v=>`$${(v/1000000).toFixed(1)}M`} />
            <Tooltip formatter={v=>[clp(v)]} />
            <Legend wrapperStyle={{fontSize:12}} />
            <Bar dataKey={String(anio1)} fill="#1B2A4A" radius={[3,3,0,0]} />
            {anio2 !== anio1 && <Bar dataKey={String(anio2)} fill="#7BA7D4" radius={[3,3,0,0]} />}
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Tabla detalle por mes */}
      <div style={styles.tableCard}>
        <h3 style={styles.chartTitle}>Detalle mensual</h3>
        <table style={styles.table}>
          <thead><tr>
            <th style={styles.th}>Mes</th>
            <th style={styles.th}>{anio1}</th>
            <th style={styles.th}>{anio2}</th>
            <th style={styles.th}>Variación</th>
          </tr></thead>
          <tbody>
            {MESES.map((mes,i)=>{
              const v1 = d1[i]
              const v2 = d2[i]
              if (!v1 && !v2) return null
              const d = v1 && v2 ? diff(v1,v2) : null
              const dn = d ? parseFloat(d) : null
              return (
                <tr key={mes} style={{backgroundColor:i%2===0?"#F8FAFC":"#fff"}}>
                  <td style={styles.td}>{mes}</td>
                  <td style={{...styles.td,fontWeight:600}}>{v1 ? clp(v1) : "—"}</td>
                  <td style={styles.td}>{v2 ? clp(v2) : "—"}</td>
                  <td style={styles.td}>
                    {d && <span style={{color:dn>0?"#065F46":dn<0?"#991B1B":"#64748B",fontWeight:600,fontSize:"12px"}}>
                      {dn>0?"+":""}{d}%
                    </span>}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

const styles = {
  container:{display:"flex",flexDirection:"column",gap:"20px"},
  topBar:{display:"flex",justifyContent:"space-between",alignItems:"center",flexWrap:"wrap",gap:"12px"},
  title:{fontSize:"18px",fontWeight:700,color:"#1E293B",margin:0},
  sub:{fontSize:"13px",color:"#94A3B8",margin:"4px 0 0 0"},
  anioSelector:{display:"flex",alignItems:"center",gap:"8px"},
  anioLabel:{fontSize:"13px",color:"#64748B"},
  select:{padding:"6px 10px",border:"1px solid #E2E8F0",borderRadius:"6px",fontSize:"13px",backgroundColor:"#F8FAFC",cursor:"pointer"},
  cardsRow:{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:"16px"},
  compCard:{backgroundColor:"#fff",borderRadius:"10px",padding:"20px",border:"1px solid #E2E8F0",display:"flex",flexDirection:"column",gap:"10px"},
  compLabel:{fontSize:"12px",color:"#94A3B8",margin:0,fontWeight:600,textTransform:"uppercase",letterSpacing:"0.04em"},
  compValues:{display:"flex",gap:"8px",alignItems:"center"},
  compAnio:{display:"block",fontSize:"11px",color:"#94A3B8"},
  compVal:{display:"block",fontSize:"18px",fontWeight:700,color:"#1E293B"},
  compDivider:{width:1,height:36,backgroundColor:"#E2E8F0"},
  compSub:{fontSize:"11px",color:"#94A3B8",margin:0},
  chartCard:{backgroundColor:"#fff",borderRadius:"10px",padding:"20px",border:"1px solid #E2E8F0",minWidth:0},
  chartTitle:{fontSize:"14px",fontWeight:600,color:"#1E293B",margin:"0 0 16px 0"},
  tableCard:{backgroundColor:"#fff",borderRadius:"10px",border:"1px solid #E2E8F0",overflowX:"auto",padding:"20px"},
  table:{width:"100%",borderCollapse:"collapse",minWidth:"560px"},
  th:{textAlign:"left",fontSize:"11px",fontWeight:600,color:"#94A3B8",padding:"10px 16px",borderBottom:"1px solid #E2E8F0",textTransform:"uppercase",letterSpacing:"0.05em",backgroundColor:"#F8FAFC"},
  td:{padding:"10px 16px",fontSize:"13px",color:"#334155",borderBottom:"1px solid #F1F5F9"},
}