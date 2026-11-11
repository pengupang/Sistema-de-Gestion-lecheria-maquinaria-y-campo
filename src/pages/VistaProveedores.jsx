import { useMemo, useState } from "react"
import { Pencil, Trash2, Plus, Phone, Mail, Search } from "lucide-react"
import { proveedores as api } from "../services/lecheria"
import { validarRut, formatearRut } from "../lib/auth"
import useCarga from "../lib/useCarga"
import EstadoCarga from "../components/EstadoCarga"
import ModalLecheria, { Campo } from "../components/ModalLecheria"
import s from "./estilosLecheria"
import tw from "@/lib/ui"

const vacio = { nombre: "", rut: "", contacto: "", telefono: "", email: "", rubro: "", comuna: "" }
const iconBtnBlue = { ...s.iconBtnGreen, background: "#EBF2FB", color: "#4A6FA5" }
const link = { display: "inline-flex", alignItems: "center", gap: 4, color: "#3D6B4F", textDecoration: "none", fontSize: 13 }

export default function VistaProveedores() {
  const { datos: proveedores, cargando, error, setError, recargar } = useCarga(api.listar, [])
  const [q, setQ] = useState("")
  const [modal, setModal] = useState(null)
  const [modalError, setModalError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const campo = (k, v) => setModal((m) => ({ ...m, [k]: v }))
  const filtrados = useMemo(() => {
    const t = q.trim().toLowerCase()
    return proveedores.filter((p) => !t || `${p.nombre} ${p.rut} ${p.contacto} ${p.rubro} ${p.comuna ?? ""}`.toLowerCase().includes(t))
  }, [proveedores, q])

  const guardar = async () => {
    if (!modal.nombre.trim()) return setModalError("El nombre es obligatorio")
    if (!modal.rut.trim()) return setModalError("El RUT es obligatorio")
    if (!validarRut(modal.rut)) return setModalError("El RUT no es válido")
    const payload = {
      nombre: modal.nombre.trim(),
      rut: formatearRut(modal.rut),
      contacto: modal.contacto.trim(),
      telefono: modal.telefono.trim(),
      email: modal.email.trim(),
      rubro: modal.rubro.trim(),
      comuna: modal.comuna?.trim() || null,
    }
    try {
      setGuardando(true)
      setModalError(null)
      if (modal.id) await api.actualizar(modal.id, payload)
      else await api.crear(payload)
      setModal(null)
      await recargar()
    } catch (e) {
      setModalError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  const eliminar = async (p) => {
    if (!window.confirm(`¿Eliminar a ${p.nombre}? Sus gastos e insumos quedarán sin proveedor.`)) return
    try { await api.eliminar(p.id); await recargar() } catch (e) { setError(e.message) }
  }

  return (
    <div className={tw.container}>
      <div className={tw.topBar}>
        <div>
          <h2 style={s.title}>Proveedores</h2>
          <p style={s.sub}>{proveedores.length} proveedores registrados</p>
        </div>
        <button style={s.btnAdd} onClick={() => { setModalError(null); setModal({ ...vacio }) }}>
          <Plus size={15} /> Agregar proveedor
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
                    <div className={tw.actions}>
                      <button style={iconBtnBlue} title="Editar" onClick={() => { setModalError(null); setModal({ ...p, comuna: p.comuna ?? "" }) }}><Pencil size={14} /></button>
                      <button style={s.iconBtnRed} title="Eliminar" onClick={() => eliminar(p)}><Trash2 size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtrados.length === 0 && <tr><td colSpan={8} style={s.vacio}>No hay proveedores que coincidan.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {modal && (
        <ModalLecheria titulo={modal.id ? "Editar proveedor" : "Nuevo proveedor"} onClose={() => setModal(null)} onSave={guardar} error={modalError} guardando={guardando}>
          <Campo label="Nombre empresa" full><input style={s.input} value={modal.nombre} onChange={(e) => campo("nombre", e.target.value)} /></Campo>
          <Campo label="RUT"><input style={s.input} value={modal.rut} onChange={(e) => campo("rut", formatearRut(e.target.value))} placeholder="76.123.456-7" /></Campo>
          <Campo label="Rubro"><input style={s.input} value={modal.rubro} onChange={(e) => campo("rubro", e.target.value)} /></Campo>
          <Campo label="Contacto"><input style={s.input} value={modal.contacto} onChange={(e) => campo("contacto", e.target.value)} /></Campo>
          <Campo label="Teléfono"><input style={s.input} value={modal.telefono} onChange={(e) => campo("telefono", e.target.value)} placeholder="+56 9 1234 5678" /></Campo>
          <Campo label="Email"><input style={s.input} type="email" value={modal.email} onChange={(e) => campo("email", e.target.value)} /></Campo>
          <Campo label="Comuna"><input style={s.input} value={modal.comuna ?? ""} onChange={(e) => campo("comuna", e.target.value)} /></Campo>
        </ModalLecheria>
      )}
    </div>
  )
}