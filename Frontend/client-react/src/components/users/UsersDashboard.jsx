import { useState, useEffect } from 'react' 
import './UsersDashboard.css'
import Perfil from '../shared/perfil'
import { apiClient } from '../../apiClient' // Importamos tu cliente con JWT
import TareasView from './TareasView'

const UserDashboard = ({ session, handleLogout, logo }) => {
  const [seccionActual, setSeccionActual] = useState('tareas')
  const [avatarUrl, setAvatarUrl] = useState(null)

  const handleAvatarUpdate = (newUrl) => {
    setAvatarUrl(newUrl)
  }

  // --- CAMBIO CLAVE: Usar apiClient para obtener el perfil desde Python ---
  useEffect(() => {
    const fetchAvatar = async () => {
      try {
        const userId = session?.user?.id
        if (!userId) return

        const res = await apiClient(`/perfiles/${userId}`)
        if (res.ok) {
          const data = await res.json()
          if (data?.avatar_url) {
            setAvatarUrl(data.avatar_url)
          }
        }
      } catch (error) {
        console.error("Error al obtener el avatar del dashboard:", error)
      }
    }
    fetchAvatar()
  }, [session?.user?.id])
  
  return (
    <div className="main-layout">
      {/* BARRA LATERAL */}
      <aside className="side-nav">
        <div className="nav-logo-container">
          <img src={logo} alt="Logo" className="nav-logo-img" />
        </div>
        <div className="button-group">
          <button 
            className={seccionActual === 'tareas' ? 'active' : ''} 
            onClick={() => setSeccionActual('tareas')}
          >
            ✅ Mis Tareas
          </button>
          <button 
            className={seccionActual === 'dudas' ? 'active' : ''} 
            onClick={() => setSeccionActual('dudas')}
          >
            💬 Chat de Dudas
          </button>
          <button 
            className={seccionActual === 'perfil' ? 'active' : ''} 
            onClick={() => setSeccionActual('perfil')}
          >
            ⚙️ Configuración
          </button>
        </div>
        <button onClick={handleLogout} className="logout-btn">Cerrar Sesión</button>
      </aside>

      {/* ÁREA DE CONTENIDO */}
      <main className="content-area">
        <header className="dashboard-header">
          <div className="user-info-header">
            <img 
              src={avatarUrl || 'https://via.placeholder.com/40'} 
              alt="Perfil" 
              className="header-avatar" 
            />
            <p>Bienvenido, <strong>{session?.user?.user_metadata?.nombre || 'Usuario'}</strong></p>
          </div>
        </header>

        <div className="dashboard-content">
          {/* Asegúrate de que TareasView también use apiClient por dentro si consume datos */}
          {seccionActual === 'tareas' && <TareasView usuarioId={session?.user?.id} />}
          {seccionActual === 'dudas' && <h1>Centro de Ayuda</h1>}
          {seccionActual === 'perfil' && (
            <Perfil session={session} onAvatarUpdate={handleAvatarUpdate} />
          )}
        </div>
      </main>
    </div>
  )
}

export default UserDashboard