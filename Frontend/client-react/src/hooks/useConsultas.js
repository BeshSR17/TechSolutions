// hooks/useConsultas.js
import { useEffect, useState, useCallback } from 'react'
import { supabase } from '../supabaseClient'

// ── Hook para mensajes dentro de una consulta específica ─────────────────────
export function useChatConsulta(consultaId, otroUsuarioId) {
  const [mensajes, setMensajes] = useState([])
  const [miId,     setMiId]     = useState(null)
  const [cargando, setCargando] = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (data?.user) setMiId(data.user.id)
    })
  }, [])

  useEffect(() => {
    if (!miId || !consultaId) return

    const cargar = async () => {
      setCargando(true)
      const { data } = await supabase
        .from('mensajes')
        .select('*')
        .eq('consulta_id', consultaId)
        .order('creado_en', { ascending: true })
      setMensajes(data || [])
      setCargando(false)

      // Marcar como leídos
      await supabase
        .from('mensajes')
        .update({ leido: true })
        .eq('consulta_id', consultaId)
        .eq('destinatario_id', miId)
        .or('leido.eq.false,leido.is.null')
    }
    cargar()

    const canal = supabase
      .channel(`consulta-web-${consultaId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'mensajes',
        filter: `consulta_id=eq.${consultaId}`,
      }, (payload) => {
        if (payload.new.remitente_id !== miId) {
          setMensajes(prev => [...prev, payload.new])
          supabase.from('mensajes').update({ leido: true }).eq('id', payload.new.id)
        }
      })
      .subscribe()

    return () => supabase.removeChannel(canal)
  }, [miId, consultaId])

  const enviarMensaje = async (contenido, destinatarioId) => {
    if (!contenido.trim() || !miId || !consultaId) return
    const msg = {
      remitente_id:    miId,
      destinatario_id: destinatarioId,
      contenido:       contenido.trim(),
      consulta_id:     consultaId,
      creado_en:       new Date().toISOString(),
    }
    setMensajes(prev => [...prev, { ...msg, _optimista: true, id: `tmp-${Date.now()}` }])
    const { data } = await supabase.from('mensajes').insert(msg).select().single()
    if (data) {
      setMensajes(prev => prev.map(m => m._optimista && m.contenido === contenido ? data : m))
    }
  }

  return { mensajes, enviarMensaje, miId, cargando }
}

// ── Hook principal de consultas ───────────────────────────────────────────────
export function useConsultas() {
  const [consultas,  setConsultas]  = useState([])
  const [miId,       setMiId]       = useState(null)
  const [miRol,      setMiRol]      = useState(null)
  const [cargando,   setCargando]   = useState(true)

  useEffect(() => {
    supabase.auth.getUser().then(async ({ data }) => {
      if (!data?.user) return
      setMiId(data.user.id)
      const { data: perfil } = await supabase
        .from('perfiles').select('rol').eq('id', data.user.id).single()
      setMiRol(perfil?.rol || 'Usuario')
    })
  }, [])

  const esAdmin = miRol === 'Administrador' || miRol === 'Admin'

  const cargar = useCallback(async () => {
    if (!miId) return
    setCargando(true)
    let query = supabase.from('consultas').select('*').order('creado_en', { ascending: false })
    if (!esAdmin) query = query.eq('usuario_id', miId)
    const { data } = await query
    setConsultas(data || [])
    setCargando(false)
  }, [miId, esAdmin])

  useEffect(() => { if (miId) cargar() }, [miId, cargar])

  // Realtime — cambios en consultas
  useEffect(() => {
    if (!miId) return
    const canal = supabase
      .channel(`consultas-web-${miId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'consultas' },
        () => cargar())
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [miId, cargar])

  const crearConsulta = async ({ titulo, mensaje_inicial }) => {
    if (!miId) return { error: 'No autenticado' }
    const { data, error } = await supabase
      .from('consultas')
      .insert({ usuario_id: miId, titulo, mensaje_inicial })
      .select().single()
    if (!error) cargar()
    return { data, error }
  }

  const aceptarConsulta = async (consultaId) => {
    // Verificar que siga pendiente
    const { data: fresh } = await supabase
      .from('consultas').select('estado').eq('id', consultaId).single()
    if (fresh?.estado !== 'pendiente') return { error: 'Ya fue tomada por otro administrador' }
    const { data, error } = await supabase
      .from('consultas')
      .update({ estado: 'activa', admin_asignado_id: miId })
      .eq('id', consultaId)
      .select().single()
    if (!error) cargar()
    return { data, error }
  }

  const cerrarConsulta = async (consultaId) => {
    const { error } = await supabase
      .from('consultas')
      .update({ estado: 'cerrada', cerrado_en: new Date().toISOString() })
      .eq('id', consultaId)
    if (!error) cargar()
    return { error }
  }

  return { consultas, miId, miRol, esAdmin, cargando, cargar, crearConsulta, aceptarConsulta, cerrarConsulta }
}