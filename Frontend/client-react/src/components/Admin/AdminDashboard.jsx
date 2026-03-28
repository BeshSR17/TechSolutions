import { useState, useEffect, useRef } from 'react'
import './AdminDashboard.css'
import ClientesView  from './ClientesView'
import ProyectosView from './ProyectosView'
import TareasView    from './TareasView'
import UsuariosView  from './UsuariosView'
import Perfil        from '../shared/Perfil'
import Chat          from '../shared/Chat'
import { supabase }  from '../../supabaseClient'

const NAV_ITEMS = [
  { id: 'clientes',  icon: '👥', label: 'Clientes'  },
  { id: 'proyectos', icon: '📁', label: 'Proyectos' },
  { id: 'Tareas',    icon: '📋', label: 'Tareas'    },
  { id: 'Usuarios',  icon: '👤', label: 'Usuarios'  },
  { id: 'chat',      icon: '💬', label: 'Chat'      },
  { id: 'perfil',    icon: '⚙️', label: 'Perfil'    },
]

// ── Componente: lista de conversaciones ────────────────────────
const ChatList = ({ adminId, onSeleccionar, usuarioActual, refrescarKey }) => {
  const [conversaciones, setConversaciones] = useState([])
  const [cargando, setCargando] = useState(true)

  const cargar = async () => {
    try {
      const { data } = await supabase
        .from('mensajes')
        .select('*, remitente:perfiles!remitente_id(id, nombre, avatar_url)')
        .or(`destinatario_id.eq.${adminId},remitente_id.eq.${adminId}`)
        .order('creado_en', { ascending: false })

      if (!data) return

      const mapa = {}
      data.forEach(msg => {
        const otroId = msg.remitente_id === adminId ? msg.destinatario_id : msg.remitente_id
        const otroPerfil = msg.remitente_id !== adminId ? msg.remitente : null

        if (!mapa[otroId]) {
          mapa[otroId] = {
            usuarioId:     otroId,
            nombre:        otroPerfil?.nombre || 'Usuario',
            avatar_url:    otroPerfil?.avatar_url || null,
            ultimoMensaje: msg.contenido,
            ultimaFecha:   msg.creado_en,
            noLeidos:      0,
          }
        }

        if (msg.remitente_id !== adminId && !msg.leido) {
          mapa[otroId].noLeidos++
        }
      })

      const sinPerfil = Object.values(mapa).filter(c => c.nombre === 'Usuario')
      if (sinPerfil.length > 0) {
        const ids = sinPerfil.map(c => c.usuarioId)
        const { data: perfiles } = await supabase
          .from('perfiles').select('id, nombre, avatar_url').in('id', ids)
        perfiles?.forEach(p => {
          if (mapa[p.id]) {
            mapa[p.id].nombre     = p.nombre
            mapa[p.id].avatar_url = p.avatar_url
          }
        })
      }

      const lista = Object.values(mapa).sort(
        (a, b) => new Date(b.ultimaFecha) - new Date(a.ultimaFecha)
      )
      setConversaciones(lista)
    } catch (err) {
      console.error('Error cargando conversaciones:', err)
    } finally {
      setCargando(false)
    }
  }

  useEffect(() => { cargar() }, [refrescarKey])

  useEffect(() => {
    cargar()
    const canal = supabase
      .channel('chatlist-updates')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'mensajes',
        filter: `destinatario_id=eq.${adminId}`,
      }, () => cargar())
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [adminId])

  const formatHora = (fecha) => {
    const d = new Date(fecha)
    const hoy = new Date()
    if (d.toDateString() === hoy.toDateString()) {
      return d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })
    }
    return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
  }

  const inicial = (nombre) => nombre ? nombre.charAt(0).toUpperCase() : '?'

  if (cargando) return (
    <div className="adm-chatlist-empty">
      <div className="adm-spinner-sm" />
      <span>Cargando conversaciones...</span>
    </div>
  )

  if (conversaciones.length === 0) return (
    <div className="adm-chatlist-empty">
      <span style={{ fontSize: '32px', opacity: 0.3 }}>💬</span>
      <p>No hay conversaciones aún.</p>
      <p style={{ fontSize: '12px', color: 'var(--adm-muted)' }}>
        Los usuarios pueden iniciarte un chat desde su portal.
      </p>
    </div>
  )

  return (
    <div className="adm-chatlist">
      {conversaciones.map(conv => {
        const isActiva = usuarioActual?.id === conv.usuarioId
        return (
          <button
            key={conv.usuarioId}
            className={`adm-chatlist-item ${isActiva ? 'adm-chatlist-item--active' : ''}`}
            onClick={() => onSeleccionar({ id: conv.usuarioId, nombre: conv.nombre, avatar_url: conv.avatar_url })}
          >
            {/* Avatar */}
            <div className="adm-chatlist-avatar">
              {conv.avatar_url
                ? <img src={conv.avatar_url} alt={conv.nombre} />
                : <span>{inicial(conv.nombre)}</span>
              }
              {conv.noLeidos > 0 && <span className="adm-chatlist-noti">{conv.noLeidos}</span>}
            </div>

            {/* Info */}
            <div className="adm-chatlist-info">
              <div className="adm-chatlist-row">
                <span className="adm-chatlist-nombre">{conv.nombre}</span>
                <span className="adm-chatlist-hora">{formatHora(conv.ultimaFecha)}</span>
              </div>
              <p className={`adm-chatlist-preview ${conv.noLeidos > 0 ? 'adm-chatlist-preview--unread' : ''}`}>
                {conv.ultimoMensaje}
              </p>
            </div>
          </button>
        )
      })}
    </div>
  )
}

