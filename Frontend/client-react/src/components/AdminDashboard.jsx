import { useState } from 'react'
import './AdminDashboard.css'
import ClientesView from './ClientesView' // Importamos la vista
import ProyectosView from './ProyectosView'

const AdminDashboard = ({ session, handleLogout }) => {
  const [seccionActual, setSeccionActual] = useState('clientes')

  return (
    <div className="main-layout">
      {/* BARRA LATERAL */}
      <aside className="side-nav">
        <h2 className="nav-logo">Tech Solutions S.A.</h2>
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
        {seccionActual === 'proyectos' && <ProyectosView/>
        }
      </main>
    </div>
  )
}

export default AdminDashboard