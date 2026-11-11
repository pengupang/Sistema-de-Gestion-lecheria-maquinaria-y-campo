import { useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Pencil, Plus, Phone, Mail, Search } from "lucide-react"
import { proveedores as api } from "../services/lecheria"
import useCarga from "../lib/useCarga"
import EstadoCarga from "../components/EstadoCarga"
import s from "./estilosLecheria"
import tw from "@/lib/ui"

const link = { display: "inline-flex", alignItems: "center", gap: 4, color: "#3D6B4F", textDecoration: "none", fontSize: 13 }

// Vista de solo lectura. Crear, editar y eliminar: /lecheria/registrar?tipo=proveedor
export default function VistaProveedores() {
  const navigate = useNavigate()
  const { datos: proveedores, cargando, error, recargar } = useCarga(api.listar, [])
  const [q, setQ] = useState("")

  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase()
    return proveedores.filter((p) => !t || `${p.nombre} ${p.rut} ${p.contacto} ${p.rubro} ${p.comuna ?? ""}`.toLowerCase().includes(t))
  }, [proveedores, q])

  return (
    <div className={tw.container}>
      <div className={tw.topBar}>
        <div>
          <h2 style={s.title}>Proveedores</h2>
          <p style={s.sub}>{proveedores.length} proveedores registrados</p>
        </div>
        <button style={s.btnAdd} onClick={() => navigate("/lecheria/registrar?tipo=proveedor")}>
          <Plus size={15} /> Registrar proveedor
        </button>
      </div>

      <div className={tw.filtros}>
        <div className={tw.buscador}>
          <Search size={14} color="#94A3B8" />
          <input className={tw.buscadorInput} placeholder="Buscar empresa, RUT o rubro..." value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar} />

      {!cargando && !error && (
        <div className={tw.tableCard}>
          <table className={tw.table}>
            <thead>
              <tr>{["Empresa", "RUT", "Contacto", "Teléfono", "Email", "Rubro", "Comuna", ""].map((h) => <th key={h} className={tw.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {filtrados.map((p, i) => (
                <tr key={p.id} style={{ backgroundColor: i % 2 === 0 ? "#F8FAFC" : "#fff" }}>
                  <td className={tw.td}><span style={s.nombre}>{p.nombre}</span></td>
                  <td className={tw.td}>{p.rut}</td>
                  <td className={tw.td}>{p.contacto}</td>
                  <td className={tw.td}>{p.telefono && <a href={`tel:${p.telefono.replace(/\s/g, "")}`} style={link}><Phone size={12} /> {p.telefono}</a>}</td>
                  <td className={tw.td}>{p.email && <a href={`mailto:${p.email}`} style={link}><Mail size={12} /> {p.email}</a>}</td>
                  <td className={tw.td}>{p.rubro}</td>
                  <td className={tw.td}>{p.comuna}</td>
                  <td className={tw.td}>
                    <button style={s.iconBtnGreen} title="Editar en Registrar" onClick={() => navigate(`/lecheria/registrar?tipo=proveedor&id=${p.id}`)}><Pencil size={14} /></button>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && <tr><td colSpan={8} style={s.vacio}>No hay proveedores que coincidan.</td></tr>}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
