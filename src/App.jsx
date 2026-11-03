import { BrowserRouter ,Routes, Route , Navigate } from 'react-router-dom'
import PortalAcceso from './pages/PortalAcceso'
import Login from './pages/Login'
import RequireRole from './components/RequireRole'
import DashboardMaquinaria from './pages/DashboardMaquinaria'
import DashboardLecheria from './pages/DashboardLecheria'
import LayoutLecheria from './layout/LayoutLecheria'
import LayoutMaquinaria from './layout/LayoutMaquinaria'
import VistaMaquinaria from './pages/VistaMaquinaria'
import VistaProveedores from './pages/VistaProveedores'
import VistaComidas from './pages/VistasComidas'
import DashboardPlantCare from './pages/DashboardPlantCare'
import VistaHistoricosGastos from './pages/HistoricoGastos'
import VistaCalendarioAnimales from './pages/CalendarioAnimales'
import VistaClientes from './pages/Clientes'
import VistaServicios from './pages/Servicios'
import VistaArriendos from './pages/Arriendos'
import VistaFacturacion from './pages/Facturacion'
import VistaCalendarioArriendo from './pages/CalendarioMaquinas'
import VistaHistoricosMaquinaria from './pages/HistoricoMaquinaria'
import RebanoPotreros from './pages/RebanoPotreros'
import Sanidad from './pages/Sanidad'
import Genealogia from './pages/Genealogia'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Login único */}
        <Route path="/" element={<Login />} />

        {/* Selector de área (solo admin) */}
        <Route element={<RequireRole allow={["admin"]} />}>
          <Route path="/portal" element={<PortalAcceso />} />
        </Route>

        {/* Páginas Maquinaria: admin y maquinaria */}
        <Route element={<RequireRole allow={["admin", "maquinaria"]} modulo="maquinaria" />}>
          <Route path="/maquinaria" element={<LayoutMaquinaria />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardMaquinaria />} />
            <Route path="maquinas" element={<VistaMaquinaria />} />
            <Route path="clientes" element={<VistaClientes />} />
            <Route path="servicios" element={<VistaServicios />} />
            <Route path="arriendos" element={<VistaArriendos />} />
            <Route path="facturacion" element={<VistaFacturacion />} />
            <Route path="calendario" element={<VistaCalendarioArriendo />} />
            <Route path="historicos" element={<VistaHistoricosMaquinaria />} />
          </Route>
        </Route>

        {/* Páginas Lechería: admin y lecheria */}
        <Route element={<RequireRole allow={["admin", "lecheria"]} modulo="lecheria" />}>
          <Route path="/lecheria" element={<LayoutLecheria />}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<DashboardLecheria />} />
            <Route path="comidas" element={<VistaComidas />} />
            <Route path="proveedores" element={<VistaProveedores />} />
            <Route path="plantcare" element={<DashboardPlantCare />} />
            <Route path="calendario" element={<VistaCalendarioAnimales />} />
            <Route path="historicos" element={<VistaHistoricosGastos />} />
            <Route path="rebano" element={<RebanoPotreros />} />
            <Route path="sanidad" element={<Sanidad />} />
            <Route path="genealogia" element={<Genealogia />} />
          </Route>
        </Route>

        {/* Cualquier otra ruta */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App