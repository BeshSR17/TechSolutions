// hooks/useChat.js
import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'

export function useChat(otroUsuarioId) {
  const [mensajes, setMensajes] = useState([])
  const [miId, setMiId] = useState(null)
  const [cargando, setCargando] = useState(true)

  // Obtener usuario actual
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setMiId(data.user.id)
    })
  }, [])

  useEffect(() => {
    if (!miId || !otroUsuarioId) return

    // Cargar historial
    const cargarMensajes = async () => {
      setCargando(true)
      const { data } = await supabase
        .from('mensajes')
        .select('*')
        .or(
          `and(remitente_id.eq.${miId},destinatario_id.eq.${otroUsuarioId}),` +
          `and(remitente_id.eq.${otroUsuarioId},destinatario_id.eq.${miId})`
        )
        .order('creado_en', { ascending: true })

      setMensajes(data || [])
      setCargando(false)
    }

    cargarMensajes()

    // -----------Realtime —-------------------
    const canal = supabase
      .channel(`chat-${[miId, otroUsuarioId].sort().join('-')}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'mensajes',
        filter: `destinatario_id=eq.${miId}`
      }, (payload) => {
        // Solo agrega si viene del otro usuario en esta conversación
        if (payload.new.remitente_id === otroUsuarioId) {
          setMensajes(prev => [...prev, payload.new])
        }
      })
      .subscribe()

    return () => supabase.removeChannel(canal)
  }, [miId, otroUsuarioId])

  const enviarMensaje = async (contenido) => {
    if (!contenido.trim() || !miId || !otroUsuarioId) return

    const nuevoMensaje = {
      remitente_id: miId,
      destinatario_id: otroUsuarioId,
      contenido: contenido.trim(),
      creado_en: new Date().toISOString()
    }

    setMensajes(prev => [...prev, nuevoMensaje])

    await supabase.from('mensajes').insert(nuevoMensaje)
  }

  return { mensajes, enviarMensaje, miId, cargando }
}