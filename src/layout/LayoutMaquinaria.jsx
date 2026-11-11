import { Wrench, FileText, BarChart2, Settings, Users, CalendarRange, ClipboardPlus } from "lucide-react"
import LayoutModulo from "./LayoutModulo"

const navItems = [
  { label: "Dashboard", icon: BarChart2, path: "/maquinaria/dashboard" },
  { label: "Facturación", icon: FileText, path: "/maquinaria/facturacion" },
  { label: "Maquinaria", icon: Wrench, path: "/maquinaria/maquinas" },
  { label: "Arriendos", icon: FileText, path: "/maquinaria/arriendos" },
  { label: "Clientes", icon: Users, path: "/maquinaria/clientes" },
  { label: "Servicios", icon: Settings, path: "/maquinaria/servicios" },
  { label: "Calendario", icon: CalendarRange, path: "/maquinaria/calendario" },
  { label: "Datos Históricos", icon: BarChart2, path: "/maquinaria/historicos" },
  { label: "Registros", icon: ClipboardPlus, path: "/maquinaria/registrar" },
]

// Atajos de la barra inferior en celular (máx. 4; el resto queda en "Más")
const atajos = ["/maquinaria/dashboard", "/maquinaria/arriendos", "/maquinaria/calendario", "/maquinaria/registrar"]

// Clases completas (no armadas con variables) para que Tailwind las incluya
const tema = {
  fondo: "bg-[#F0F4F8]",
  sidebar: "bg-[#1B2A4A]",
  logo: "bg-[#4A6FA5]",
  bordeActivo: "border-[#7BA7D4]",
  texto: "text-[#8AADD4]",
  icono: "text-[#6B89AF]",
  iconoActivo: "text-[#A8C4E8]",
}

export default function LayoutMaquinaria() {
  return <LayoutModulo modulo="maquinaria" nombre="Maquinaria" Icono={Wrench} navItems={navItems} tema={tema} atajos={atajos} />
}
