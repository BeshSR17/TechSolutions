// UserDashboard.jsx
import { useState, useEffect } from 'react'
import './UsersDashboard.css'
import Perfil     from '../shared/Perfil'
import ChatPage   from '../shared/ChatPage'
import TareasView from './TareasView'
import { ToastProvider } from '../shared/Toast'
import { apiClient } from '../../apiClient'
import { supabase } from '../../supabaseClient'
import { useNotificaciones } from '../../hooks/useNotificaciones'

const NAV_ITEMS = [
  { id: 'tareas', icon: '✅', label: 'Mis Tareas'   },
  { id: 'chat',   icon: '💬', label: 'Chat'          },
  { id: 'perfil', icon: '⚙️', label: 'Configuración' },
]

// Componente interno (dentro del ToastProvider)
function UserDashboardInner({ session, handleLogout, logo }) {
  const [seccionActual, setSeccionActual] = useState('tareas')
  const [avatarUrl,     setAvatarUrl]     = useState(null)
  const [collapsed,     setCollapsed]     = useState(false)

  const userId = session?.user?.id

  const {
    miId,
    badgeMensajes,
    badgeConsultas,
    limpiarBadgeMensajes,
    limpiarBadgeConsultas,
  } = useNotificaciones()

  const totalBadge = badgeMensajes + badgeConsultas

  useEffect(() => {
    if (!userId) return
    const handleUnload = () => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/perfiles?id=eq.${userId}`
      navigator.sendBeacon(url, new Blob([JSON.stringify({ estado: 'Inactivo' })], { type: 'application/json' }))
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [userId])

  useEffect(() => {
    const fetchAvatar = async () => {
      try {
        if (!userId) return
        const res = await apiClient(`/perfiles/${userId}`)
        if (res.ok) {
          const data = await res.json()
          if (data?.avatar_url) setAvatarUrl(data.avatar_url)
        }
      } catch (err) { console.error(err) }
    }
    fetchAvatar()
  }, [userId])

  const navegarA = (id) => {
    setSeccionActual(id)
    if (id === 'chat') {
      limpiarBadgeMensajes()
      limpiarBadgeConsultas()
    }
  }

  const tituloSeccion = NAV_ITEMS.find(n => n.id === seccionActual)
  const nombreUsuario = session?.user?.user_metadata?.nombre || 'Usuario'

  return (
    <div className={`usr-layout ${collapsed ? 'usr-layout--collapsed' : ''}`}>

      <aside className="usr-sidebar">
        <div className="usr-sidebar-top">
          {!collapsed && <img src={logo} alt="TechSolutions" className="usr-logo" />}
          <button className="usr-collapse-btn" onClick={() => setCollapsed(c => !c)}
            title={collapsed ? 'Expandir' : 'Colapsar'}>
            {collapsed ? '›' : '‹'}
          </button>
        </div>

        {!collapsed && (
          <div className="usr-sidebar-profile">
            <img src={avatarUrl || 'https://via.placeholder.com/40'} alt="avatar" className="usr-sidebar-avatar" />
            <div>
              <p className="usr-sidebar-name">{nombreUsuario}</p>
              <p className="usr-sidebar-role">Colaborador</p>
            </div>
          </div>
        )}

        <nav className="usr-nav">
          {NAV_ITEMS.map(item => {
            const tieneNoti = item.id === 'chat' && totalBadge > 0
            return (
              <button
                key={item.id}
                className={`usr-nav-item ${seccionActual === item.id ? 'usr-nav-item--active' : ''}`}
                onClick={() => navegarA(item.id)}
                title={collapsed ? item.label : ''}
              >
                <span className="usr-nav-icon">{item.icon}</span>
                {!collapsed && <span className="usr-nav-label">{item.label}</span>}
                {tieneNoti && (
                  <span className="usr-nav-badge">
                    {totalBadge > 9 ? '9+' : totalBadge}
                  </span>
                )}
              </button>
            )
          })}
        </nav>

        <button className="usr-logout" onClick={handleLogout}>
          <span>🚪</span>
          {!collapsed && <span>Cerrar sesión</span>}
        </button>
      </aside>

      <div className="usr-main">
        <header className="usr-topbar">
          <div className="usr-topbar-left">
            <span className="usr-section-icon">{tituloSeccion?.icon}</span>
            <div>
              <h1 className="usr-section-title">{tituloSeccion?.label}</h1>
              <p className="usr-section-sub">Portal del Colaborador</p>
            </div>
          </div>
          <div className="usr-topbar-right">
            {totalBadge > 0 && seccionActual !== 'chat' && (
              <button className="usr-msg-alert" onClick={() => navegarA('chat')}>
                <span className="usr-chat-dot" />
                {totalBadge} mensaje{totalBadge !== 1 ? 's' : ''} nuevo{totalBadge !== 1 ? 's' : ''}
              </button>
            )}
            <div className="usr-user-chip">
              <img src={avatarUrl || 'https://via.placeholder.com/36'} alt="avatar" className="usr-user-avatar" />
              <div className="usr-user-info">
                <span className="usr-user-name">{nombreUsuario}</span>
                <span className="usr-user-role">Colaborador</span>
              </div>
            </div>
          </div>
        </header>

        <main className="usr-content">
          {seccionActual === 'tareas' && <TareasView usuarioId={userId} />}
          {seccionActual === 'perfil' && <Perfil session={session} onAvatarUpdate={setAvatarUrl} />}
          {seccionActual === 'chat'   && (
            <ChatPage
              badgeMensajes={badgeMensajes}
              badgeConsultas={badgeConsultas}
              limpiarBadgeMensajes={limpiarBadgeMensajes}
              limpiarBadgeConsultas={limpiarBadgeConsultas}
              miIdExterno={miId}
            />
          )}
        </main>
      </div>
    </div>
  )
}

const UserDashboard = ({ session, handleLogout, logo }) => (
  <ToastProvider>
    <UserDashboardInner session={session} handleLogout={handleLogout} logo={logo} />
  </ToastProvider>
)

export default UserDashboard