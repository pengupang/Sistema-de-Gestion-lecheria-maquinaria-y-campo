import { useEffect, useState } from "react"
import { Outlet, useNavigate, useLocation } from "react-router-dom"
import { LogOut, ChevronRight, Menu, X, ArrowLeftRight } from "lucide-react"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"
import SelectorEmpresa from "../components/SelectorEmpresa"
import VincularTelegram from "../components/VincularTelegram"
import { destinoPorRol } from "../lib/roles"

// Plantilla común de los módulos (Maquinaria, Lechería). Responsive:
//   · celular (< md): barra de atajos abajo; el menú completo se abre desde "Más"
//   · tablet / media pantalla (md – lg): menú colapsado solo con íconos (se puede expandir)
//   · escritorio (≥ lg): menú completo
//
// tema: clases de color del módulo (deben ser clases completas para que Tailwind las detecte)
const NOMBRE_MODULO = { maquinaria: "Maquinaria", lecheria: "Lechería" }

const botonHeader =
  "flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-[13px] text-slate-500 transition-colors hover:bg-slate-50"

export default function LayoutModulo({ modulo, nombre, Icono, navItems, tema, atajos }) {
  const { perfil, contexto } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [colapsada, setColapsada] = useState(() => window.innerWidth < 1024)
  const [abierta, setAbierta] = useState(false)

  useEffect(() => setAbierta(false), [location.pathname]) // al navegar, cierra el panel en celular

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/")
  }
  // Cambio directo de área: solo para admin, y solo si la empresa activa tiene este módulo y otro más
  // (hoy, la empresa que maneja lechería y maquinaria). Va directo al otro módulo, sin el portal.
  const otroModulo = contexto?.esAdmin ? contexto.modulos.find((m) => m !== modulo && destinoPorRol[m]) : null
  const titulo = navItems.find((i) => i.path === location.pathname)?.label ?? "Dashboard"
  const ocultoSiColapsada = colapsada ? "md:hidden" : "" // solo afecta a escritorio; en el panel del celular siempre hay texto
  // Atajos de la barra inferior en celular: los indicados por el módulo, o los 4 primeros del menú
  const itemsAtajo = (atajos ?? navItems.slice(0, 4).map((i) => i.path))
    .map((p) => navItems.find((i) => i.path === p))
    .filter(Boolean)
  const enAtajo = itemsAtajo.some((i) => i.path === location.pathname)

  return (
    <div className={`flex h-dvh w-full overflow-hidden font-sans ${tema.fondo}`}>
      {abierta && <div className="fixed inset-0 z-40 bg-slate-900/40 md:hidden" onClick={() => setAbierta(false)} />}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-60 flex-col transition-all duration-200 md:static md:translate-x-0
          ${tema.sidebar} ${abierta ? "translate-x-0" : "-translate-x-full"} ${colapsada ? "md:w-[68px]" : "md:w-60"}`}
      >
        <div className="flex items-center gap-3 border-b border-white/5 px-4 py-5">
          <button
            onClick={() => setColapsada((c) => !c)}
            className={`hidden h-8 w-8 shrink-0 items-center justify-center rounded-lg md:flex ${tema.logo}`}
            title={colapsada ? "Expandir menú" : "Colapsar menú"}
          >
            {colapsada ? <Menu size={18} className="text-white" /> : <Icono size={16} className="text-white" />}
          </button>
          <div className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg md:hidden ${tema.logo}`}>
            <Icono size={16} className="text-white" />
          </div>
          <span className={`whitespace-nowrap text-[15px] font-bold text-white ${ocultoSiColapsada}`}>{nombre}</span>
          <button onClick={() => setAbierta(false)} className="ml-auto text-white/70 md:hidden" title="Cerrar menú">
            <X size={18} />
          </button>
        </div>

        <nav className="flex flex-1 flex-col gap-0.5 overflow-y-auto p-2">
          {navItems.map(({ label, icon: Icon, path }) => {
            const activo = location.pathname === path
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                title={colapsada ? label : undefined}
                className={`flex w-full items-center gap-2.5 rounded-md border-l-[3px] px-2.5 py-2 text-left transition-colors
                  ${activo ? `${tema.bordeActivo} bg-white/10 text-white` : `border-transparent ${tema.texto} hover:bg-white/5`}`}
              >
                <Icon size={18} className={`shrink-0 ${activo ? tema.iconoActivo : tema.icono}`} />
                <span className={`whitespace-nowrap text-[13.5px] font-medium ${ocultoSiColapsada}`}>{label}</span>
                {activo && <ChevronRight size={14} className={`ml-auto ${tema.iconoActivo} ${ocultoSiColapsada}`} />}
              </button>
            )
          })}
        </nav>
      </aside>

      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <header className="flex h-14 shrink-0 items-center justify-between gap-2 border-b border-slate-200 bg-white px-3 md:h-[60px] md:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <h2 className="truncate text-base font-semibold text-slate-800">{titulo}</h2>
          </div>
          <div className="flex shrink-0 items-center gap-2 md:gap-3">
            <SelectorEmpresa />
            <VincularTelegram />
            <span className="hidden max-w-[200px] truncate text-[13px] font-medium text-slate-500 xl:inline">{perfil?.email ?? "Usuario"}</span>
            {otroModulo && (
              <button onClick={() => navigate(destinoPorRol[otroModulo])} className={botonHeader}
                title={`Ir a ${NOMBRE_MODULO[otroModulo] ?? otroModulo}`}>
                <ArrowLeftRight size={16} />
                <span className="hidden lg:inline">Ir a {NOMBRE_MODULO[otroModulo] ?? otroModulo}</span>
              </button>
            )}
            <button onClick={handleLogout} className={botonHeader} title="Cerrar sesión">
              <LogOut size={16} />
              <span className="hidden lg:inline">Salir</span>
            </button>
          </div>
        </header>

        <main className="min-w-0 flex-1 overflow-y-auto p-3 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:p-4 sm:pb-[calc(5rem+env(safe-area-inset-bottom))] md:p-6">
          <Outlet />
        </main>
      </div>

      {/* Barra de atajos inferior (solo celular) */}
      <nav className={`fixed inset-x-0 bottom-0 z-30 flex border-t border-white/10 pb-[env(safe-area-inset-bottom)] md:hidden ${tema.sidebar}`}>
        {itemsAtajo.map(({ label, icon: Icon, path }) => {
          const activo = location.pathname === path
          return (
            <button key={path} onClick={() => navigate(path)}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 ${activo ? "text-white" : tema.texto}`}>
              <Icon size={20} className={activo ? tema.iconoActivo : tema.icono} />
              <span className="w-full truncate px-1 text-center text-[10.5px] font-medium">{label}</span>
            </button>
          )
        })}
        <button onClick={() => setAbierta(true)}
          className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 py-2 ${!enAtajo ? "text-white" : tema.texto}`}>
          <Menu size={20} className={!enAtajo ? tema.iconoActivo : tema.icono} />
          <span className="text-[10.5px] font-medium">Más</span>
        </button>
      </nav>
    </div>
  )
}
