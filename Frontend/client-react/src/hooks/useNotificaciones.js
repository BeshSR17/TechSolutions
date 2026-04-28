// hooks/useNotificaciones.js
import { useEffect, useState, useCallback, useRef } from 'react'
import { supabase } from '../supabaseClient'
import { useToast } from '../components/shared/Toast'

export function useNotificaciones() {
  const [miId,           setMiId]    = useState(null)
  const [esAdmin,        setEsAdmin] = useState(false)  // ← estado real, no solo ref
  const [badgeMensajes,  setBadgeMensajes]  = useState(0)
  const [badgeConsultas, setBadgeConsultas] = useState(0)
  const toast = useToast()

  // ── 1. Obtener usuario y rol ───────────────────────────────────────────────
  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data?.user) return
      const id = data.user.id
      const { data: perfil } = await supabase
        .from('perfiles').select('rol').eq('id', id).single()
      const admin = perfil?.rol === 'Administrador' || perfil?.rol === 'Admin'
      setEsAdmin(admin)
      setMiId(id)  // ← miId se setea DESPUÉS de tener el rol
    })
  }, [])

  // ── 2. Conteos iniciales (cuando ya tenemos miId y esAdmin) ───────────────
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

  // ── 3. Canal mensajes ─────────────────────────────────────────────────────
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
      .subscribe((status) => {
        console.log('[notif-msg] estado canal:', status)
      })

    return () => supabase.removeChannel(canal)
  }, [miId]) // eslint-disable-line react-hooks/exhaustive-deps

  // ── 4. Canal consultas (solo admin, se monta cuando esAdmin es true) ───────
  useEffect(() => {
    if (!miId || !esAdmin) return  // ← solo corre si es admin confirmado

    console.log('[notif-consultas] suscribiendo canal para admin:', miId)

    const canal = supabase
      .channel(`notif-cons-${miId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'consultas',
      }, async (payload) => {
        console.log('[notif-consultas] nueva consulta recibida:', payload.new)
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
      .subscribe((status) => {
        console.log('[notif-consultas] estado canal:', status)
      })

    return () => supabase.removeChannel(canal)
  }, [miId, esAdmin]) // eslint-disable-line react-hooks/exhaustive-deps

  return {
    miId,
    esAdmin,
    badgeMensajes,
    badgeConsultas,
    limpiarBadgeMensajes:  useCallback(() => setBadgeMensajes(0),  []),
    limpiarBadgeConsultas: useCallback(() => setBadgeConsultas(0), []),
  }
}