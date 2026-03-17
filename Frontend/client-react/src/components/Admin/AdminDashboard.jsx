import { useState, useEffect } from 'react'
import './AdminDashboard.css'
import ClientesView  from './ClientesView'
import ProyectosView from './ProyectosView'
import TareasView    from './TareasView'
import UsuariosView  from './UsuariosView'
import Perfil        from '../shared/perfil'
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

const AdminDashboard = ({ session, handleLogout, logo }) => {
  const [seccionActual,  setSeccionActual]  = useState('clientes')
  const [avatarUrl,      setAvatarUrl]      = useState(null)
  const [chatConUsuario, setChatConUsuario] = useState(null)
  const [collapsed,      setCollapsed]      = useState(false)

  useEffect(() => {
    const fetchAvatar = async () => {
      const { data } = await supabase
        .from('perfiles')
        .select('avatar_url')
        .eq('id', session.user.id)
        .single()
      if (data?.avatar_url) setAvatarUrl(data.avatar_url)
    }
    fetchAvatar()
  }, [session.user.id])

  const abrirChatConUsuario = (usuario) => {
    setChatConUsuario(usuario)
    setSeccionActual('chat')
  }

  const tituloSeccion = NAV_ITEMS.find(n => n.id === seccionActual)

  return (
    <div className={`adm-layout ${collapsed ? 'adm-layout--collapsed' : ''}`}>

      {/* ── SIDEBAR ── */}
      <aside className="adm-sidebar">
        <div className="adm-sidebar-top">
          {!collapsed && (
            <img src={logo} alt="TechSolutions" className="adm-logo" />
          )}
          <button
            className="adm-collapse-btn"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expandir' : 'Colapsar'}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        <nav className="adm-nav">
          {NAV_ITEMS.map(item => {
            const isActive = seccionActual === item.id
            const hasBadge = item.id === 'chat' && chatConUsuario
            return (
              <button
                key={item.id}
                className={`adm-nav-item ${isActive ? 'adm-nav-item--active' : ''}`}
                onClick={() => setSeccionActual(item.id)}
                title={collapsed ? item.label : ''}
              >
                <span className="adm-nav-icon">{item.icon}</span>
                {!collapsed && <span className="adm-nav-label">{item.label}</span>}
                {hasBadge && <span className="adm-nav-badge" />}
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

        {/* Topbar */}
        <header className="adm-topbar">
          <div className="adm-topbar-left">
            <span className="adm-section-icon">{tituloSeccion?.icon}</span>
            <div>
              <h1 className="adm-section-title">{tituloSeccion?.label}</h1>
              <p className="adm-section-sub">Panel de Administración</p>
            </div>
          </div>

          <div className="adm-topbar-right">
            {seccionActual === 'chat' && chatConUsuario && (
              <div className="adm-chat-indicator">
                <span className="adm-chat-dot" />
                Chatando con <strong>{chatConUsuario.nombre}</strong>
              </div>
            )}
            <div className="adm-user-chip">
              <img
                src={avatarUrl || 'https://via.placeholder.com/36'}
                alt="avatar"
                className="adm-user-avatar"
              />
              <div className="adm-user-info">
                <span className="adm-user-name">
                  {session.user.user_metadata?.nombre || 'Admin'}
                </span>
                <span className="adm-user-role">Administrador</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="adm-content">
          {seccionActual === 'clientes'  && <ClientesView />}
          {seccionActual === 'proyectos' && <ProyectosView />}
          {seccionActual === 'Tareas'    && <TareasView isAdmin={true} />}
          {seccionActual === 'Usuarios'  && <UsuariosView onChatClick={abrirChatConUsuario} />}
          {seccionActual === 'perfil'    && <Perfil session={session} onAvatarUpdate={setAvatarUrl} />}

          {seccionActual === 'chat' && (
            <div className="adm-chat-wrapper">
              {chatConUsuario ? (
                <Chat
                  otroUsuarioId={chatConUsuario.id}
                  nombreOtro={chatConUsuario.nombre}
                  rolOtro={chatConUsuario.rol}
                  avatarOtro={chatConUsuario.avatar_url}
                />
              ) : (
                <div className="adm-chat-empty">
                  <div className="adm-chat-empty-icon">💬</div>
                  <h3>Ninguna conversación abierta</h3>
                  <p>
                    Ve a <strong>Usuarios</strong> y haz clic en el botón 💬
                    de cualquier colaborador para iniciar un chat.
                  </p>
                  <button
                    className="adm-btn-goto"
                    onClick={() => setSeccionActual('Usuarios')}
                  >
                    Ir a Gestión de Usuarios →
                  </button>
                </div>
              )}
            </div>
          )}
        </main>
      </div>
    </div>
  )
}

export default AdminDashboard