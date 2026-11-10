import { useCallback, useEffect, useRef, useState } from "react"

// Carga datos al montar la página y permite volver a cargarlos.
//   const { datos, cargando, error, recargar } = useCarga(maquinas.listar, [])
// `clave` (opcional): cuando cambia, se vuelve a cargar automáticamente
//   (ej. el mes visible de un calendario).
export default function useCarga(fn, inicial = null, clave = "") {
  const [datos, setDatos] = useState(inicial)
  const [cargando, setCargando] = useState(true)
  const [error, setError] = useState(null)

  // siempre se usa la versión más reciente de `fn`
  const fnRef = useRef(fn)
  useEffect(() => { fnRef.current = fn })

  // Carga automática (al montar o al cambiar `clave`). Ignora respuestas viejas.
  useEffect(() => {
    let cancelado = false
    fnRef.current()
      .then((d) => { if (!cancelado) { setDatos(d); setError(null) } })
      .catch((e) => { if (!cancelado) setError(e.message || String(e)) })
      .finally(() => { if (!cancelado) setCargando(false) })
    return () => { cancelado = true }
  }, [clave])

  // Recarga manual (después de guardar / eliminar)
  const recargar = useCallback(async () => {
    try {
      setError(null)
      setDatos(await fnRef.current())
    } catch (e) {
      setError(e.message || String(e))
    } finally {
      setCargando(false)
    }
  }, [])

  return { datos, setDatos, cargando, error, setError, recargar}
}