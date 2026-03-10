import { useState, useEffect } from 'react' 
import './UsersDashboard.css'
import Perfil from '../shared/perfil'
import { supabase } from '../../supabaseClient';


const UserDashboard = ({ session, handleLogout, logo }) => {
  const [seccionActual, setSeccionActual] = useState('tareas')
  const [avatarUrl, setAvatarUrl] = useState(null)

const handleAvatarUpdate = (newUrl) => {
    setAvatarUrl(newUrl)
  }

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
  
  return (
    <div className="main-layout">
      {/* BARRA LATERAL */}
      <aside className="side-nav">
        <div className="nav-logo-container">
          <img src={logo} alt="TechSolutions Logo" className="nav-logo-img" />
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
          {/* AÑADIMOS EL CONTENEDOR DE LA MINI-FOTO */}
          <div className="user-info-header">
            <img 
              src={avatarUrl || 'https://via.placeholder.com/40'} 
              alt="Perfil" 
              className="header-avatar" 
            />
            <p>Bienvenido, <strong>{session.user.user_metadata?.nombre || 'Usuario'}</strong></p>
          </div>
        </header>

        <div className="dashboard-content">
          {seccionActual === 'tareas' && <h1>Gestión de Tareas</h1>}
          {seccionActual === 'dudas' && <h1>Centro de Ayuda</h1>}
          {seccionActual === 'perfil' && (<Perfil session={session} onAvatarUpdate={handleAvatarUpdate} />)}
        </div>
      </main>
    </div>
  )
}

export default UserDashboard