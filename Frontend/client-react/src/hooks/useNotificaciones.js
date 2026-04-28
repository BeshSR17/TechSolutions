// hooks/useNotificaciones.js
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useToast } from '../components/shared/Toast'

export function useNotificaciones() {
  const [miId,           setMiId]          = useState(null)
  const [badgeMensajes,  setBadgeMensajes] = useState(0)
  const [badgeConsultas, setBadgeConsultas]= useState(0)
  const esAdminRef = useRef(false)   // ← cache del rol, sin re-renders
  const toast = useToast()

  // ── Usuario + rol ─────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data?.user) return
      const id = data.user.id
      setMiId(id)
      const { data: perfil } = await supabase
        .from('perfiles').select('rol').eq('id', id).single()
      esAdminRef.current = perfil?.rol === 'Administrador' || perfil?.rol === 'Admin'
    })
  }, [])

  // ── Conteos iniciales ─────────────────────────────────────────────────────
  const cargarConteos = useCallback(async () => {
    if (!miId) return

    const { count: cMsg } = await supabase
      .from('mensajes')
      .select('id', { count: 'exact', head: true })
      .is('consulta_id', null)
      .eq('destinatario_id', miId)
      .or('leido.eq.false,leido.is.null')
    setBadgeMensajes(cMsg || 0)

    if (esAdminRef.current) {
      const { count: cC } = await supabase
        .from('consultas')
        .select('id', { count: 'exact', head: true })
        .eq('estado', 'pendiente')
      setBadgeConsultas(cC || 0)
    } else {
      const { count: cC } = await supabase
        .from('mensajes')
        .select('id', { count: 'exact', head: true })
        .not('consulta_id', 'is', null)
        .eq('destinatario_id', miId)
        .or('leido.eq.false,leido.is.null')
      setBadgeConsultas(cC || 0)
    }
  }, [miId])

  useEffect(() => { if (miId) cargarConteos() }, [miId, cargarConteos])

  // ── Realtime ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!miId) return

    const canalMensajes = supabase
      .channel(`notif-mensajes-${miId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'mensajes',
        filter: `destinatario_id=eq.${miId}`,
      }, async (payload) => {
        const msg = payload.new
        const { data: rem } = await supabase
          .from('perfiles').select('nombre').eq('id', msg.remitente_id).single()

        if (!msg.consulta_id) {
          setBadgeMensajes(prev => prev + 1)
          toast.notif({
            tipo:   'mensaje',
            titulo: rem?.nombre || 'Nuevo mensaje',
            texto:  msg.contenido.length > 60
              ? msg.contenido.slice(0, 60) + '...'
              : msg.contenido,
          })
        } else {
          setBadgeConsultas(prev => prev + 1)
          const { data: cons } = await supabase
            .from('consultas').select('titulo').eq('id', msg.consulta_id).single()
          toast.notif({
            tipo:   'consulta',
            titulo: cons?.titulo || 'Consulta',
            texto:  `${rem?.nombre || 'Alguien'}: ${
              msg.contenido.length > 50
                ? msg.contenido.slice(0, 50) + '...'
                : msg.contenido
            }`,
          })
        }
      })
      .subscribe()

    // ── Canal consultas nuevas ────────────────────────────────────────────
    // Solo se suscribe si es admin (el ref ya está resuelto para este punto)
    // Usamos un pequeño delay para asegurar que esAdminRef esté listo
    let canalConsultas = null

    const suscribirConsultas = () => {
      if (!esAdminRef.current) return  // usuario normal, no necesita este canal

      canalConsultas = supabase
        .channel(`notif-consultas-${miId}`)
        .on('postgres_changes', {
          event: 'INSERT', schema: 'public', table: 'consultas',
        }, async (payload) => {
          if (!esAdminRef.current) return  // doble check
          const consulta = payload.new
          setBadgeConsultas(prev => prev + 1)
          const { data: usr } = await supabase
            .from('perfiles').select('nombre').eq('id', consulta.usuario_id).single()
          toast.notif({
            tipo:   'consulta_nueva',
            titulo: '🎫 Nueva consulta',
            texto:  `${usr?.nombre || 'Un usuario'}: ${consulta.titulo}`,
          })
        })
        .subscribe()
    }

    // Pequeño delay para que esAdminRef.current esté resuelto
    const timer = setTimeout(suscribirConsultas, 500)

    return () => {
      clearTimeout(timer)
      supabase.removeChannel(canalMensajes)
      if (canalConsultas) supabase.removeChannel(canalConsultas)
    }
  }, [miId]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    miId,
    badgeMensajes,
    badgeConsultas,
    limpiarBadgeMensajes:  useCallback(() => setBadgeMensajes(0),  []),
    limpiarBadgeConsultas: useCallback(() => setBadgeConsultas(0), []),
  }
}