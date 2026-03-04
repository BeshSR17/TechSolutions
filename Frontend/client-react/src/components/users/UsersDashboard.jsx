import { useState } from 'react'
import './UsersDashboard.css'

const UserDashboard = ({ session, handleLogout }) => {
  const [seccionActual, setSeccionActual] = useState('tareas')

  return (
    <div className="main-layout">
      {/* BARRA LATERAL */}
      <aside className="side-nav">
        <h2 className="nav-logo">TechSolutions</h2>
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
          <p>Bienvenido, <strong>{session.user.user_metadata?.nombre || 'Usuario'}</strong></p>
        </header>

        <div className="dashboard-content">
          {seccionActual === 'tareas' && <h1>Gestión de Tareas</h1>}
          {seccionActual === 'dudas' && <h1>Centro de Ayuda</h1>}
          {seccionActual === 'perfil' && <h1>Configuración de Perfil</h1>}
        </div>
      </main>
    </div>
  )
}

export default UserDashboard