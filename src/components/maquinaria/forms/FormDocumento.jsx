import { useState } from "react"
import { documentos as api } from "@/services/maquinaria"
import { useAuth } from "@/context/AuthContext"
import TarjetaFormulario, { Campo } from "@/components/TarjetaFormulario"
import s, { AZUL } from "@/pages/EstilosMaquinaria"

// Sube una factura o boleta (PDF o imagen) al bucket "facturas".
// Al editar solo se cambia la nota; para cambiar el archivo, se elimina y se sube otro.
export default function FormDocumento({ inicial, onGuardado, onCancel }) {
  const { session, contexto } = useAuth()
  const editando = Boolean(inicial?.id)

  const [nota, setNota] = useState(inicial?.nota ?? "")
  const [archivo, setArchivo] = useState(null)
  const [inputKey, setInputKey] = useState(0) // cambiarlo vacía el input de archivo
  const [error, setError] = useState(null)
  const [guardando, setGuardando] = useState(false)

  const guardar = async () => {
    if (!editando && !archivo) return setError("Selecciona un archivo")
    try {
      setGuardando(true)
      setError(null)
      if (editando) {
        await api.actualizar(inicial.id, { nota: nota.trim() || null })
      } else {
        await api.subir(archivo, nota, contexto.empresaId, session.user.id)
        setNota("")
        setArchivo(null)
        setInputKey((k) => k + 1)
      }
      await onGuardado?.()
    } catch (e) {
      setError(e.message)
    } finally {
      setGuardando(false)
    }
  }

  return (
    <TarjetaFormulario
      titulo={editando ? "Editar documento" : "Subir documento"}
      subtitulo="Facturas o boletas en PDF o imagen (máx. 15 MB). También se pueden enviar por Telegram."
      color={AZUL}
      onSave={guardar}
      onCancel={onCancel}
      error={error}
      guardando={guardando}
    >
      <Campo label="Archivo" full>
        {editando ? (
          <p style={{ ...s.input, margin: 0, backgroundColor: "#F8FAFC" }}>{inicial.nombre_original}</p>
        ) : (
          <input
            key={inputKey}
            style={s.input}
            type="file"
            accept=".pdf,image/jpeg,image/png,image/webp"
            onChange={(e) => setArchivo(e.target.files[0] ?? null)}
          />
        )}
      </Campo>
      <Campo label="Nota (N° de documento, proveedor…)" full>
        <input
          style={s.input}
          value={nota}
          onChange={(e) => setNota(e.target.value)}
          placeholder="Ej: Factura 1234 · Copeval"
        />
      </Campo>
    </TarjetaFormulario>
  )
}