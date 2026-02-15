import { useState, useEffect } from 'react'
import './AdminDashboard.css'


const AdminDashboard = ({ session, supabase }) => {
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)

  // Función para traer datos desde tu Backend de Python (Flask)
  const fetchClientes = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/clientes')
      const data = await response.json()
      setClientes(data)
    } catch (error) {
      console.error("Error cargando clientes:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchClientes()
  }, [])

  return (
    <div className="dashboard-content">
      <header className="dashboard-header">
        <h1>Panel de Gestión TechSolutions S.A</h1>
        <p>Bienvenido, <strong>{session.user.user_metadata?.nombre || 'Usuario'}</strong></p>
      </header>

      <div className="stats-bar">
        <div className="stat-card">
          <h3>Clientes</h3>
          <p>{clientes.length}</p>
        </div>
        <div className="stat-card">
          <h3>Proyectos</h3>
          <p>Próximamente</p>
        </div>
      </div>

      <section className="data-section">
        <h2>Listado de Clientes</h2>
        {loading ? (
          <p>Cargando datos empresariales...</p>
        ) : (
          <table className="empresa-table">
            <thead>
              <tr>
                <th>Empresa</th>
                <th>Contacto</th>
                <th>Email</th>
                <th>Estado</th>
              </tr>
            </thead>
            <tbody>
              {clientes.map((c) => (
                <tr key={c.id}>
                  <td>{c.empresa}</td>
                  <td>{c.nombre_contacto}</td>
                  <td>{c.email}</td>
                  <td><span className={`badge ${c.estado}`}>{c.estado}</span></td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

export default AdminDashboard