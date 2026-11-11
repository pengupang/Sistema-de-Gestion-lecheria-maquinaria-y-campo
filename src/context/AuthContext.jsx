import { createContext, useCallback, useContext, useEffect, useState } from "react"
import { supabase } from "../lib/supabase"
import { normalizarContexto } from "../lib/roles"

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  // undefined = todavía no sabemos si hay sesión
  const [session, setSession] = useState(undefined)
  // guardamos de qué usuario son los datos para evitar mostrar los de otro
  const [datos, setDatos] = useState({ userId: null, perfil: null, contexto: null })

  // Efecto 1: sesión (el callback solo guarda la sesión, nada de consultas aquí)
  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session))

    const { data: listener } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  // Efecto 2: perfil y empresa activa (con sus módulos y roles) del usuario con sesión
  const userId = session?.user?.id
  useEffect(() => {
    if (!userId) return
    let cancelled = false

    Promise.all([
      supabase.from("perfiles").select("id, rut, email, rol").eq("id", userId).maybeSingle(),
      supabase.rpc("contexto_actual"),
    ]).then(([perfilRes, ctxRes]) => {
      if (cancelled) return
      setDatos({
        userId,
        perfil: perfilRes.data ?? null,
        contexto: normalizarContexto(ctxRes.data),
      })
    })

    return () => {
      cancelled = true
    }
  }, [userId])

  // Cambia la empresa activa y recarga la app para que todo se vuelva a pedir
  // Solo administradores pueden cambiar (la base de datos lo valida también)
  const cambiarEmpresa = useCallback(async (empresaId) => {
    const c = datos.contexto
    if (!c?.esAdmin && !c?.esSuperadmin) throw new Error("Sin permiso para cambiar de empresa")
    const { error } = await supabase.rpc("cambiar_empresa", { p_empresa: empresaId })
    if (error) throw error
    window.location.assign("/")
  }, [datos.contexto])

  const actual = userId && datos.userId === userId
  const perfil = actual ? datos.perfil : null
  const contexto = actual ? datos.contexto : null
  // cargando = no sabemos la sesión, o hay sesión pero aún no llegan sus datos
  const loading = session === undefined || (!!userId && datos.userId !== userId)

  return (
    <AuthContext.Provider value={{ session: session ?? null, perfil, contexto, loading, cambiarEmpresa }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)