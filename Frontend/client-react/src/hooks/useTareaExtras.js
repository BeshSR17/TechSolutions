// hooks/useTareaExtras.js
// Reemplaza el localStorage de comentarios y links por llamadas reales a la API

import { useState, useEffect } from 'react'
import { apiClient } from '../apiClient'

export function useTareaExtras(tareaId) {
  const [extras,   setExtras]   = useState({ comentarios: [], links: [] })
  const [cargando, setCargando] = useState(true)

  // ── Cargar extras al abrir la tarea ────────────────────────────────────────
  useEffect(() => {
    if (!tareaId) return
    cargar()
  }, [tareaId])

  const cargar = async () => {
    try {
      setCargando(true)
      const res = await apiClient(`/tareas/${tareaId}/extras`)
      if (res.ok) {
        const data = await res.json()
        // Separar por tipo
        setExtras({
          comentarios: data.filter(e => e.tipo === 'comentario'),
          links:       data.filter(e => e.tipo === 'link'),
        })
      }
    } catch (err) {
      console.error('Error cargando extras:', err)
    } finally {
      setCargando(false)
    }
  }

  // ── Agregar comentario ─────────────────────────────────────────────────────
  const agregarComentario = async (texto) => {
    const res = await apiClient(`/tareas/${tareaId}/extras`, {
      method: 'POST',
      body: JSON.stringify({ tipo: 'comentario', contenido: texto })
    })
    if (res.ok) await cargar()
    return res.ok
  }

  // ── Agregar link ───────────────────────────────────────────────────────────
  const agregarLink = async (url, nombre) => {
    const res = await apiClient(`/tareas/${tareaId}/extras`, {
      method: 'POST',
      body: JSON.stringify({ tipo: 'link', contenido: url, nombre: nombre || url })
    })
    if (res.ok) await cargar()
    return res.ok
  }

  // ── Eliminar extra ─────────────────────────────────────────────────────────
  const eliminarExtra = async (extraId) => {
    const res = await apiClient(`/tareas/extras/${extraId}`, { method: 'DELETE' })
    if (res.ok) await cargar()
    return res.ok
  }

  return {
    comentarios:      extras.comentarios,
    links:            extras.links,
    cargando,
    agregarComentario,
    agregarLink,
    eliminarExtra,
    recargar:         cargar,
  }
}