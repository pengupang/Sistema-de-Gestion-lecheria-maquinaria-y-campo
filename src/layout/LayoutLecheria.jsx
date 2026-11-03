import { useState } from "react"
import { Outlet, useNavigate, useLocation } from "react-router-dom"
import { supabase } from "../lib/supabase"
import { useAuth } from "../context/AuthContext"
import SelectorEmpresa from "../components/SelectorEmpresa"
import {
  Leaf,
  ShoppingBasket,
  Truck,
  CalendarDays,
  BarChart2,
  PieChart,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  Menu,
  ArrowLeftRight,
  PawPrint, 
  Stethoscope,
  GitBranch,
} from "lucide-react"

const navItems = [
  { label: "Dashboard",           icon: LayoutDashboard, path: "/lecheria/dashboard" },
  { label: "PlantCare",           icon: Leaf,            path: "/lecheria/plantcare" },
  { label: "Comidas",             icon: ShoppingBasket,  path: "/lecheria/comidas" },
  { label: "Proveedores",         icon: Truck,           path: "/lecheria/proveedores" },
  { label: "Calendario Animales", icon: CalendarDays,    path: "/lecheria/calendario" },
  { label: "Gastos Históricos",   icon: PieChart,        path: "/lecheria/historicos" },
  { label: "Rebaño y Potreros", icon: PawPrint,    path: "/lecheria/rebano" },
  { label: "Sanidad y Manejo",  icon: Stethoscope, path: "/lecheria/sanidad" },
  { label: "Genealogía",        icon: GitBranch,   path: "/lecheria/genealogia" },
]

export default function LayoutLecheria() {
  const { perfil, contexto } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [collapsed, setCollapsed] = useState(false)

  const handleLogout = async () => {
    await supabase.auth.signOut()
    navigate("/")
  }

  return (
    <div style={styles.root}>
      {/* ── Sidebar ── */}
      <aside style={{ ...styles.sidebar, width: collapsed ? 64 : 240 }}>
        {/* Logo */}
        <div style={styles.sidebarHeader}>
          <div style={styles.logoIcon}>
            <Leaf size={18} color="#ffffff" />
          </div>
          {!collapsed && (
            <span style={styles.logoText}>Lechería</span>
          )}
        </div>

        {/* Nav items */}
        <nav style={styles.nav}>
          {navItems.map(({ label, icon: Icon, path }) => {
            const active = location.pathname === path
            return (
              <button
                key={path}
                onClick={() => navigate(path)}
                style={{
                  ...styles.navItem,
                  backgroundColor: active ? "rgba(255,255,255,0.12)" : "transparent",
                  borderLeft: active ? "3px solid #6FCF97" : "3px solid transparent",
                }}
                title={collapsed ? label : ""}
              >
                <Icon size={18} color={active ? "#A8E6C0" : "#6A9B7A"} />
                {!collapsed && (
                  <span style={{ ...styles.navLabel, color: active ? "#ffffff" : "#8AC4A0" }}>
                    {label}
                  </span>
                )}
                {!collapsed && active && <ChevronRight size={14} color="#6FCF97" style={{ marginLeft: "auto" }} />}
              </button>
            )
          })}
        </nav>

        {/* Collapse toggle */}
        <button onClick={() => setCollapsed(!collapsed)} style={styles.collapseBtn}>
          {collapsed ? <ChevronRight size={16} color="#6A9B7A" /> : <Menu size={16} color="#6A9B7A" />}
        </button>
      </aside>

      {/* ── Main ── */}
      <div style={styles.main}>
        {/* Header */}
        <header style={styles.header}>
          <h2 style={styles.pageTitle}>
            {navItems.find(i => i.path === location.pathname)?.label ?? "Dashboard"}
          </h2>
          <div style={styles.headerRight}>
            <SelectorEmpresa />
            <span style={styles.userName}>{perfil?.email ?? "Usuario"}</span>
            {contexto?.esAdmin && contexto.modulos.length > 1 && (
              <button onClick={() => navigate("/portal")} style={styles.logoutBtn} title="Cambiar de área">
                <ArrowLeftRight size={16} />
                <span>Cambiar de área</span>
              </button>
            )}
            <button onClick={handleLogout} style={styles.logoutBtn} title="Cerrar sesión">
              <LogOut size={16} />
              <span>Salir</span>
            </button>
          </div>
        </header>

        {/* Content */}
        <main style={styles.content}>
          <Outlet />
        </main>
      </div>
    </div>
  )
}

const SIDEBAR_BG = "#1E3128"

const styles = {
  root: {
    display: "flex",
    height: "100vh",
    width: "100vw",
    fontFamily: "'Inter', system-ui, sans-serif",
    overflow: "hidden",
    backgroundColor: "#F0F7F2",
  },
  sidebar: {
    backgroundColor: SIDEBAR_BG,
    display: "flex",
    flexDirection: "column",
    transition: "width 0.25s ease",
    overflow: "hidden",
    flexShrink: 0,
  },
  sidebarHeader: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "20px 16px",
    borderBottom: "1px solid rgba(255,255,255,0.06)",
  },
  logoIcon: {
    width: 32,
    height: 32,
    borderRadius: "8px",
    backgroundColor: "#3D6B4F",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  logoText: {
    color: "#ffffff",
    fontWeight: 700,
    fontSize: "15px",
    whiteSpace: "nowrap",
  },
  nav: {
    flex: 1,
    padding: "12px 8px",
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    overflowY: "auto",
  },
  navItem: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "9px 10px",
    borderRadius: "6px",
    cursor: "pointer",
    border: "none",
    width: "100%",
    textAlign: "left",
    transition: "background 0.15s",
  },
  navLabel: {
    fontSize: "13.5px",
    fontWeight: 500,
    whiteSpace: "nowrap",
  },
  collapseBtn: {
    margin: "8px",
    padding: "8px",
    backgroundColor: "transparent",
    border: "1px solid rgba(255,255,255,0.08)",
    borderRadius: "6px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  main: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    overflow: "hidden",
  },
  header: {
    backgroundColor: "#ffffff",
    borderBottom: "1px solid #D1E8DA",
    padding: "0 24px",
    height: "60px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    flexShrink: 0,
  },
  pageTitle: {
    fontSize: "16px",
    fontWeight: 600,
    color: "#1E293B",
    margin: 0,
  },
  headerRight: {
    display: "flex",
    alignItems: "center",
    gap: "16px",
  },
  userName: {
    fontSize: "13px",
    color: "#64748B",
    fontWeight: 500,
  },
  logoutBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "6px 12px",
    backgroundColor: "transparent",
    border: "1px solid #D1E8DA",
    borderRadius: "6px",
    color: "#64748B",
    fontSize: "13px",
    cursor: "pointer",
    transition: "all 0.15s",
  },
  content: {
    flex: 1,
    overflowY: "auto",
    padding: "24px",
  },
}