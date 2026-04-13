// components/shared/MensajesSection.jsx
import { useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from '../../supabaseClient'

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatHora = (f) =>
  f ? new Date(f).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : ''

const formatFechaCorta = (f) => {
  if (!f) return ''
  const d    = new Date(f)
  const hoy  = new Date()
  const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1)
  if (d.toDateString() === hoy.toDateString())  return formatHora(f)
  if (d.toDateString() === ayer.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

// ── Avatar ────────────────────────────────────────────────────────────────────
const Avatar = ({ url, nombre, size = 40 }) => (
  <div className="ms-avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
    {url
      ? <img src={url} alt={nombre} onError={e => { e.target.style.display = 'none' }} />
      : nombre?.charAt(0).toUpperCase() || '?'
    }
  </div>
)

// ── Lista de conversaciones ───────────────────────────────────────────────────
function ListaConversaciones({ miId, esAdmin, perfiles, onSeleccionar, contactoActivo, onNuevoChat }) {
  const [busqueda,  setBusqueda]  = useState('')
  const [ultimoMsg, setUltimoMsg] = useState({})
  const [noLeidos,  setNoLeidos]  = useState({})
  const [contactos, setContactos] = useState([])
  const [loading,   setLoading]   = useState(true)

  const cargarContactos = useCallback(async () => {
    if (!miId) return
    setLoading(true)
    if (esAdmin) {
      setContactos(perfiles.filter(p => p.id !== miId))
    } else {
      const { data: msgs } = await supabase
        .from('mensajes')
        .select('remitente_id, destinatario_id')
        .is('consulta_id', null)
        .or(`remitente_id.eq.${miId},destinatario_id.eq.${miId}`)

      const ids = new Set()
      ;(msgs || []).forEach(m => {
        if (m.remitente_id    !== miId) ids.add(m.remitente_id)
        if (m.destinatario_id !== miId) ids.add(m.destinatario_id)
      })
      setContactos(perfiles.filter(p => ids.has(p.id) && p.id !== miId))
    }
    setLoading(false)
  }, [miId, esAdmin, perfiles])

  useEffect(() => { cargarContactos() }, [cargarContactos])

  useEffect(() => {
    if (!miId || contactos.length === 0) return
    const cargar = async () => {
      const um = {}, nl = {}
      await Promise.all(contactos.map(async (c) => {
        const { data } = await supabase
          .from('mensajes')
          .select('contenido, creado_en, remitente_id')
          .is('consulta_id', null)
          .or(
            `and(remitente_id.eq.${miId},destinatario_id.eq.${c.id}),` +
            `and(remitente_id.eq.${c.id},destinatario_id.eq.${miId})`
          )
          .order('creado_en', { ascending: false })
          .limit(1)
        if (data?.[0]) um[c.id] = data[0]

        const { count } = await supabase
          .from('mensajes')
          .select('id', { count: 'exact', head: true })
          .is('consulta_id', null)
          .eq('remitente_id', c.id)
          .eq('destinatario_id', miId)
          .or('leido.eq.false,leido.is.null')
        if (count) nl[c.id] = count
      }))
      setUltimoMsg(um)
      setNoLeidos(nl)
    }
    cargar()
  }, [miId, contactos])

  // Realtime lista
  useEffect(() => {
    if (!miId) return
    const canal = supabase
      .channel(`ms-lista-${miId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'mensajes',
        filter: `destinatario_id=eq.${miId}`,
      }, (payload) => {
        if (!payload.new.consulta_id) {
          const rid = payload.new.remitente_id
          setUltimoMsg(prev => ({ ...prev, [rid]: payload.new }))
          if (contactoActivo?.id !== rid) {
            setNoLeidos(prev => ({ ...prev, [rid]: (prev[rid] || 0) + 1 }))
          }
          if (!contactos.find(c => c.id === rid)) cargarContactos()
        }
      })
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [miId, contactoActivo, contactos, cargarContactos])

  const ordenados = [...contactos].sort((a, b) => {
    const tA = ultimoMsg[a.id]?.creado_en || ''
    const tB = ultimoMsg[b.id]?.creado_en || ''
    return tB.localeCompare(tA)
  })

  const filtrados = ordenados.filter(c =>
    c.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
    c.email?.toLowerCase().includes(busqueda.toLowerCase())
  )

  return (
    <div className="ms-sidebar">
      <div className="ms-sidebar-header">
        <span className="ms-sidebar-title">Mensajes</span>
        {esAdmin && (
          <button className="ms-nuevo-btn" onClick={onNuevoChat} title="Nuevo chat">✏️</button>
        )}
      </div>

      <div className="ms-search-wrap">
        <input
          className="ms-search"
          type="text"
          placeholder="Buscar conversación..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />
      </div>

      <div className="ms-lista">
        {loading ? (
          <div className="ms-empty">
            <div className="ms-dots"><span /><span /><span /></div>
          </div>
        ) : filtrados.length === 0 ? (
          <div className="ms-empty">
            <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
            <span>
              {busqueda
                ? 'Sin resultados'
                : esAdmin
                  ? 'Sin conversaciones aún'
                  : 'Aún no tienes mensajes directos'
              }
            </span>
          </div>
        ) : filtrados.map(c => {
          const ultimo = ultimoMsg[c.id]
          const count  = noLeidos[c.id] || 0
          const activo = contactoActivo?.id === c.id
          return (
            <div
              key={c.id}
              className={`ms-conv-item ${activo ? 'activo' : ''}`}
              onClick={() => {
                setNoLeidos(prev => ({ ...prev, [c.id]: 0 }))
                onSeleccionar(c)
              }}
            >
              <div className="ms-conv-avatar-wrap">
                <Avatar url={c.avatar_url} nombre={c.nombre} size={46} />
                <div className={`ms-online-dot ${c.estado === 'Activo' ? 'online' : 'offline'}`} />
              </div>
              <div className="ms-conv-info">
                <div className="ms-conv-top">
                  <span className="ms-conv-nombre">{c.nombre || 'Sin nombre'}</span>
                  {ultimo && <span className="ms-conv-hora">{formatFechaCorta(ultimo.creado_en)}</span>}
                </div>
                <div className="ms-conv-bottom">
                  <span className={`ms-conv-preview ${count > 0 ? 'bold' : ''}`}>
                    {ultimo
                      ? (ultimo.remitente_id === miId ? 'Tú: ' : '') + ultimo.contenido
                      : <em>Sin mensajes aún</em>
                    }
                  </span>
                  {count > 0 && <span className="ms-badge">{count > 99 ? '99+' : count}</span>}
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

// ── Chat abierto ──────────────────────────────────────────────────────────────
function ChatAbierto({ miId, contacto, onCerrar }) {
  const [mensajes, setMensajes] = useState([])
  const [texto,    setTexto]    = useState('')
  const [cargando, setCargando] = useState(true)
  const [enviando, setEnviando] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!miId || !contacto?.id) return
    const cargar = async () => {
      setCargando(true)
      const { data } = await supabase
        .from('mensajes')
        .select('*')
        .is('consulta_id', null)
        .or(
          `and(remitente_id.eq.${miId},destinatario_id.eq.${contacto.id}),` +
          `and(remitente_id.eq.${contacto.id},destinatario_id.eq.${miId})`
        )
        .order('creado_en', { ascending: true })
      setMensajes(data || [])
      setCargando(false)

      await supabase
        .from('mensajes')
        .update({ leido: true })
        .is('consulta_id', null)
        .eq('remitente_id', contacto.id)
        .eq('destinatario_id', miId)
        .or('leido.eq.false,leido.is.null')
    }
    cargar()
  }, [miId, contacto?.id])

  useEffect(() => {
    if (!miId || !contacto?.id) return
    const canal = supabase
      .channel(`ms-chat-${[miId, contacto.id].sort().join('-')}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'mensajes',
        filter: `destinatario_id=eq.${miId}`,
      }, (payload) => {
        const msg = payload.new
        if (msg.remitente_id === contacto.id && !msg.consulta_id) {
          setMensajes(prev => [...prev, msg])
          supabase.from('mensajes').update({ leido: true }).eq('id', msg.id)
        }
      })
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [miId, contacto?.id])

  useEffect(() => {
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 80)
  }, [mensajes])

  const handleEnviar = async () => {
    if (!texto.trim() || enviando) return
    const contenido = texto.trim()
    setTexto('')
    setEnviando(true)
    const optimista = {
      id: `tmp-${Date.now()}`,
      remitente_id: miId,
      destinatario_id: contacto.id,
      contenido,
      creado_en: new Date().toISOString(),
      _optimista: true,
    }
    setMensajes(prev => [...prev, optimista])
    const { data } = await supabase
      .from('mensajes')
      .insert({ remitente_id: miId, destinatario_id: contacto.id, contenido, consulta_id: null })
      .select().single()
    setMensajes(prev => prev.map(m => m.id === optimista.id ? (data || m) : m))
    setEnviando(false)
  }

  const handleKey = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnviar() }
  }

  // Agrupar por fecha
  const items = []
  let fechaActual = null
  mensajes.forEach(msg => {
    const f = new Date(msg.creado_en).toDateString()
    if (f !== fechaActual) {
      fechaActual = f
      items.push({ type: 'fecha', id: `f-${f}`, fecha: msg.creado_en })
    }
    items.push({ type: 'msg', ...msg })
  })

  return (
    <div className="ms-chat">
      <div className="ms-chat-header">
        <button className="ms-chat-back" onClick={onCerrar}>←</button>
        <Avatar url={contacto.avatar_url} nombre={contacto.nombre} size={38} />
        <div className="ms-chat-header-info">
          <span className="ms-chat-nombre">{contacto.nombre || 'Sin nombre'}</span>
          <span className={`ms-chat-estado ${contacto.estado === 'Activo' ? 'online' : ''}`}>
            {contacto.estado === 'Activo' ? '● En línea' : '○ Desconectado'}
          </span>
        </div>
        {contacto.rol && (
          <span className="ms-chat-rol-badge">
            {contacto.rol === 'Administrador' || contacto.rol === 'Admin' ? '👑 Admin' : '👤 Colaborador'}
          </span>
        )}
      </div>

      <div className="ms-mensajes">
        {cargando && <div className="ms-empty"><div className="ms-dots"><span /><span /><span /></div></div>}

        {!cargando && items.map((item, i) => {
          if (item.type === 'fecha') {
            const hoy  = new Date().toDateString()
            const ayer = new Date(Date.now() - 86400000).toDateString()
            const d    = new Date(item.fecha).toDateString()
            const label = d === hoy ? 'Hoy' : d === ayer ? 'Ayer'
              : new Date(item.fecha).toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })
            return (
              <div key={item.id} className="ms-fecha-divider"><span>{label}</span></div>
            )
          }
          const esPropio = item.remitente_id === miId
          return (
            <div key={item.id || i} className={`ms-msg ${esPropio ? 'propio' : 'ajeno'}`}>
              {!esPropio && <Avatar url={contacto.avatar_url} nombre={contacto.nombre} size={28} />}
              <div className={`ms-burbuja ${esPropio ? 'propia' : 'ajena'} ${item._optimista ? 'optimista' : ''}`}>
                <span className="ms-burbuja-texto">{item.contenido}</span>
                <span className="ms-burbuja-meta">
                  {formatHora(item.creado_en)}
                  {esPropio && <span className="ms-tick">{item._optimista ? ' 🕐' : ' ✓✓'}</span>}
                </span>
              </div>
            </div>
          )
        })}

        {!cargando && mensajes.length === 0 && (
          <div className="ms-empty">
            <div style={{ fontSize: 44, marginBottom: 8 }}>👋</div>
            <span>¡Inicia la conversación con {contacto.nombre}!</span>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      <div className="ms-input-wrap">
        <textarea
          className="ms-input"
          rows={1}
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={handleKey}
          placeholder="Escribe un mensaje..."
        />
        <button
          className="ms-send-btn"
          onClick={handleEnviar}
          disabled={!texto.trim() || enviando}
        >
          <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
        </button>
      </div>
    </div>
  )
}

