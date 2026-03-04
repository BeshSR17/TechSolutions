import { useState } from 'react'
import './AdminDashboard.css'
import ClientesView from './ClientesView' 
import ProyectosView from './ProyectosView'
import TareasView from './TareasView'

const AdminDashboard = ({ session, handleLogout }) => {
  const [seccionActual, setSeccionActual] = useState('clientes')

  return (
    <div className="main-layout">
      {/* BARRA LATERAL */}
      <aside className="side-nav">
        <h2 className="nav-logo">TechSolutions</h2>
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
            📁 Tareas
          </button>

        </div>
        <button onClick={handleLogout} className="logout-btn">Cerrar Sesión</button>
      </aside>

      {/* ÁREA DE CONTENIDO */}
      <main className="content-area">
        <header className="dashboard-header">
          <p>Bienvenido, <strong>{session.user.user_metadata?.nombre || 'Usuario'}</strong></p>
        </header>

        {/* Renderizado Condicional */}
        {seccionActual === 'clientes' && <ClientesView />}
        {seccionActual === 'proyectos' && <ProyectosView/>}
        {seccionActual === 'Tareas' && <TareasView />}
      </main>
    </div>
  )
}

export default AdminDashboard