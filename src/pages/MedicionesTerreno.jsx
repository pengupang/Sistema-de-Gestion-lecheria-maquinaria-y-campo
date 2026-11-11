import { useEffect, useState } from "react"
import { supabase } from "@/lib/supabase"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from "recharts"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Leaf, FlaskConical, Zap, TestTube, Droplets, Thermometer,
  ShieldAlert, Info, User, Clock, FileText
} from "lucide-react"
import { MetricaCard } from "@/components/ui/MetricaCard"
import { SearchableSelect } from "@/components/SearchableSelect"
import { MapaTerreno } from "@/components/MapaTerreno"
import { generarRecomendacion } from "@/lib/groq"

function formatFecha(fechaISO) {
  const d = new Date(fechaISO)
  return d.toLocaleDateString("es-CL", { day: "2-digit", month: "2-digit" })
}

// Mediciones por terreno: última lectura de la sonda de suelo, historial y diagnóstico IA (antes "PlantCare")
function MedicionesTerreno() {
  const [clientes, setClientes] = useState([])
  const [loadingClientes, setLoadingClientes] = useState(true)

  const [clienteSeleccionado, setClienteSeleccionado] = useState(null)
  const [terrenos, setTerrenos] = useState([])
  const [loadingTerrenos, setLoadingTerrenos] = useState(false)

  const [terrenoSeleccionado, setTerrenoSeleccionado] = useState(null)
  const [ultimaMedicion, setUltimaMedicion] = useState(null)
  const [historial, setHistorial] = useState([])
  const [loadingMediciones, setLoadingMediciones] = useState(false)

  const [variableHistorial, setVariableHistorial] = useState("nitrogeno")

  // Estado del panel de IA
  const [observaciones, setObservaciones] = useState("")
  const [recomendacion, setRecomendacion] = useState(null)
  const [loadingIA, setLoadingIA] = useState(false)
  const [errorIA, setErrorIA] = useState("")

  useEffect(() => {
    const cargarClientes = async () => {
      setLoadingClientes(true)
      const { data, error } = await supabase.from("clientes_plantcare").select("id, nombre").order("nombre")
      if (!error) setClientes(data || [])
      setLoadingClientes(false)
    }
    cargarClientes()
  }, [])

  useEffect(() => {
    if (!clienteSeleccionado) {
      setTerrenos([])
      setTerrenoSeleccionado(null)
      return
    }
    const cargarTerrenos = async () => {
      setLoadingTerrenos(true)
      setTerrenoSeleccionado(null)
      const { data, error } = await supabase
        .from("terrenos")
        .select("id, nombre, coordenadas_centro")
        .eq("cliente_id", clienteSeleccionado.id)
        .order("nombre")
      if (!error) setTerrenos(data || [])
      setLoadingTerrenos(false)
    }
    cargarTerrenos()
  }, [clienteSeleccionado])

  // Al cambiar de terreno, limpiar el diagnóstico anterior
  useEffect(() => {
    setRecomendacion(null)
    setErrorIA("")
    setObservaciones("")
  }, [terrenoSeleccionado])

  useEffect(() => {
    if (!terrenoSeleccionado) {
      setUltimaMedicion(null)
      setHistorial([])
      return
    }
    const cargarMediciones = async () => {
      setLoadingMediciones(true)

      const { data: ultima } = await supabase
        .from("mediciones")
        .select("*")
        .eq("terreno_id", terrenoSeleccionado.id)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle()
      setUltimaMedicion(ultima ?? null)

      const { data: serie } = await supabase
        .from("mediciones")
        .select(`created_at, ${variableHistorial}`)
        .eq("terreno_id", terrenoSeleccionado.id)
        .order("created_at", { ascending: true })
        .limit(20)

      setHistorial(
        (serie ?? []).map((m) => ({
          fecha: formatFecha(m.created_at),
          valor: m[variableHistorial],
        }))
      )

      setLoadingMediciones(false)
    }
    cargarMediciones()
  }, [terrenoSeleccionado, variableHistorial])

  const obtenerRecomendacion = async () => {
  if (!terrenoSeleccionado || !ultimaMedicion) return
  setLoadingIA(true)
  setErrorIA("")
  setRecomendacion(null)
  try {
    // 1) Se pasa el id del terreno (UUID), no la medición
    const resultado = await generarRecomendacion(terrenoSeleccionado.id, observaciones)

    // 2) generarRecomendacion devuelve { recomendacion, clima }:
    //    el panel solo necesita la parte de la recomendación
    setRecomendacion(resultado.recomendacion)
  } catch (err) {
    console.error(err)
    setErrorIA(err.message || "No se pudo generar la recomendación. Intenta nuevamente.")
  } finally {
    setLoadingIA(false)
  }
}

  const metricasConfig = [
    { titulo: "Nitrógeno (N)", campo: "nitrogeno", unidad: "kg/ha", Icono: Leaf },
    { titulo: "Fósforo (P)", campo: "fosforo", unidad: "kg/ha", Icono: FlaskConical },
    { titulo: "Potasio (K)", campo: "potasio", unidad: "kg/ha", Icono: Zap },
    { titulo: "pH", campo: "ph", unidad: "pH", Icono: TestTube },
    { titulo: "Humedad", campo: "humedad_suelo", unidad: "%", Icono: Droplets },
    { titulo: "Temperatura", campo: "temperatura_suelo", unidad: "°C", Icono: Thermometer },
    { titulo: "Conductividad", campo: "ec", unidad: "dS/m", Icono: Zap },
    { titulo: "Humedad Ambiente", campo: "humedad_ambiente", unidad: "%", Icono: Droplets },
    { titulo: "Temperatura Ambiente", campo: "temperatura_ambiente", unidad: "°C", Icono: Thermometer },
  ]

  return (
    <div>
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h2 className="text-lg font-bold text-slate-800">Suelo por terreno y recomendación IA</h2>

        <div className="flex flex-wrap gap-2">
          <SearchableSelect
            items={clientes}
            value={clienteSeleccionado}
            onChange={(cliente) => setClienteSeleccionado(cliente)}
            placeholder={loadingClientes ? "Cargando clientes..." : "Seleccionar cliente"}
            searchPlaceholder="Buscar cliente..."
            disabled={loadingClientes}
          />

          <SearchableSelect
            items={terrenos}
            value={terrenoSeleccionado}
            onChange={(terreno) => setTerrenoSeleccionado(terreno)}
            placeholder={!clienteSeleccionado ? "Elegí un cliente primero" : "Seleccionar Terreno"}
            searchPlaceholder="Buscar terreno..."
            disabled={!clienteSeleccionado || loadingTerrenos}
          />
        </div>
      </div>

      {!terrenoSeleccionado && (
        <div className="mb-6 rounded-2xl bg-amber-50 p-4 border border-amber-200/80 text-amber-800 text-sm shadow-sm flex items-center gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0" />
          <span>Selecciona un cliente y un terreno específico para consultar las mediciones en la base de datos.</span>
        </div>
      )}

      {terrenoSeleccionado && loadingMediciones && (
        <p className="text-gray-500 mb-4 text-sm font-medium">Consultando registros en Supabase...</p>
      )}

      {terrenoSeleccionado && !loadingMediciones && !ultimaMedicion && (
        <div className="mb-6 rounded-2xl bg-white p-6 border border-slate-200 text-slate-600 text-sm shadow-sm flex items-center justify-center gap-2.5">
          <Info className="w-5 h-5 text-emerald-700 shrink-0" />
          <span>Este terreno no cuenta con registros de mediciones en la base de datos actualmente.</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Columna Izquierda (2/3): Métricas, Gráfico y Mapa */}
        <div className="lg:col-span-2 flex flex-col gap-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {metricasConfig.map((m) => (
              <MetricaCard
                key={m.campo}
                titulo={m.titulo}
                campo={m.campo}
                unidad={m.unidad}
                Icono={m.Icono}
                valor={ultimaMedicion ? ultimaMedicion[m.campo] : null}
              />
            ))}
          </div>

          {/* Gráfico de Historial con Selector de Parámetro */}
          <div className="rounded-2xl bg-white p-6 shadow-sm border border-slate-200/60">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <h2 className="text-base font-bold text-slate-800">Historial de Mediciones</h2>

              <div className="w-full sm:w-64">
                <SearchableSelect
                  items={metricasConfig.map(m => ({ id: m.campo, nombre: m.titulo }))}
                  value={metricasConfig.find(m => m.campo === variableHistorial) ? { id: variableHistorial, nombre: metricasConfig.find(m => m.campo === variableHistorial).titulo } : null}
                  onChange={(item) => setVariableHistorial(item ? item.id : 'nitrogeno')}
                  placeholder="Seleccionar parámetro"
                  disabled={!terrenoSeleccionado}
                  showSearch={false}
                />
              </div>
            </div>

            {!terrenoSeleccionado && <p className="text-gray-500 text-sm">Seleccioná un cliente y un terreno para ver su historial.</p>}
            {terrenoSeleccionado && loadingMediciones && <p className="text-gray-500 text-sm">Cargando...</p>}
            {terrenoSeleccionado && !loadingMediciones && historial.length === 0 && (
              <p className="text-gray-500 text-sm">Este terreno todavía no tiene mediciones registradas.</p>
            )}
            {terrenoSeleccionado && !loadingMediciones && historial.length > 0 && (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={historial}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="fecha" stroke="#64748b" />
                  <YAxis stroke="#64748b" />
                  <Tooltip />
                  <Line type="monotone" dataKey="valor" stroke="#16a34a" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* Mapa de ubicación del terreno */}
          <MapaTerreno terreno={terrenoSeleccionado} />
        </div>

        {/* Columna Derecha Lateral (1/3): Control Operativo y Bitácora IA */}
        <div className="lg:col-span-1 flex flex-col gap-6">

          {/* Módulo de Trazabilidad y Visita a Terreno (HU-ADM-03) */}
          <div className="rounded-2xl bg-white p-5 shadow-sm border border-slate-200/60">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-100">
              <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                <User className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 text-sm">Control Operativo</h3>
                <p className="text-xs text-slate-500">Trazabilidad de Inspección</p>
              </div>
            </div>

            {!terrenoSeleccionado ? (
              <p className="text-xs text-slate-500 py-4 text-center">
                Selecciona un terreno para ver los datos de la visita técnica.
              </p>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium"><User className="w-3.5 h-3.5 text-slate-400" /> Técnico a cargo:</span>
                  {/* TODO: Vincular con columna tecnico_responsable en Supabase */}
                  <span className="font-semibold text-slate-700">Administrador / IoT</span>
                </div>

                <div className="flex items-center justify-between p-2.5 bg-slate-50 rounded-xl border border-slate-100">
                  <span className="text-slate-500 flex items-center gap-1.5 font-medium"><Clock className="w-3.5 h-3.5 text-slate-400" /> Sincronización:</span>
                  <span className="font-semibold text-slate-700">
                    {ultimaMedicion?.created_at ? new Date(ultimaMedicion.created_at).toLocaleDateString("es-CL") : "N/A"}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* Bloque de Observaciones y Generación de Diagnóstico IA */}
          <div className="flex flex-col gap-4 rounded-2xl bg-white p-5 shadow-sm border border-slate-200/60">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <FileText className="w-4 h-4 text-emerald-700" />
              <span>Bitácora de Observaciones Técnicas</span>
            </div>

            <Input
              type="text"
              placeholder="Ej. Aplicar riego nocturno adicional..."
              value={observaciones}
              onChange={(e) => setObservaciones(e.target.value)}
              className="h-10 rounded-xl border border-slate-200 bg-slate-50/50 p-3 text-xs"
            />

            <Button
              onClick={obtenerRecomendacion}
              disabled={!terrenoSeleccionado || !ultimaMedicion || loadingIA}
              className="bg-emerald-700 hover:bg-emerald-800 h-10 text-white font-medium rounded-xl transition-colors shadow-sm text-xs"
            >
              {loadingIA ? "Analizando terreno..." : "Generar recomendación IA"}
            </Button>

            {errorIA && <p className="text-red-600 text-xs font-medium">{errorIA}</p>}

            {/* Resultados del Diagnóstico IA */}
            {recomendacion && (
              <div className="mt-2 pt-3 border-t border-slate-100 space-y-3">
                <div>
                  <h3 className="mb-1 text-xs font-bold uppercase tracking-wider text-emerald-700">Diagnóstico IA</h3>
                  <p className="font-semibold text-sm text-slate-800">{recomendacion.estado_general}</p>
                </div>

                {recomendacion.alertas?.length > 0 && (
                  <div className="space-y-1.5 p-3 bg-red-50 rounded-xl border border-red-100">
                    {recomendacion.alertas.map((a, i) => (
                      <p key={i} className="text-red-700 text-xs font-medium flex gap-1.5">
                        <span>⚠</span> {a}
                      </p>
                    ))}
                  </div>
                )}

                {recomendacion.recomendaciones?.length > 0 && (
                  <div className="mt-2">
                    <h4 className="font-semibold mb-2 text-slate-800 text-xs">Plan de Acción:</h4>
                    <ul className="space-y-2">
                      {recomendacion.recomendaciones.map((r, i) => (
                        <li key={i} className="bg-slate-50 p-2.5 rounded-xl border border-slate-100 text-xs">
                          <div className="flex justify-between items-start mb-1">
                            <span className="font-bold text-slate-800">{r.accion}</span>
                            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-semibold ${
                              r.prioridad === 'alta' ? 'bg-red-100 text-red-700' :
                              r.prioridad === 'media' ? 'bg-yellow-100 text-yellow-700' : 'bg-emerald-100 text-emerald-700'
                            }`}>
                              {r.prioridad}
                            </span>
                          </div>
                          <p className="text-slate-600 text-[11px] mt-0.5">{r.motivo}</p>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

export default MedicionesTerreno