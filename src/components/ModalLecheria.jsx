import { X } from "lucide-react"
import s from "../pages/estilosLecheria"
import tw from "@/lib/ui"

// Campo de formulario: <Campo label="Nombre" full> <input .../> </Campo>
export function Campo({ label, full, children }) {
  return (
    <div style={full ? { gridColumn: "1 / -1" } : undefined}>
      <label style={s.label}>{label}</label>
      {children}
    </div>
  )
}

// `color` cambia el color del botón Guardar (verde por defecto = lechería; azul para maquinaria)
export default function ModalLecheria({ titulo, onClose, onSave, error, guardando, color, ancho, children }) {
  return (
    <div style={s.modalOverlay} onClick={onClose}>
      <div style={{ ...s.modal, ...(ancho ? { maxWidth: ancho } : {}) }} onClick={(e) => e.stopPropagation()}>
        <div style={s.modalHeader}>
          <h3 style={s.modalTitle}>{titulo}</h3>
          <button style={s.iconBtn} onClick={onClose}><X size={16} /></button>
        </div>
        <div className={tw.formGrid}>{children}</div>
        {error && <p style={s.errorText}>{error}</p>}
        <div className={tw.modalFooter}>
          <button style={s.btnCancel} onClick={onClose}>Cancelar</button>
          <button style={{ ...s.btnSave, ...(color ? { backgroundColor: color } : {}), opacity: guardando ? 0.6 : 1 }} onClick={onSave} disabled={guardando}>
            {guardando ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>
    </div>
  )
}