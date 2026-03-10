import React, { useState, useEffect } from 'react'

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
    avatar_url: '' // Asegúrate de tener este campo
  })

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await fetch('http://localhost:5000/api/perfiles')
      setUsuarios(await res.json())
    } catch (error) { console.error(error) } 
    finally { setLoading(false) }
  }

  const fetchTareasUsuario = async (userId) => {
    try {
      const res = await fetch('http://localhost:5000/api/tareas')
      const todas = await res.json()
      const filtradas = todas.filter(t => t.empleado_id === userId)
      setTareasUsuario(filtradas)
    } catch (error) { console.error(error) }
  }

  useEffect(() => { fetchData() }, [])

  const handleGuardar = async (e) => {
    e.preventDefault()
    const url = editandoId ? `http://localhost:5000/api/perfiles/${editandoId}` : 'http://localhost:5000/api/perfiles'
    const method = editandoId ? 'PUT' : 'POST'
    
    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(nuevoUsuario)
    })
    cerrarFormulario()
    fetchData()
  }

  const stats = {
    total: usuarios.length,
    activos: usuarios.filter(u => u.estado === 'Activo').length,
    inactivos: usuarios.filter(u => u.estado === 'Inactivo').length
  };

  const prepararEdicion = (u) => {
    setNuevoUsuario({ ...u })
    setEditandoId(u.id)
    setMostrarForm(true)
  }

  const cerrarFormulario = () => {
    setMostrarForm(false)
    setEditandoId(null)
    setNuevoUsuario({ id_visual: '', nombre: '', email: '', rol: 'Usuario', biografia: '' })
  }

  const abrirDetalle = (u) => {
    setUsuarioSeleccionado(u)
    fetchTareasUsuario(u.id)
  }

  const usuariosFiltrados = usuarios.filter(u => {
    const coincideBusqueda = 
      u.nombre?.toLowerCase().includes(busqueda.toLowerCase()) || 
      u.email?.toLowerCase().includes(busqueda.toLowerCase()) ||
      u.id_visual?.toLowerCase().includes(busqueda.toLowerCase());
    
    // Lógica de filtro por estado
    const coincideEstado = filtroEstado ? u.estado === filtroEstado : true;
    
    return coincideBusqueda && coincideEstado;
  });

  const getCardStyle = (color, isActive) => ({
    background: isActive ? '#2d3748' : '#1e293b',
    padding: '15px',
    borderRadius: '12px',
    borderLeft: `4px solid ${color}`,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    transform: isActive ? 'scale(1.02)' : 'scale(1)',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center'
  });
  // --- SUB-VISTA: DETALLE DEL USUARIO ---
  const DetalleUsuario = ({ user, alCerrar }) => (
    <div className="animation-slide" style={{ background: '#1e293b', padding: '30px', borderRadius: '15px', border: '1px solid #334155' }}>
      <button onClick={alCerrar} className="btn-secondary" style={{ marginBottom: '20px' }}>← Volver</button>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', marginBottom: '20px' }}>
            {/* AQUÍ EL CAMBIO EN DETALLE */}
            <div style={{ width: '70px', height: '70px', borderRadius: '50%', overflow: 'hidden' }}>
              {user.avatar_url ? (
                <img src={user.avatar_url} alt={user.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
              ) : (
                <div style={{ width: '100%', height: '100%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', color: 'white', fontWeight: 'bold' }}>
                  {user.nombre?.charAt(0)}
                </div>
              )}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h2 style={{ color: 'white', margin: 0 }}>{user.nombre}</h2>
                <span style={{ color: '#475569', fontSize: '0.9rem', fontWeight: 'bold' }}>#{user.id_visual}</span>
              </div>
              <p style={{ color: '#3b82f6', margin: 0 }}>{user.email}</p>
            </div>
          </div>
          
          <h4 style={{ color: 'white', marginBottom: '15px' }}>Tareas Asignadas ({tareasUsuario.length})</h4>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {tareasUsuario.length === 0 ? <p style={{color: '#475569'}}>No hay tareas pendientes.</p> : 
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
          <h4 style={{ color: '#64748b', marginBottom: '15px' }}>Perfil de Colaborador</h4>
          <p style={{ color: '#cbd5e1', fontSize: '0.9rem' }}><strong>Rol:</strong> {user.rol}</p>
          <div style={{ marginTop: '15px' }}>
            <label style={{ color: '#475569', fontSize: '0.75rem', display: 'block', marginBottom: '5px' }}>BIO / NOTAS</label>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.5', whiteSpace: 'pre-wrap' }}>{user.biografia || "Sin descripción de perfil."}</p>
          </div>
          <div style={{ height: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b', borderRadius: '8px', marginTop: '20px', border: '1px dashed #334155' }}>
            <span style={{ color: '#475569', textAlign: 'center', padding: '10px', fontSize: '0.8rem' }}>[ Gráfico de Productividad ]</span>
          </div>
        </div>
      </div>
    </div>
  )

  return (
        <div className="dashboard-content">
        {/* 1. DASHBOARD DE ESTADÍSTICAS Y FILTROS */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '15px', marginBottom: '25px' }}>
          <div 
            style={getCardStyle('#3b82f6', filtroEstado === null)}
            onClick={() => setFiltroEstado(null)}
          >
            <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold' }}>TOTAL</span>
            <h2 style={{ margin: '5px 0 0 0', color: 'white' }}>{stats.total}</h2>
          </div>

          <div 
            style={getCardStyle('#10b981', filtroEstado === 'Activo')}
            onClick={() => setFiltroEstado(filtroEstado === 'Activo' ? null : 'Activo')}
          >
            <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold' }}>ACTIVOS</span>
            <h2 style={{ margin: '5px 0 0 0', color: '#10b981' }}>{stats.activos}</h2>
          </div>

          <div 
            style={getCardStyle('#ef4444', filtroEstado === 'Inactivo')}
            onClick={() => setFiltroEstado(filtroEstado === 'Inactivo' ? null : 'Inactivo')}
          >
            <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold' }}>INACTIVOS</span>
            <h2 style={{ margin: '5px 0 0 0', color: '#ef4444' }}>{stats.inactivos}</h2>
          </div>
        </div>

        {/* 2. VISTA DE DETALLE O GESTIÓN PRINCIPAL */}
        {usuarioSeleccionado ? (
          <DetalleUsuario user={usuarioSeleccionado} alCerrar={() => setUsuarioSeleccionado(null)} />
        ) : (
          <>
        {/* BARRA DE BÚSQUEDA Y BOTÓN NUEVO */}
        <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
          <input 
            type="text" 
            placeholder="🔍 Buscar por nombre, email o ID visual..." 
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
              <h3 style={{ color: 'white', marginBottom: '20px' }}>{editandoId ? '✏️ Editar Usuario' : '👤 Registrar Nuevo Colaborador'}</h3>
              <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '0.8fr 1.2fr 1.2fr', gap: '15px' }}>
                  <input type="text" placeholder="ID Visual (EMP-01)" value={nuevoUsuario.id_visual} onChange={e => setNuevoUsuario({...nuevoUsuario, id_visual: e.target.value})} style={{ padding: '10px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #334155' }} />
                  <input type="text" placeholder="Nombre Completo" value={nuevoUsuario.nombre} onChange={e => setNuevoUsuario({...nuevoUsuario, nombre: e.target.value})} style={{ padding: '10px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #334155' }} />
                  <input type="email" placeholder="Correo Electrónico" value={nuevoUsuario.email} onChange={e => setNuevoUsuario({...nuevoUsuario, email: e.target.value})} style={{ padding: '10px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #334155' }} />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '15px' }}>
                  <textarea 
                    placeholder="Biografía, habilidades o notas del colaborador..." 
                    value={nuevoUsuario.biografia} 
                    onChange={e => setNuevoUsuario({...nuevoUsuario, biografia: e.target.value})} 
                    rows="6"
                    style={{ padding: '12px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #334155', resize: 'none' }} 
                  />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                    <label style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Rol del Sistema</label>
                    <select value={nuevoUsuario.rol} onChange={e => setNuevoUsuario({...nuevoUsuario, rol: e.target.value})} style={{ padding: '10px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #334155' }}>
                      <option value="Usuario">Usuario (Empleado)</option>
                      <option value="Admin">Administrador</option>
                    </select>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn-save" style={{ padding: '10px 25px' }}>{editandoId ? 'Actualizar' : 'Crear Usuario'}</button>
                  <button type="button" className="btn-secondary" onClick={cerrarFormulario}>Cancelar</button>
                </div>
              </form>
            </section>
          )}

          {/* 4. LISTADO DE USUARIOS CORREGIDO */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {loading ? <p>Cargando...</p> : usuariosFiltrados.map(u => (
              <div key={u.id} className="proyecto-card" onClick={() => abrirDetalle(u)} style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '15px', position: 'relative' }}>
                
                {/* Indicador de Estado */}
                <div style={{ position: 'absolute', top: '10px', left: '15px', display: 'flex', alignItems: 'center', gap: '5px' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: u.estado === 'Activo' ? '#10b981' : '#64748b' }}></div>
                  <span style={{ fontSize: '0.65rem', color: '#94a3b8' }}>{u.estado || 'Desconocido'}</span>
                </div>

                <span style={{ position: 'absolute', top: '10px', right: '15px', fontSize: '0.65rem', color: '#475569', fontWeight: 'bold', background: '#0f172a', padding: '2px 8px', borderRadius: '10px' }}>
                  #{u.id_visual || 'S/ID'}
                </span>

                <div style={{ width: '50px', height: '50px', borderRadius: '50%', overflow: 'hidden', marginTop: '15px' }}>
                  {u.avatar_url ? (
                    <img src={u.avatar_url} alt={u.nombre} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <div style={{ width: '100%', height: '100%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: '1.2rem' }}>
                      {u.nombre?.charAt(0)}
                    </div>
                  )}
                </div>

                <div style={{ flex: 1, marginTop: '15px' }}>
                  <h3 style={{ color: '#f8fafc', margin: 0, fontSize: '1rem' }}>{u.nombre}</h3>
                  <p style={{ color: '#64748b', fontSize: '0.75rem', margin: 0 }}>{u.email}</p>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '5px', marginTop: '15px' }}>
                  <span className={`badge ${u.rol === 'Admin' ? 'urgente' : 'baja'}`} style={{ fontSize: '0.6rem' }}>{u.rol}</span>
                  <button onClick={(e) => { e.stopPropagation(); prepararEdicion(u); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem' }}>✏️</button>
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