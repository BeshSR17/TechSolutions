import { useState, useEffect } from 'react'
import './AdminDashboard.css'
import ClientesView from './ClientesView' 
import ProyectosView from './ProyectosView'
import TareasView from './TareasView'
import UsuariosView from './UsuariosView'
import Perfil from '../shared/perfil'
import { supabase } from '../../supabaseClient'; 

const AdminDashboard = ({ session, handleLogout, logo }) => {
  const [seccionActual, setSeccionActual] = useState('clientes')
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
        {/* REEMPLAZAMOS EL H2 POR EL LOGO */}
        <div className="nav-logo-container">
          <img src={logo} alt="TechSolutions Logo" className="nav-logo-img" />
        </div>

        <div className="button-group">
          <button 
            className={seccionActual === 'clientes' ? 'active' : ''} 
            onClick={() => setSeccionActual('clientes')}
          >
            👥 Gestión Clientes
          </button>
          {/* ... resto de tus botones se mantienen igual */}
          <button 
            className={seccionActual === 'proyectos' ? 'active' : ''} 
            onClick={() => setSeccionActual('proyectos')}
          >
            📁 Proyectos
          </button>

          <button 
            className={seccionActual === 'Tareas' ? 'active' : ''} 
            onClick={() => setSeccionActual('Tareas')}
          >
            📁 Tareas
          </button>
          <button 
            className={seccionActual === 'Usuarios' ? 'active' : ''} 
            onClick={() => setSeccionActual('Usuarios')}
          >
            👥 Gestión Usuarios
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

        {/* Renderizado Condicional */}
        {seccionActual === 'clientes' && <ClientesView />}
        {seccionActual === 'proyectos' && <ProyectosView/>}
        {seccionActual === 'Tareas' && <TareasView />}
        {seccionActual === 'Usuarios' && <UsuariosView />}
        {seccionActual === 'perfil' && (<Perfil session={session} onAvatarUpdate={handleAvatarUpdate} />)}
      </main>
    </div>
  )
}

export default AdminDashboard