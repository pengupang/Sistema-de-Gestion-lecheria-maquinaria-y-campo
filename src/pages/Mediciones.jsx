import { useSearchParams } from "react-router-dom"
import { MapPin, Radio } from "lucide-react"
import MedicionesTerreno from "./MedicionesTerreno"
import MedicionesEnVivo from "./MedicionesEnVivo"
import s from "./estilosLecheria"
import tw from "@/lib/ui"

// Una sola sección de Mediciones (lo que antes era "PlantCare") con dos vistas:
//   · Por terreno: mediciones PUNTUALES de suelo (cliente y terreno), su historial y el diagnóstico IA
//   · Camas de terneros: el único monitoreo CONTINUO; lecturas por sensor, gráfico y actualización automática
// URL: /lecheria/mediciones?vista=terreno|vivo
const VISTAS = [
  { id: "terreno", label: "Suelo por terreno e IA", icono: MapPin },
  { id: "vivo", label: "Camas de terneros (en vivo)", icono: Radio },
]

export default function Mediciones() {
  const [params, setParams] = useSearchParams()
  const vista = VISTAS.some((v) => v.id === params.get("vista")) ? params.get("vista") : "terreno"

  return (
    <div className={tw.container}>
      <div className={tw.tabs}>
        {VISTAS.map(({ id, label, icono: Icono }) => (
          <button key={id} onClick={() => setParams({ vista: id })}
            className={tw.tab} style={{ display: "flex", alignItems: "center", gap: 6, ...(vista === id ? s.tabActive : {}) }}>
            <Icono size={14} /> {label}
          </button>
        ))}
      </div>
      {vista === "terreno" ? <MedicionesTerreno /> : <MedicionesEnVivo />}
    </div>
  )
}
