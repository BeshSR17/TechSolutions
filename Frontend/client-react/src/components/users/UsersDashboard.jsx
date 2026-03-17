import { useState, useEffect } from 'react'
import './UsersDashboard.css'
import Perfil     from '../shared/perfil'
import Chat       from '../shared/Chat'
import TareasView from './TareasView'
import { apiClient } from '../../apiClient'

const ADMIN_ID = import.meta.env.VITE_ADMIN_ID

const NAV_ITEMS = [
  { id: 'tareas', icon: '✅', label: 'Mis Tareas'    },
  { id: 'dudas',  icon: '💬', label: 'Chat de Dudas'  },
  { id: 'perfil', icon: '⚙️', label: 'Configuración'  },
]

const UserDashboard = ({ session, handleLogout, logo }) => {
  const [seccionActual, setSeccionActual] = useState('tareas')
  const [avatarUrl,     setAvatarUrl]     = useState(null)
  const [collapsed,     setCollapsed]     = useState(false)

  useEffect(() => {
    const fetchAvatar = async () => {
      try {
        const userId = session?.user?.id
        if (!userId) return
        const res = await apiClient(`/perfiles/${userId}`)
        if (res.ok) {
          const data = await res.json()
          if (data?.avatar_url) setAvatarUrl(data.avatar_url)
        }
      } catch (err) {
        console.error('Error al obtener avatar:', err)
      }
    }
    fetchAvatar()
  }, [session?.user?.id])

  const tituloSeccion = NAV_ITEMS.find(n => n.id === seccionActual)
  const nombreUsuario = session?.user?.user_metadata?.nombre || 'Usuario'

  return (
    <div className={`usr-layout ${collapsed ? 'usr-layout--collapsed' : ''}`}>

      {/* ── SIDEBAR ── */}
      <aside className="usr-sidebar">

        {/* Top: logo + colapsar */}
        <div className="usr-sidebar-top">
          {!collapsed && <img src={logo} alt="TechSolutions" className="usr-logo" />}
          <button
            className="usr-collapse-btn"
            onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expandir' : 'Colapsar'}
          >
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        {/* Mini perfil */}
        {!collapsed && (
          <div className="usr-sidebar-profile">
            <img
              src={avatarUrl || 'https://via.placeholder.com/40'}
              alt="avatar"
              className="usr-sidebar-avatar"
            />
            <div>
              <p className="usr-sidebar-name">{nombreUsuario}</p>
              <p className="usr-sidebar-role">Colaborador</p>
            </div>
          </div>
        )}

        {/* Nav */}
        <nav className="usr-nav">
          {NAV_ITEMS.map(item => (
            <button
              key={item.id}
              className={`usr-nav-item ${seccionActual === item.id ? 'usr-nav-item--active' : ''}`}
              onClick={() => setSeccionActual(item.id)}
              title={collapsed ? item.label : ''}
            >
              <span className="usr-nav-icon">{item.icon}</span>
              {!collapsed && <span className="usr-nav-label">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* Logout */}
        <button className="usr-logout" onClick={handleLogout}>
          <span>🚪</span>
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </aside>

      {/* ── MAIN ── */}
      <div className="usr-main">

        {/* Topbar */}
        <header className="usr-topbar">
          <div className="usr-topbar-left">
            <span className="usr-section-icon">{tituloSeccion?.icon}</span>
            <div>
              <h1 className="usr-section-title">{tituloSeccion?.label}</h1>
              <p className="usr-section-sub">Portal del Colaborador</p>
            </div>
          </div>

          <div className="usr-topbar-right">
            <div className="usr-user-chip">
              <img
                src={avatarUrl || 'https://via.placeholder.com/36'}
                alt="avatar"
                className="usr-user-avatar"
              />
              <div className="usr-user-info">
                <span className="usr-user-name">{nombreUsuario}</span>
                <span className="usr-user-role">Colaborador</span>
              </div>
            </div>
          </div>
        </header>

        {/* Content */}
        <main className="usr-content">
          {seccionActual === 'tareas' && (
            <TareasView usuarioId={session?.user?.id} />
          )}

          {seccionActual === 'dudas' && (
            <div className="usr-chat-wrapper">
              <Chat
                otroUsuarioId={ADMIN_ID}
                nombreOtro="Administrador"
                avatarOtro={null}
              />
            </div>
          )}

          {seccionActual === 'perfil' && (
            <Perfil session={session} onAvatarUpdate={setAvatarUrl} />
          )}
        </main>
      </div>
    </div>
  )
}

export default UserDashboard