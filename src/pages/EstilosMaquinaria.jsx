// Estilos compartidos de las vistas de maquinaria (mismos de lechería, con acento azul)
import base from "./estilosLecheria"

export const AZUL = "#4A6FA5"

export const ESTADO_MAQUINA = {
  Disponible: { backgroundColor: "#D1FAE5", color: "#065F46" },
  Arrendada: { backgroundColor: "#FEF3C7", color: "#92400E" },
  Mantención: { backgroundColor: "#FEE2E2", color: "#991B1B" },
}
export const ESTADO_ARRIENDO = {
  Activo: { backgroundColor: "#D1FAE5", color: "#065F46" },
  Finalizado: { backgroundColor: "#F1F5F9", color: "#64748B" },
  Pendiente: { backgroundColor: "#FEF3C7", color: "#92400E" },
}
export const ESTADO_FACTURA = {
  Pagada: { backgroundColor: "#D1FAE5", color: "#065F46" },
  Pendiente: { backgroundColor: "#FEF3C7", color: "#92400E" },
  Vencida: { backgroundColor: "#FEE2E2", color: "#991B1B" },
}

const m = {
  ...base,
  btnAdd: { ...base.btnAdd, backgroundColor: AZUL },
  btnSave: { ...base.btnSave, backgroundColor: AZUL },
  iconBtnBlue: { ...base.iconBtnGreen, background: "#EBF2FB", color: AZUL },
  link: { display: "inline-flex", alignItems: "center", gap: "4px", color: AZUL, textDecoration: "none", fontSize: "13px" },
  rutTxt: { display: "block", fontSize: "11px", color: "#94A3B8" },
}
export default m

export const CATEGORIA_FALLA = ["Motor", "Hidráulico", "Eléctrico", "Neumáticos", "Otro"]

export const TIPO_MANTENCION = ["Preventiva", "Correctiva"]
export const ESTADO_MANTENCION = {
  Programada: { backgroundColor: "#DBEAFE", color: "#1E40AF" },
  "En curso": { backgroundColor: "#FEF3C7", color: "#92400E" },
  Realizada: { backgroundColor: "#D1FAE5", color: "#065F46" },
}