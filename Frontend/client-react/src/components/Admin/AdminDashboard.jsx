import { useState, useEffect, useRef } from 'react'
import './AdminDashboard.css'
import ClientesView  from './ClientesView'
import ProyectosView from './ProyectosView'
import TareasView    from './TareasView'
import UsuariosView  from './UsuariosView'
import Perfil        from '../shared/Perfil'
import ChatPage      from '../shared/ChatPage'   // ← reemplaza Chat
import { supabase }  from '../../supabaseClient'

const NAV_ITEMS = [
  { id: 'clientes',  icon: '👥', label: 'Clientes'  },
  { id: 'proyectos', icon: '📁', label: 'Proyectos' },
  { id: 'Tareas',    icon: '📋', label: 'Tareas'    },
  { id: 'Usuarios',  icon: '👤', label: 'Usuarios'  },
  { id: 'chat',      icon: '💬', label: 'Chat'      },
  { id: 'perfil',    icon: '⚙️', label: 'Perfil'    },
]

const AdminDashboard = ({ session, handleLogout, logo }) => {
  const [seccionActual,    setSeccionActual]    = useState('clientes')
  const [avatarUrl,        setAvatarUrl]        = useState(null)
  const [collapsed,        setCollapsed]        = useState(false)
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState(0)

  const seccionRef = useRef(seccionActual)
  useEffect(() => { seccionRef.current = seccionActual }, [seccionActual])

  const adminId = session.user.id

  // ── Marcar inactivo al cerrar ─────────────────────────────────────────────
  useEffect(() => {
    if (!adminId) return
    const handleUnload = () => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/perfiles?id=eq.${adminId}`
      navigator.sendBeacon(url, new Blob([JSON.stringify({ estado: 'Inactivo' })], { type: 'application/json' }))
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [adminId])

  // ── Avatar ────────────────────────────────────────────────────────────────
  useEffect(() => {
    supabase.from('perfiles').select('avatar_url').eq('id', adminId).single()
      .then(({ data }) => { if (data?.avatar_url) setAvatarUrl(data.avatar_url) })
  }, [adminId])

  // ── Badge de no leídos (mensajes + consultas pendientes) ──────────────────
  useEffect(() => {
    if (!adminId) return
    const contar = async () => {
      const { count: cMsg } = await supabase
        .from('mensajes')
        .select('id', { count: 'exact', head: true })
        .eq('destinatario_id', adminId)
        .or('leido.eq.false,leido.is.null')

      const { count: cConsultas } = await supabase
        .from('consultas')
        .select('id', { count: 'exact', head: true })
        .eq('estado', 'pendiente')

      setMensajesNoLeidos((cMsg || 0) + (cConsultas || 0))
    }
    contar()
  }, [adminId])

  // ── Realtime badge en sidebar ─────────────────────────────────────────────
  useEffect(() => {
    if (!adminId) return
    const canal = supabase
      .channel('adm-badge-realtime')
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'mensajes',
        filter: `destinatario_id=eq.${adminId}`,
      }, () => {
        if (seccionRef.current !== 'chat') setMensajesNoLeidos(prev => prev + 1)
      })
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'consultas',
      }, () => {
        if (seccionRef.current !== 'chat') setMensajesNoLeidos(prev => prev + 1)
      })
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [adminId])

  const navegarA = (id) => {
    setSeccionActual(id)
    if (id === 'chat') setMensajesNoLeidos(0)
  }

  // Permite que UsuariosView abra el chat directamente en la sección mensajes
  const abrirChatConUsuario = (usuario) => {
    setSeccionActual('chat')
    setMensajesNoLeidos(0)
  }

  const tituloSeccion = NAV_ITEMS.find(n => n.id === seccionActual)

  return (
    <div className={`adm-layout ${collapsed ? 'adm-layout--collapsed' : ''}`}>

      {/* ── SIDEBAR ── */}
      <aside className="adm-sidebar">
        <div className="adm-sidebar-top">
          {!collapsed && <img src={logo} alt="TechSolutions" className="adm-logo" />}
          <button className="adm-collapse-btn" onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expandir' : 'Colapsar'}>
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
                {mensajesNoLeidos} notificación{mensajesNoLeidos !== 1 ? 'es' : ''} nueva{mensajesNoLeidos !== 1 ? 's' : ''}
              </button>
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

          {/* ── CHAT: ahora es solo <ChatPage /> sin props ni lógica extra ── */}
          {seccionActual === 'chat' && <ChatPage />}
        </main>
      </div>
    </div>
  )
}

export default AdminDashboard