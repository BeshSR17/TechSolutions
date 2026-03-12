import React, { useState, useEffect } from 'react'
import { apiClient } from '../../apiClient';

const UsuariosView = () => {
  const [usuarios, setUsuarios] = useState([])
  const [tareasUsuario, setTareasUsuario] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [usuarioSeleccionado, setUsuarioSeleccionado] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState(null)
  
  const [nuevoUsuario, setNuevoUsuario] = useState({
    id_visual: '',
    nombre: '',
    email: '',
    rol: 'Usuario',
    biografia: '',
    avatar_url: ''
  })

  // --- CARGA DE DATOS ---
  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await apiClient('/perfiles')
      if (res.ok) setUsuarios(await res.json())
    } catch (error) { 
      console.error("Error cargando perfiles:", error) 
    } finally { 
      setLoading(false) 
    }
  }

  const fetchTareasUsuario = async (userId) => {
    try {
      const res = await apiClient('/tareas')
      const todas = await res.json()
      // Filtramos localmente para saber qué tareas pertenecen al usuario
      const filtradas = todas.filter(t => t.empleado_id === userId)
      setTareasUsuario(filtradas)
    } catch (error) { 
      console.error("Error cargando tareas del usuario:", error) 
    }
  }

  useEffect(() => { fetchData() }, [])

  // --- CRUD ---
  const handleGuardar = async (e) => {
    e.preventDefault()
    const endpoint = editandoId ? `/perfiles/${editandoId}` : '/perfiles'
    const method = editandoId ? 'PUT' : 'POST'
    
    try {
      const response = await apiClient(endpoint, {
        method,
        body: JSON.stringify(nuevoUsuario)
      })
      if (response.ok) {
        cerrarFormulario()
        fetchData()
      }
    } catch (error) {
      console.error("Error al guardar usuario:", error)
    }
  }

  const stats = {
    total: usuarios.length,
    activos: usuarios.filter(u => u.estado === 'Activo').length,
    inactivos: usuarios.filter(u => u.estado === 'Inactivo').length
  }

  const prepararEdicion = (u) => {
    setNuevoUsuario({ ...u })
    setEditandoId(u.id)
    setMostrarForm(true)
  }

  const cerrarFormulario = () => {
    setMostrarForm(false)
    setEditandoId(null)
    setNuevoUsuario({ id_visual: '', nombre: '', email: '', rol: 'Usuario', biografia: '', avatar_url: '' })
  }

  const abrirDetalle = (u) => {
    setUsuarioSeleccionado(u)
    fetchTareasUsuario(u.id)
  }

  // --- FILTRADO ---
  const usuariosFiltrados = usuarios.filter(u => {
    const term = busqueda.toLowerCase()
    const coincideBusqueda = 
      u.nombre?.toLowerCase().includes(term) || 
      u.email?.toLowerCase().includes(term) ||
      u.id_visual?.toLowerCase().includes(term);
    
    const coincideEstado = filtroEstado ? u.estado === filtroEstado : true;
    return coincideBusqueda && coincideEstado;
  })

  const getCardStyle = (color, isActive) => ({
    background: isActive ? '#2d3748' : '#1e293b',
    padding: '15px',
    borderRadius: '12px',
    borderLeft: `4px solid ${color}`,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    transform: isActive ? 'scale(1.02)' : 'scale(1)',
    display: 'flex',
    flexDirection: 'column'
  })

  // --- SUB-VISTA: DETALLE ---
  const DetalleUsuario = ({ user, alCerrar }) => (
    <div className="animation-slide" style={{ background: '#1e293b', padding: '30px', borderRadius: '15px', border: '1px solid #334155' }}>
      <button onClick={alCerrar} className="btn-secondary" style={{ marginBottom: '20px' }}>← Volver</button>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', overflow: 'hidden', background: '#3b82f6' }}>
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: 'white', fontWeight: 'bold' }}>
                  {user.nombre?.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <h2 style={{ color: 'white', margin: 0 }}>{user.nombre} <span style={{ color: '#475569', fontSize: '0.9rem' }}>#{user.id_visual}</span></h2>
              <p style={{ color: '#3b82f6', margin: 0 }}>{user.email}</p>
            </div>
          </div>
          
          <h4 style={{ color: 'white', marginBottom: '15px' }}>Tareas Asignadas ({tareasUsuario.length})</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tareasUsuario.length === 0 ? <p style={{color: '#475569'}}>Sin tareas asignadas actualmente.</p> : 
              tareasUsuario.map(t => (
                <div key={t.id} style={{ background: '#0f172a', padding: '15px', borderRadius: '8px', border: '1px solid #1e293b' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: 'white', fontWeight: 'bold' }}>{t.titulo}</span>
                    <span className={`badge ${t.estado?.replace(/\s+/g, '-').toLowerCase()}`} style={{ fontSize: '0.6rem' }}>{t.estado}</span>
                  </div>
                  <p style={{ fontSize: '0.75rem', color: '#64748b', margin: '5px 0 0 0' }}>Proyecto: {t.proyectos?.nombre_proyecto}</p>
                </div>
              ))
            }
          </div>
        </div>

        <div style={{ background: '#0f172a', borderRadius: '12px', padding: '20px', height: 'fit-content' }}>
          <h4 style={{ color: '#64748b', marginBottom: '10px' }}>Perfil Profesional</h4>
          <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}><strong>Rol:</strong> {user.rol}</p>
          <div style={{ marginTop: '15px' }}>
            <label style={{ color: '#475569', fontSize: '0.75rem', display: 'block' }}>BIO / NOTAS</label>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{user.biografia || "Sin descripción."}</p>
          </div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="dashboard-content">
      {/* STATS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '25px' }}>
        <div style={getCardStyle('#3b82f6', filtroEstado === null)} onClick={() => setFiltroEstado(null)}>
          <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>TOTAL</span>
          <h2 style={{ margin: 0, color: 'white' }}>{stats.total}</h2>
        </div>
        <div style={getCardStyle('#10b981', filtroEstado === 'Activo')} onClick={() => setFiltroEstado('Activo')}>
          <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>ACTIVOS</span>
          <h2 style={{ margin: 0, color: '#10b981' }}>{stats.activos}</h2>
        </div>
        <div style={getCardStyle('#ef4444', filtroEstado === 'Inactivo')} onClick={() => setFiltroEstado('Inactivo')}>
          <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>INACTIVOS</span>
          <h2 style={{ margin: 0, color: '#ef4444' }}>{stats.inactivos}</h2>
        </div>
      </div>

      {usuarioSeleccionado ? (
        <DetalleUsuario user={usuarioSeleccionado} alCerrar={() => setUsuarioSeleccionado(null)} />
      ) : (
        <>
          <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
            <input 
              type="text" 
              placeholder="🔍 Buscar colaborador..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#1e293b', color: 'white', border: '1px solid #334155' }}
            />
            <button className="btn-save" onClick={() => setMostrarForm(!mostrarForm)}>
              {mostrarForm ? 'Cerrar' : '+ Nuevo Usuario'}
            </button>
          </div>

          {mostrarForm && (
            <section className="form-section animation-slide" style={{ marginBottom: '25px', background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
              <h3 style={{ color: 'white', marginBottom: '15px' }}>{editandoId ? '✏️ Editar Perfil' : '👤 Nuevo Colaborador'}</h3>
              <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr 1.2fr', gap: '15px' }}>
                  <input type="text" placeholder="ID (EMP-01)" value={nuevoUsuario.id_visual} onChange={e => setNuevoUsuario({...nuevoUsuario, id_visual: e.target.value})} style={{ padding: '10px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #334155' }} />
                  <input type="text" placeholder="Nombre completo" value={nuevoUsuario.nombre} onChange={e => setNuevoUsuario({...nuevoUsuario, nombre: e.target.value})} style={{ padding: '10px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #334155' }} />
                  <input type="email" placeholder="Email" value={nuevoUsuario.email} onChange={e => setNuevoUsuario({...nuevoUsuario, email: e.target.value})} style={{ padding: '10px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #334155' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '15px' }}>
                  <textarea placeholder="Bio..." value={nuevoUsuario.biografia} onChange={e => setNuevoUsuario({...nuevoUsuario, biografia: e.target.value})} rows="4" style={{ padding: '10px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #334155', resize: 'none' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <select value={nuevoUsuario.rol} onChange={e => setNuevoUsuario({...nuevoUsuario, rol: e.target.value})} style={{ padding: '10px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #334155' }}>
                      <option value="Usuario">Empleado</option>
                      <option value="Admin">Admin</option>
                    </select>
                    <input type="text" placeholder="URL Avatar" value={nuevoUsuario.avatar_url} onChange={e => setNuevoUsuario({...nuevoUsuario, avatar_url: e.target.value})} style={{ padding: '10px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #334155' }} />
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn-save">{editandoId ? 'Actualizar' : 'Crear'}</button>
                  <button type="button" className="btn-secondary" onClick={cerrarFormulario}>Cancelar</button>
                </div>
              </form>
            </section>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {loading ? <p>Cargando equipo...</p> : usuariosFiltrados.map(u => (
              <div key={u.id} className="proyecto-card" onClick={() => abrirDetalle(u)} style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', cursor: 'pointer', position: 'relative' }}>
                <span style={{ position: 'absolute', top: '10px', right: '15px', fontSize: '0.6rem', color: '#475569' }}>#{u.id_visual}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                  <div style={{ width: '50px', height: '50px', borderRadius: '50%', overflow: 'hidden', background: '#3b82f6' }}>
                    {u.avatar_url ? <img src={u.avatar_url} alt={u.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white' }}>{u.nombre?.charAt(0)}</div>}
                  </div>
                  <div style={{ flex: 1 }}>
                    <h3 style={{ color: '#f8fafc', margin: 0, fontSize: '1rem' }}>{u.nombre}</h3>
                    <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0 }}>{u.email}</p>
                  </div>
                  <button onClick={(e) => { e.stopPropagation(); prepararEdicion(u); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✏️</button>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default UsuariosView