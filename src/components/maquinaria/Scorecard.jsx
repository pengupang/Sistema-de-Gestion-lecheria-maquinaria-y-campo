import s from "@/pages/EstilosMaquinaria"

// Tarjeta de indicador: <Scorecard icono={Wrench} color="#4A6FA5" bg="#EBF2FB" valor={12} etiqueta="Equipos" detalle="3 disponibles" />
export default function Scorecard({ icono: Icono, color, bg, valor, etiqueta, detalle }) {
  return (
    <div style={s.stat}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 8, backgroundColor: bg, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icono size={18} color={color} />
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={s.statValue}>{valor}</p>
          <p style={s.statLabel}>{etiqueta}</p>
          {detalle && <p style={{ ...s.statLabel, fontSize: 11 }}>{detalle}</p>}
        </div>
      </div>
    </div>
  )
}
