import { useState } from "react"
import { Pencil, Trash2, Plus } from "lucide-react"
import { maquinas as api } from "../services/maquinaria"
import useCarga from "../lib/useCarga"
import { clp } from "../lib/formato"
import EstadoCarga from "../components/EstadoCarga"
import ModalLecheria, { Campo } from "../components/ModalLecheria"
import s, { AZUL, ESTADO_MAQUINA } from "./EstilosMaquinaria"


export default function VistaMaquinaria() {
  const { datos: maquinas, cargando, error, setError, recargar } = useCarga(api.listar, [])
    const campo = (k, v) => setModal((m) => ({ ...m, [k]: v }))


  const eliminar = async (m) => {
    if (!window.confirm(`¿Eliminar ${m.nombre} ${m.modelo}? También se borrarán sus mantenciones.`)) return
    try { await api.eliminar(m.id); await recargar() } catch (e) { setError(e.message) }
  }

  return (
    <div style={s.container}>
      <div style={s.topBar}>
        <div>
          <h2 style={s.title}>Maquinaria</h2>
          <p style={s.sub}>{maquinas.length} equipos registrados</p>
        </div>
      </div>

      <EstadoCarga cargando={cargando} error={error} onReintentar={recargar} />

      {!cargando && !error && (
        <div style={s.tableCard}>
          <table style={s.table}>
            <thead>
              <tr>{["Nombre / Modelo", "Tipo", "Estado", "Tarifa neta", "Notas", ""].map((h) => <th key={h} style={s.th}>{h}</th>)}</tr>
            </thead>
            <tbody>
              {maquinas.map((m, i) => (
                <tr key={m.id} style={{ backgroundColor: i % 2 === 0 ? "#F8FAFC" : "#fff" }}>
                  <td style={s.td}>
                    <span style={s.nombre}>{m.nombre}</span>
                    <span style={s.rutTxt}>{m.modelo}</span>
                  </td>
                  <td style={s.td}>{m.tipo}</td>
                  <td style={s.td}><span style={{ ...s.badge, ...ESTADO_MAQUINA[m.estado] }}>{m.estado}</span></td>
                  <td style={s.td}>{clp(m.precio)} <span style={{ color: "#94A3B8" }}>/ {m.unidad_cobro}</span></td>
                  <td style={{ ...s.td, color: "#94A3B8" }}>{m.notas || "—"}</td>
                  <td style={s.td}>
                  </td>
                </tr>
              ))}
              {maquinas.length === 0 && <tr><td colSpan={6} style={s.vacio}>Aún no hay equipos registrados.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

    </div>
  )
}