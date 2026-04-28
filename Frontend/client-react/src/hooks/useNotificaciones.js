// hooks/useNotificaciones.js
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useToast } from '../components/shared/Toast'

export function useNotificaciones() {
  const [miId,           setMiId]    = useState(null)
  const [esAdmin,        setEsAdmin] = useState(false)
  const [badgeMensajes,  setBadgeMensajes]  = useState(0)
  const [badgeConsultas, setBadgeConsultas] = useState(0)
  const esAdminRef = useRef(false)  // ref para acceso inmediato dentro de callbacks
  const toast = useToast()

  // necesitamos useRef
  // agrega: import { useEffect, useState, useCallback, useRef } from 'react'

  // ── 1. Usuario y rol ──────────────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data?.user) return
      const id = data.user.id
      const { data: perfil } = await supabase
        .from('perfiles').select('rol').eq('id', id).single()
      const admin = perfil?.rol === 'Administrador' || perfil?.rol === 'Admin'
      esAdminRef.current = admin
      setEsAdmin(admin)
      setMiId(id)
    })
  }, [])

  // ── 2. Conteos iniciales ───────────────────────────────────────────────────
  useEffect(() => {
    if (!miId) return
    const cargar = async () => {
      const { count: cMsg } = await supabase
        .from('mensajes')
        .select('id', { count: 'exact', head: true })
        .is('consulta_id', null)
        .eq('destinatario_id', miId)
        .or('leido.eq.false,leido.is.null')
      setBadgeMensajes(cMsg || 0)

      if (esAdmin) {
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
    }
    cargar()
  }, [miId, esAdmin])

  // ── 3. Canal mensajes directos ────────────────────────────────────────────
  useEffect(() => {
    if (!miId) return
    const canal = supabase
      .channel(`notif-msg-${miId}`)
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

    return () => supabase.removeChannel(canal)
  }, [miId]) // eslint-disable-line

  useEffect(() => {
    if (!miId) return

    // Nombre fijo para receiver, distinto al sender
    const canal = supabase
      .channel('consultas-broadcast-receiver')  // ← nombre diferente al sender
      .on('broadcast', { event: 'nueva_consulta' }, async ({ payload }) => {
        if (!esAdminRef.current) return
        console.log('[broadcast] nueva consulta recibida:', payload)
        setBadgeConsultas(prev => prev + 1)
        const { data: usr } = await supabase
          .from('perfiles').select('nombre').eq('id', payload.usuario_id).single()
        toast.notif({
          tipo:   'consulta_nueva',
          titulo: '🎫 Nueva consulta',
          texto:  `${usr?.nombre || 'Un usuario'}: ${payload.titulo}`,
        })
      })
      .subscribe(status => console.log('[broadcast receiver] estado:', status))

    return () => supabase.removeChannel(canal)
  }, [miId]) // eslint-disable-line

  return {
    miId,
    esAdmin,
    badgeMensajes,
    badgeConsultas,
    limpiarBadgeMensajes:  useCallback(() => setBadgeMensajes(0),  []),
    limpiarBadgeConsultas: useCallback(() => setBadgeConsultas(0), []),
  }
}