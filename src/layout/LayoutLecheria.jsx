import { Leaf, ShoppingBasket, Truck, CalendarDays, PieChart, LayoutDashboard, PawPrint, Stethoscope, GitBranch } from "lucide-react"
import LayoutModulo from "./LayoutModulo"

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard, path: "/lecheria/dashboard" },
  { label: "PlantCare", icon: Leaf, path: "/lecheria/plantcare" },
  { label: "Comidas", icon: ShoppingBasket, path: "/lecheria/comidas" },
  { label: "Proveedores", icon: Truck, path: "/lecheria/proveedores" },
  { label: "Calendario Animales", icon: CalendarDays, path: "/lecheria/calendario" },
  { label: "Gastos Históricos", icon: PieChart, path: "/lecheria/historicos" },
  { label: "Rebaño y Potreros", icon: PawPrint, path: "/lecheria/rebano" },
  { label: "Sanidad y Manejo", icon: Stethoscope, path: "/lecheria/sanidad" },
  { label: "Genealogía", icon: GitBranch, path: "/lecheria/genealogia" },
]

// Atajos de la barra inferior en celular (máx. 4; el resto queda en "Más")
const atajos = ["/lecheria/dashboard", "/lecheria/plantcare", "/lecheria/comidas", "/lecheria/calendario"]

// Clases completas (no armadas con variables) para que Tailwind las incluya
const tema = {
  fondo: "bg-[#F0F7F2]",
  sidebar: "bg-[#1E3128]",
  logo: "bg-[#3D6B4F]",
  bordeActivo: "border-[#6FCF97]",
  texto: "text-[#8AC4A0]",
  icono: "text-[#6A9B7A]",
  iconoActivo: "text-[#A8E6C0]",
}

export default function LayoutLecheria() {
  return <LayoutModulo modulo="lecheria" nombre="Lechería" Icono={Leaf} navItems={navItems} tema={tema} atajos={atajos} />
}
