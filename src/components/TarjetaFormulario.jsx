import s from "@/pages/estilosLecheria"

// Campo de formulario: <Campo label="Nombre" full> <input .../> </Campo>
export function Campo({ label, full, children }) {
  return (
    <div style={full ? { gridColumn: "1 / -1" } : undefined}>
      <label style={s.label}>{label}</label>
      {children}
    </div>
  )
}

// Mismas props que ModalLecheria, pero se dibuja como tarjeta dentro de la página (sin overlay).
// `onCancel` limpia el formulario o vuelve atrás; si no se pasa, no se muestra el botón Cancelar.
export default function TarjetaFormulario({ titulo, subtitulo, onCancel, onSave, error, guardando, color, children }) {
  return (
    <div style={estilos.tarjeta}>
      <div style={s.modalHeader}>
        <div>
          <h3 style={s.modalTitle}>{titulo}</h3>
          {subtitulo && <p style={{ ...s.sub, marginTop: 4 }}>{subtitulo}</p>}
        </div>
      </div>
      <div style={s.formGrid}>{children}</div>
      {error && <p style={s.errorText}>{error}</p>}
      <div style={s.modalFooter}>
        {onCancel && <button style={s.btnCancel} onClick={onCancel} disabled={guardando}>Cancelar</button>}
        <button
          style={{ ...s.btnSave, ...(color ? { backgroundColor: color } : {}), opacity: guardando ? 0.6 : 1 }}
          onClick={onSave}
          disabled={guardando}
        >
          {guardando ? "Guardando..." : "Guardar"}
        </button>
      </div>
    </div>
  )
}

const estilos = {
  tarjeta: { ...s.card, padding: "24px", gap: 0 },
}
