// hooks/useNotificaciones.js
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useToast } from '../components/shared/Toast'

export function useNotificaciones() {
  const [miId,           setMiId]    = useState(null)
  const [esAdmin,        setEsAdmin] = useState(false)
  const [badgeMensajes,  setBadgeMensajes]  = useState(0)
  const [badgeConsultas, setBadgeConsultas] = useState(0)
  const esAdminRef = useRef(false)
  const toast = useToast()

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

  // ── 2. Conteos iniciales ──────────────────────────────────────────────────
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

  // ── 3. Canal mensajes — maneja directos, consultas y notif nueva consulta ─
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
          // ── Mensaje directo normal ────────────────────────────────────────
          setBadgeMensajes(prev => prev + 1)
          toast.notif({
            tipo:   'mensaje',
            titulo: rem?.nombre || 'Nuevo mensaje',
            texto:  msg.contenido.length > 60
              ? msg.contenido.slice(0, 60) + '...'
              : msg.contenido,
          })
        } else {
          // ── Mensaje con consulta_id: puede ser notif de nueva consulta
          //    o mensaje dentro de una consulta activa ──────────────────────
          const { data: consulta } = await supabase
            .from('consultas')
            .select('estado, titulo, usuario_id')
            .eq('id', msg.consulta_id)
            .single()

          if (consulta?.estado === 'pendiente' && esAdminRef.current) {
            // Es el mensaje de notificación de consulta NUEVA (estado pendiente)
            setBadgeConsultas(prev => prev + 1)
            toast.notif({
              tipo:   'consulta_nueva',
              titulo: '🎫 Nueva consulta',
              texto:  `${rem?.nombre || 'Un usuario'}: ${consulta.titulo}`,
            })
          } else if (consulta?.estado === 'activa') {
            // Es un mensaje dentro de una consulta activa
            setBadgeConsultas(prev => prev + 1)
            toast.notif({
              tipo:   'consulta',
              titulo: consulta.titulo || 'Consulta',
              texto:  `${rem?.nombre || 'Alguien'}: ${
                msg.contenido.length > 50
                  ? msg.contenido.slice(0, 50) + '...'
                  : msg.contenido
              }`,
            })
          }
        }
      })
      .subscribe()

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