// ── Dashboard principal ───────────────────────────────────────────────────────
const AdminDashboard = ({ session, handleLogout, logo }) => {
  const [seccionActual,    setSeccionActual]    = useState('clientes')
  const [avatarUrl,        setAvatarUrl]        = useState(null)
  const [chatConUsuario,   setChatConUsuario]   = useState(null)
  const [collapsed,        setCollapsed]        = useState(false)
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState(0)
  const [refrescarKey,     setRefrescarKey]     = useState(0)

  const seccionRef = useRef(seccionActual)
  useEffect(() => { seccionRef.current = seccionActual }, [seccionActual])

  const adminId = session.user.id

  useEffect(() => {
    if (!adminId) return
    const handleUnload = () => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/perfiles?id=eq.${adminId}`
      const data = JSON.stringify({ estado: 'Inactivo' })
      navigator.sendBeacon(url, new Blob([data], { type: 'application/json' }))
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [adminId])

  // ── Avatar ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAvatar = async () => {
      const { data } = await supabase.from('perfiles').select('avatar_url').eq('id', adminId).single()
      if (data?.avatar_url) setAvatarUrl(data.avatar_url)
    }
    fetchAvatar()
  }, [adminId])

  useEffect(() => {
    const contarNoLeidos = async () => {
      const { count } = await supabase
        .from('mensajes')
        .select('id', { count: 'exact', head: true })
        .eq('destinatario_id', adminId)
        .eq('leido', false)
      setMensajesNoLeidos(count || 0)
    }
    contarNoLeidos()
  }, [adminId])

  // ── Realtime: incrementar cuando llegan mensajes nuevos ────────────────────
  useEffect(() => {
    const canal = supabase
      .channel('admin-mensajes-nuevos')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'mensajes',
        filter: `destinatario_id=eq.${adminId}`,
      }, () => {
        if (seccionRef.current !== 'chat') {
          setMensajesNoLeidos(prev => prev + 1)
        }
      })
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [adminId])

  const marcarLeidosDe = async (usuarioId) => {
    await supabase
      .from('mensajes')
      .update({ leido: true })
      .eq('destinatario_id', adminId)
      .eq('remitente_id', usuarioId)
      .eq('leido', false)

    const { count } = await supabase
      .from('mensajes')
      .select('id', { count: 'exact', head: true })
      .eq('destinatario_id', adminId)
      .eq('leido', false)
    setMensajesNoLeidos(count || 0)

    setRefrescarKey(k => k + 1)
  }

  const seleccionarChat = (usuario) => {
    setChatConUsuario(usuario)
    marcarLeidosDe(usuario.id)
  }

  const navegarA = (id) => {
    setSeccionActual(id)
  }

  const abrirChatConUsuario = (usuario) => {
    setChatConUsuario(usuario)
    setSeccionActual('chat')
    marcarLeidosDe(usuario.id)
  }

  const tituloSeccion = NAV_ITEMS.find(n => n.id === seccionActual)

  return (
    <div className={`adm-layout ${collapsed ? 'adm-layout--collapsed' : ''}`}>

      {/* ── SIDEBAR ── */}
      <aside className="adm-sidebar">
        <div className="adm-sidebar-top">
          {!collapsed && <img src={logo} alt="TechSolutions" className="adm-logo" />}
          <button className="adm-collapse-btn" onClick={() => setCollapsed(c => !c)} title={collapsed ? 'Expandir' : 'Colapsar'}>
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        <nav className="adm-nav">
          {NAV_ITEMS.map(item => {
            const isActive   = seccionActual === item.id
            const esChatItem = item.id === 'chat'
            const tieneNoti  = esChatItem && mensajesNoLeidos > 0
            return (
              <button
                key={item.id}
                className={`adm-nav-item ${isActive ? 'adm-nav-item--active' : ''}`}
                onClick={() => navegarA(item.id)}
                title={collapsed ? item.label : ''}
              >
                <span className="adm-nav-icon">{item.icon}</span>
                {!collapsed && <span className="adm-nav-label">{item.label}</span>}

                {tieneNoti && (
                  <span className="adm-nav-badge adm-nav-badge--count">
                    {mensajesNoLeidos > 9 ? '9+' : mensajesNoLeidos}
                  </span>
                )}

                {esChatItem && chatConUsuario && !tieneNoti && (
                  <span className="adm-nav-badge--active-chat" />
                )}
              </button>
            )
          })}
        </nav>

        <button className="adm-logout" onClick={handleLogout}>
          <span>🚪</span>
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </aside>

      {/* ── MAIN ── */}
      <div className="adm-main">
        <header className="adm-topbar">
          <div className="adm-topbar-left">
            <span className="adm-section-icon">{tituloSeccion?.icon}</span>
            <div>
              <h1 className="adm-section-title">{tituloSeccion?.label}</h1>
              <p className="adm-section-sub">Panel de Administración</p>
            </div>
          </div>
          <div className="adm-topbar-right">
            {mensajesNoLeidos > 0 && seccionActual !== 'chat' && (
              <button className="adm-msg-alert" onClick={() => navegarA('chat')}>
                <span className="adm-chat-dot" />
                {mensajesNoLeidos} mensaje{mensajesNoLeidos !== 1 ? 's' : ''} nuevo{mensajesNoLeidos !== 1 ? 's' : ''}
              </button>
            )}
            {seccionActual === 'chat' && chatConUsuario && (
              <div className="adm-chat-indicator">
                <span className="adm-chat-dot" />
                Chatando con <strong>{chatConUsuario.nombre}</strong>
              </div>
            )}
            <div className="adm-user-chip">
              <img src={avatarUrl || 'https://via.placeholder.com/36'} alt="avatar" className="adm-user-avatar" />
              <div className="adm-user-info">
                <span className="adm-user-name">{session.user.user_metadata?.nombre || 'Admin'}</span>
                <span className="adm-user-role">Administrador</span>
              </div>
            </div>
          </div>
        </header>

        <main className="adm-content">
          {seccionActual === 'clientes'  && <ClientesView />}
          {seccionActual === 'proyectos' && <ProyectosView />}
          {seccionActual === 'Tareas'    && <TareasView isAdmin={true} />}
          {seccionActual === 'Usuarios'  && <UsuariosView onChatClick={abrirChatConUsuario} />}
          {seccionActual === 'perfil'    && <Perfil session={session} onAvatarUpdate={setAvatarUrl} />}

          {seccionActual === 'chat' && (
            <div className="adm-chat-layout">

              {/* Panel izquierdo: lista de conversaciones */}
              <div className="adm-chat-panel-left">
                <div className="adm-chat-panel-header">
                  <h3>Conversaciones</h3>
                  {mensajesNoLeidos > 0 && (
                    <span className="adm-chat-panel-badge">{mensajesNoLeidos} nuevos</span>
                  )}
                </div>
                <ChatList
                  adminId={adminId}
                  onSeleccionar={seleccionarChat}
                  usuarioActual={chatConUsuario}
                  refrescarKey={refrescarKey}
                />
              </div>

              {/* Panel derecho: chat activo o placeholder */}
              <div className="adm-chat-panel-right">
                {chatConUsuario ? (
                  <Chat
                    otroUsuarioId={chatConUsuario.id}
                    nombreOtro={chatConUsuario.nombre}
                    rolOtro={chatConUsuario.rol}
                    avatarOtro={chatConUsuario.avatar_url}
                  />
                ) : (
                  <div className="adm-chat-select-hint">
                    <span style={{ fontSize: '40px', opacity: 0.2 }}>💬</span>
                    <p>Selecciona una conversación de la lista</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default AdminDashboard