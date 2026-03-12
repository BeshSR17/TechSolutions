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
            📋 Tareas 
          </button>

          <button 
            className={seccionActual === 'Usuarios' ? 'active' : ''} 
            onClick={() => setSeccionActual('Usuarios')}
          >
            👤 Gestión Usuarios
          </button>

          <button 
            className={seccionActual === 'perfil' ? 'active' : ''} 
            onClick={() => setSeccionActual('perfil')}
          >
            ⚙️ Mi Perfil
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
            <p>Panel de Administración | <strong>{session.user.user_metadata?.nombre || 'Admin'}</strong></p>
          </div>
        </header>

        {/* Renderizado Condicional */}
        <section className="view-container">
          {seccionActual === 'clientes' && <ClientesView />}
          {seccionActual === 'proyectos' && <ProyectosView />}
          {seccionActual === 'Tareas' && <TareasView isAdmin={true} />}
          {seccionActual === 'Usuarios' && <UsuariosView />}
          {seccionActual === 'perfil' && (
            <Perfil session={session} onAvatarUpdate={handleAvatarUpdate} />
          )}
        </section>
      </main>
    </div>
  )
}

export default AdminDashboard