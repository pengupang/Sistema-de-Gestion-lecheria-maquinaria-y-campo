import { useState } from "react"
import { Send, X } from "lucide-react"
import { supabase } from "../lib/supabase"
import s from "../pages/estilosLecheria"

// Usuario del bot (sin @), opcional. En .env: VITE_TELEGRAM_BOT=mi_bot
const BOT = import.meta.env.VITE_TELEGRAM_BOT

export default function VincularTelegram() {
  const [abierto, setAbierto] = useState(false)
  const [codigo, setCodigo] = useState(null)
  const [error, setError] = useState(null)
  const [cargando, setCargando] = useState(false)

  const abrir = async () => {
    setAbierto(true)
    setCodigo(null)
    setError(null)
    setCargando(true)
    const { data, error } = await supabase.rpc("generar_codigo_telegram")
    setCargando(false)
    if (error) setError(error.message)
    else setCodigo(data)
  }

  return (
    <>
      <button
        onClick={abrir}
        title="Recibir alertas y consultar desde Telegram"
        style={{ display: "flex", alignItems: "center", gap: 6, padding: "6px 12px", backgroundColor: "transparent", border: "1px solid #D1E8DA", borderRadius: 6, color: "#64748B", fontSize: 13, cursor: "pointer" }}
      >
        <Send size={16} />
        <span>Telegram</span>
      </button>

      {abierto && (
        <div style={s.modalOverlay} onClick={() => setAbierto(false)}>
          <div style={{ ...s.modal, maxWidth: 420 }} onClick={(e) => e.stopPropagation()}>
            <div style={s.modalHeader}>
              <h3 style={s.modalTitle}>Conectar Telegram</h3>
              <button style={s.iconBtn} onClick={() => setAbierto(false)}><X size={16} /></button>
            </div>

            {cargando && <p style={s.sub}>Generando código...</p>}
            {error && <p style={s.errorText}>{error}</p>}
            {codigo && (
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <p style={s.sub}>
                  1. Abre el bot en Telegram{BOT ? <> (<a href={`https://t.me/${BOT}`} target="_blank" rel="noreferrer">@{BOT}</a>)</> : ""}.<br />
                  2. Escribe este comando (vale 15 minutos y sirve una sola vez):
                </p>
                <div style={{ fontFamily: "monospace", fontSize: 18, fontWeight: 700, padding: "12px 14px", background: "#F0F7F2", border: "1px solid #D1E8DA", borderRadius: 8, textAlign: "center", userSelect: "all" }}>
                  /vincular {codigo}
                </div>
                <p style={s.sub}>Recibirás un resumen cada mañana y podrás usar /agenda, /stock y /animal.</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}