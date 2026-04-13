import { useState, useEffect, useRef } from 'react'
import './UsersDashboard.css'
import Perfil     from '../shared/Perfil'
import ChatPage   from '../shared/ChatPage'   // ← reemplaza Chat
import TareasView from './TareasView'
import { ToastProvider } from '../shared/Toast'
import { apiClient } from '../../apiClient'
import { supabase } from '../../supabaseClient'

const NAV_ITEMS = [
  { id: 'tareas', icon: '✅', label: 'Mis Tareas'   },
  { id: 'chat',   icon: '💬', label: 'Chat'          },
  { id: 'perfil', icon: '⚙️', label: 'Configuración' },
]

const UserDashboard = ({ session, handleLogout, logo }) => {
  const [seccionActual,    setSeccionActual]    = useState('tareas')
  const [avatarUrl,        setAvatarUrl]        = useState(null)
  const [collapsed,        setCollapsed]        = useState(false)
  const [mensajesNoLeidos, setMensajesNoLeidos] = useState(0)

  const seccionRef = useRef(seccionActual)
  useEffect(() => { seccionRef.current = seccionActual }, [seccionActual])

  const userId = session?.user?.id

  // ── Marcar inactivo al cerrar ─────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    const handleUnload = () => {
      const url = `${import.meta.env.VITE_SUPABASE_URL}/rest/v1/perfiles?id=eq.${userId}`
      navigator.sendBeacon(url, new Blob([JSON.stringify({ estado: 'Inactivo' })], { type: 'application/json' }))
    }
    window.addEventListener('beforeunload', handleUnload)
    return () => window.removeEventListener('beforeunload', handleUnload)
  }, [userId])

  // ── Avatar ────────────────────────────────────────────────────────────────
  useEffect(() => {
    const fetchAvatar = async () => {
      try {
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
  }, [userId])

  // ── Badge: mensajes no leídos + respuestas en consultas ──────────────────
  useEffect(() => {
    if (!userId) return
    const contar = async () => {
      // Mensajes directos no leídos
      const { count: cMsg } = await supabase
        .from('mensajes')
        .select('id', { count: 'exact', head: true })
        .eq('destinatario_id', userId)
        .or('leido.eq.false,leido.is.null')
      setMensajesNoLeidos(cMsg || 0)
    }
    contar()
  }, [userId])

  // ── Realtime badge en sidebar ─────────────────────────────────────────────
  useEffect(() => {
    if (!userId) return
    const canal = supabase
      .channel(`usr-badge-realtime-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT', schema: 'public', table: 'mensajes',
        filter: `destinatario_id=eq.${userId}`,
      }, () => {
        if (seccionRef.current !== 'chat') setMensajesNoLeidos(prev => prev + 1)
      })
      .subscribe()
    return () => supabase.removeChannel(canal)
  }, [userId])

  const navegarA = (id) => {
    setSeccionActual(id)
    if (id === 'chat') setMensajesNoLeidos(0)
  }

  const tituloSeccion = NAV_ITEMS.find(n => n.id === seccionActual)
  const nombreUsuario = session?.user?.user_metadata?.nombre || 'Usuario'

  return (
    <ToastProvider>
      <div className={`usr-layout ${collapsed ? 'usr-layout--collapsed' : ''}`}>

        {/* ── SIDEBAR ── */}
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
              const esChatItem = item.id === 'chat'
              const tieneNoti  = esChatItem && mensajesNoLeidos > 0
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
                      {mensajesNoLeidos > 9 ? '9+' : mensajesNoLeidos}
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

        {/* ── MAIN ── */}
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
              {mensajesNoLeidos > 0 && seccionActual !== 'chat' && (
                <button className="usr-msg-alert" onClick={() => navegarA('chat')}>
                  <span className="usr-chat-dot" />
                  {mensajesNoLeidos} mensaje{mensajesNoLeidos !== 1 ? 's' : ''} nuevo{mensajesNoLeidos !== 1 ? 's' : ''}
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

            {/* ── CHAT: ahora es solo <ChatPage /> sin props ni lógica extra ── */}
            {seccionActual === 'chat' && <ChatPage />}
          </main>
        </div>
      </div>
    </ToastProvider>
  )
}

export default UserDashboard