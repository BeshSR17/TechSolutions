// hooks/useNotificaciones.js
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../supabaseClient'

export function useNotificaciones() {
  const [miId,            setMiId]            = useState(null)
  const [badgeMensajes,   setBadgeMensajes]    = useState(0)
  const [badgeConsultas,  setBadgeConsultas]   = useState(0)
  const [toasts,          setToasts]           = useState([])
  const canalRef = useRef(null)

  // ── Obtener usuario ───────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setMiId(data.user.id)
    })
  }, [])

  // ── Mostrar toast ─────────────────────────────────────────────────────────
  const mostrarToast = useCallback((toast) => {
    const id = Date.now()
    setToasts(prev => [...prev, { ...toast, id }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, 4500)
  }, [])

  const cerrarToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  // ── Cargar conteos iniciales de no leídos ─────────────────────────────────
  const cargarConteos = useCallback(async () => {
    if (!miId) return

    // Mensajes directos no leídos (sin consulta_id)
    const { count: cMsg } = await supabase
      .from('mensajes')
      .select('id', { count: 'exact', head: true })
      .is('consulta_id', null)
      .eq('destinatario_id', miId)
      .or('leido.eq.false,leido.is.null')

    setBadgeMensajes(cMsg || 0)

    // Consultas pendientes (admin) o con mensajes no leídos (usuario)
    const { data: perfil } = await supabase
      .from('perfiles').select('rol').eq('id', miId).single()

    const esAdmin = perfil?.rol === 'Administrador' || perfil?.rol === 'Admin'

    if (esAdmin) {
      const { count: cConsultas } = await supabase
        .from('consultas')
        .select('id', { count: 'exact', head: true })
        .eq('estado', 'pendiente')
      setBadgeConsultas(cConsultas || 0)
    } else {
      // Mensajes no leídos dentro de consultas activas del usuario
      const { count: cConsultas } = await supabase
        .from('mensajes')
        .select('id', { count: 'exact', head: true })
        .not('consulta_id', 'is', null)
        .eq('destinatario_id', miId)
        .or('leido.eq.false,leido.is.null')
      setBadgeConsultas(cConsultas || 0)
    }
  }, [miId])

  useEffect(() => {
    if (miId) cargarConteos()
  }, [miId, cargarConteos])

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!miId) return

    // Canal mensajes nuevos dirigidos a mí
    const canalMensajes = supabase
      .channel(`notif-mensajes-${miId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'mensajes',
        filter: `destinatario_id=eq.${miId}`,
      }, async (payload) => {
        const msg = payload.new

        if (!msg.consulta_id) {
          // Mensaje directo
          setBadgeMensajes(prev => prev + 1)
          // Obtener nombre del remitente para el toast
          const { data: remitente } = await supabase
            .from('perfiles').select('nombre, avatar_url').eq('id', msg.remitente_id).single()
          mostrarToast({
            tipo: 'mensaje',
            titulo: remitente?.nombre || 'Nuevo mensaje',
            texto: msg.contenido.length > 60
              ? msg.contenido.slice(0, 60) + '...'
              : msg.contenido,
            avatar: remitente?.avatar_url,
            nombre: remitente?.nombre,
          })
        } else {
          // Mensaje dentro de consulta
          setBadgeConsultas(prev => prev + 1)
          const { data: remitente } = await supabase
            .from('perfiles').select('nombre, avatar_url').eq('id', msg.remitente_id).single()
          const { data: consulta } = await supabase
            .from('consultas').select('titulo').eq('id', msg.consulta_id).single()
          mostrarToast({
            tipo: 'consulta',
            titulo: consulta?.titulo || 'Consulta',
            texto: `${remitente?.nombre || 'Alguien'}: ${msg.contenido.length > 50 ? msg.contenido.slice(0, 50) + '...' : msg.contenido}`,
            avatar: remitente?.avatar_url,
            nombre: remitente?.nombre,
          })
        }
      })
      .subscribe()

    // Canal consultas nuevas (solo admin)
    const canalConsultas = supabase
      .channel(`notif-consultas-${miId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'consultas',
      }, async (payload) => {
        const consulta = payload.new
        // Verificar si soy admin antes de notificar
        const { data: perfil } = await supabase
          .from('perfiles').select('rol').eq('id', miId).single()
        const esAdmin = perfil?.rol === 'Administrador' || perfil?.rol === 'Admin'
        if (!esAdmin) return

        setBadgeConsultas(prev => prev + 1)
        const { data: usuario } = await supabase
          .from('perfiles').select('nombre, avatar_url').eq('id', consulta.usuario_id).single()
        mostrarToast({
          tipo: 'consulta_nueva',
          titulo: '🎫 Nueva consulta',
          texto: `${usuario?.nombre || 'Un usuario'}: ${consulta.titulo}`,
          avatar: usuario?.avatar_url,
          nombre: usuario?.nombre,
        })
      })
      .subscribe()

    canalRef.current = { canalMensajes, canalConsultas }

    return () => {
      supabase.removeChannel(canalMensajes)
      supabase.removeChannel(canalConsultas)
    }
  }, [miId, mostrarToast])

  const limpiarBadgeMensajes  = useCallback(() => setBadgeMensajes(0),  [])
  const limpiarBadgeConsultas = useCallback(() => setBadgeConsultas(0), [])

  return {
    badgeMensajes,
    badgeConsultas,
    toasts,
    cerrarToast,
    limpiarBadgeMensajes,
    limpiarBadgeConsultas,
    miId,
  }
}