// ── Placeholder ───────────────────────────────────────────────────────────────
function ChatPlaceholder() {
  return (
    <div className="ms-chat ms-placeholder">
      <div style={{ fontSize: 56, marginBottom: 16, opacity: 0.3 }}>💬</div>
      <p className="ms-placeholder-text">Selecciona una conversación para comenzar</p>
    </div>
  )
}

// ── Modal nuevo chat ──────────────────────────────────────────────────────────
function SelectorNuevoChat({ perfiles, miId, onSeleccionar, onCerrar }) {
  const [busqueda, setBusqueda] = useState('')
  const filtrados = perfiles
    .filter(p => p.id !== miId)
    .filter(p =>
      p.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      p.email?.toLowerCase().includes(busqueda.toLowerCase())
    )

  return (
    <div className="ms-modal-overlay" onClick={onCerrar}>
      <div className="ms-modal" onClick={e => e.stopPropagation()}>
        <div className="ms-modal-header">
          <span>Nuevo mensaje</span>
          <button className="ms-modal-close" onClick={onCerrar}>✕</button>
        </div>
        <input
          className="ms-search"
          style={{ margin: '12px 16px', width: 'calc(100% - 32px)' }}
          type="text"
          placeholder="Buscar persona..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          autoFocus
        />
        <div className="ms-modal-lista">
          {filtrados.map(p => (
            <div key={p.id} className="ms-conv-item" style={{ cursor: 'pointer' }}
              onClick={() => onSeleccionar(p)}>
              <Avatar url={p.avatar_url} nombre={p.nombre} size={40} />
              <div className="ms-conv-info">
                <div className="ms-conv-top">
                  <span className="ms-conv-nombre">{p.nombre || 'Sin nombre'}</span>
                </div>
                <div className="ms-conv-bottom">
                  <span className="ms-conv-preview" style={{ fontStyle: 'normal' }}>
                    {p.rol === 'Administrador' || p.rol === 'Admin' ? '👑 Admin' : '👤 Colaborador'}
                  </span>
                </div>
              </div>
            </div>
          ))}
          {filtrados.length === 0 && (
            <div className="ms-empty" style={{ padding: '24px 0' }}><span>Sin resultados</span></div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Componente principal ──────────────────────────────────────────────────────
export default function MensajesSection({ miId, miRol, perfiles, onLeerMensajes }) {
  const [contactoActivo,   setContactoActivo]   = useState(null)
  const [mostrarSelector,  setMostrarSelector]  = useState(false)
  const esAdmin = miRol === 'Administrador' || miRol === 'Admin'

  const handleSeleccionar = (contacto) => {
    setContactoActivo(contacto)
    setMostrarSelector(false)
    if (onLeerMensajes) onLeerMensajes()
  }

  return (
    <div className="ms-layout">
      <ListaConversaciones
        miId={miId}
        esAdmin={esAdmin}
        perfiles={perfiles}
        onSeleccionar={handleSeleccionar}
        contactoActivo={contactoActivo}
        onNuevoChat={() => setMostrarSelector(true)}
      />

      {contactoActivo
        ? <ChatAbierto miId={miId} contacto={contactoActivo} onCerrar={() => setContactoActivo(null)} />
        : <ChatPlaceholder />
      }

      {mostrarSelector && (
        <SelectorNuevoChat
          perfiles={perfiles}
          miId={miId}
          onSeleccionar={handleSeleccionar}
          onCerrar={() => setMostrarSelector(false)}
        />
      )}
    </div>
  )
}