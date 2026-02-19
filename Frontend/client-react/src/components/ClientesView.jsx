import React, { useState, useEffect } from 'react'

const ClientesView = () => {
  // --- ESTADOS ---
  const [clientes, setClientes] = useState([])
  const [expandido, setExpandido] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editandoId, setEditandoId] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  
  // Cambiamos el valor inicial a null para que "TOTAL" sea el estado por defecto
  const [filtroEstado, setFiltroEstado] = useState(null);

  const [nuevoCliente, setNuevoCliente] = useState({
    empresa: '', nombre_contacto: '', email: '', telefono: '', estado: 'Activo'
  })

  // --- LÓGICA DE DATOS ---
  const fetchClientes = async () => {
    try {
      setLoading(true)
      const response = await fetch('http://localhost:5000/api/clientes')
      const data = await response.json()
      setClientes(data)
    } catch (error) { console.error("Error:", error) } finally { setLoading(false) }
  }

  useEffect(() => { fetchClientes() }, [])

  // --- LÓGICA DE FILTRADO ---
  const clientesFiltrados = clientes.filter(c => {
    const coincideBusqueda = 
      c.empresa.toLowerCase().includes(busqueda.toLowerCase()) ||
      c.nombre_contacto.toLowerCase().includes(busqueda.toLowerCase());
    
    let coincideEstado = true;
    if (filtroEstado === 'Activo' || filtroEstado === 'Inactivo') {
      coincideEstado = c.estado === filtroEstado;
    } else if (filtroEstado === 'Sin Proyectos') {
      coincideEstado = !c.proyectos || c.proyectos.length === 0;
    }

    return coincideBusqueda && coincideEstado;
  });

  // --- ESTADÍSTICAS ---
  const stats = {
    total: clientes.length,
    activos: clientes.filter(c => c.estado === 'Activo').length,
    inactivos: clientes.filter(c => c.estado === 'Inactivo').length,
    sinProyectos: clientes.filter(c => !c.proyectos || c.proyectos.length === 0).length
  };

  // --- HANDLERS ---
  const prepararEdicion = (c) => {
    setNuevoCliente({
      empresa: c.empresa,
      nombre_contacto: c.nombre_contacto,
      email: c.email,
      telefono: c.telefono || '',
      estado: c.estado
    });
    setEditandoId(c.id);
    setMostrarForm(true);
  };

  const cerrarFormulario = () => {
    setMostrarForm(false);
    setEditandoId(null);
    setNuevoCliente({ empresa: '', nombre_contacto: '', email: '', telefono: '', estado: 'Activo' });
  };

  const handleGuardarCliente = async (e) => {
    e.preventDefault();
    const url = editandoId ? `http://localhost:5000/api/clientes/${editandoId}` : 'http://localhost:5000/api/clientes';
    const metodo = editandoId ? 'PUT' : 'POST';
    
    try {
      const response = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoCliente)
      });
      if (response.ok) {
        alert(editandoId ? "✅ Cliente actualizado" : "✅ Cliente guardado");
        cerrarFormulario();
        fetchClientes(); 
      }
    } catch (error) { console.error(error); }
  };

  const handleEliminar = async (id, nombre) => {
    if (window.confirm(`¿Estás seguro de que deseas eliminar a ${nombre}?`)) {
      try {
        const response = await fetch(`http://localhost:5000/api/clientes/${id}`, { method: 'DELETE' });
        if (response.ok) {
          setClientes(clientes.filter(c => c.id !== id));
          alert("🗑️ Cliente eliminado");
        }
      } catch (error) { console.error(error); }
    }
  };

  // --- ESTILO DE TARJETA DINÁMICA ---
  const getCardStyle = (color, isActive) => ({
    background: isActive ? '#2d3748' : '#1e293b',
    padding: '12px 15px',
    borderRadius: '10px',
    borderLeft: `3px solid ${color}`,
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    transform: isActive ? 'scale(1.02)' : 'scale(1)',
    boxShadow: isActive ? `0 0 10px ${color}44` : 'none',
    borderTop: isActive ? '1px solid #334155' : 'none',
    borderRight: isActive ? '1px solid #334155' : 'none',
    borderBottom: isActive ? '1px solid #334155' : 'none'
  });

  return (
    <div className="dashboard-content">
      
      {/* 1. DASHBOARD FUNCIONAL (Compacto) */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div 
          style={getCardStyle('#3b82f6', filtroEstado === null)}
          onClick={() => setFiltroEstado(null)}
        >
          <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold' }}>TOTAL</span>
          <h2 style={{ margin: '2px 0 0 0', fontSize: '1.4rem', color: 'white' }}>{stats.total}</h2>
        </div>

        <div 
          style={getCardStyle('#10b981', filtroEstado === 'Activo')}
          onClick={() => setFiltroEstado(filtroEstado === 'Activo' ? null : 'Activo')}
        >
          <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold' }}>ACTIVOS</span>
          <h2 style={{ margin: '2px 0 0 0', fontSize: '1.4rem', color: '#10b981' }}>{stats.activos}</h2>
        </div>

        <div 
          style={getCardStyle('#ef4444', filtroEstado === 'Inactivo')}
          onClick={() => setFiltroEstado(filtroEstado === 'Inactivo' ? null : 'Inactivo')}
        >
          <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold' }}>INACTIVOS</span>
          <h2 style={{ margin: '2px 0 0 0', fontSize: '1.4rem', color: '#ef4444' }}>{stats.inactivos}</h2>
        </div>

        <div 
          style={getCardStyle('#f59e0b', filtroEstado === 'Sin Proyectos')}
          onClick={() => setFiltroEstado(filtroEstado === 'Sin Proyectos' ? null : 'Sin Proyectos')}
        >
          <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold' }}>SIN PROYECTOS</span>
          <h2 style={{ margin: '2px 0 0 0', fontSize: '1.4rem', color: '#f59e0b' }}>{stats.sinProyectos}</h2>
        </div>
      </div>

      {/* 2. CABECERA Y FILTROS */}
      <div className="header-acciones">
        <h1>Gestión de Clientes</h1>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <input 
            type="text" 
            placeholder="🔍 Buscar cliente..." 
            className="search-input"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
            style={{ padding: '10px 15px', borderRadius: '8px', border: '1px solid #334155', background: '#0f172a', color: 'white', width: '220px' }}
          />

          <button className="btn-save" onClick={() => mostrarForm ? cerrarFormulario() : setMostrarForm(true)}>
            {mostrarForm ? 'Cerrar' : '+ Nuevo Cliente'}
          </button>
        </div>
      </div>

      {/* 3. FORMULARIO (Se mantiene igual) */}
      {mostrarForm && (
        <section className="form-section animation-slide" style={{marginBottom: '25px'}}>
          <h3>{editandoId ? `✏️ Editando: ${nuevoCliente.empresa}` : '➕ Registrar Nuevo Cliente'}</h3>
          <form className="cliente-form" onSubmit={handleGuardarCliente}>
            <input type="text" placeholder="Empresa" required value={nuevoCliente.empresa} onChange={e => setNuevoCliente({...nuevoCliente, empresa: e.target.value})} />
            <input type="text" placeholder="Contacto" required value={nuevoCliente.nombre_contacto} onChange={e => setNuevoCliente({...nuevoCliente, nombre_contacto: e.target.value})} />
            <input type="email" placeholder="Email" required value={nuevoCliente.email} onChange={e => setNuevoCliente({...nuevoCliente, email: e.target.value})} />
            <input type="text" placeholder="Teléfono" value={nuevoCliente.telefono} onChange={e => setNuevoCliente({...nuevoCliente, telefono: e.target.value})} />
            <select value={nuevoCliente.estado} onChange={e => setNuevoCliente({...nuevoCliente, estado: e.target.value})} style={{padding: '10px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #334155'}}>
              <option value="Activo">Activo</option>
              <option value="Inactivo">Inactivo</option>
            </select>
            <div style={{display: 'flex', gap: '10px', marginTop: '10px'}}>
              <button type="submit" className="btn-save">{editandoId ? 'Actualizar Datos' : 'Registrar Cliente'}</button>
              <button type="button" className="btn-secondary" onClick={cerrarFormulario}>Cancelar</button>
            </div>
          </form>
        </section>
      )}

      {/* 4. TABLA (Se mantiene igual con clientesFiltrados) */}
      <section className="data-section">
        {loading ? <p>Cargando información corporativa...</p> : (
          <table className="empresa-table">
            <thead>
              <tr>
                <th>Empresa</th><th>Contacto</th><th>Teléfono</th><th>Email</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.length === 0 ? (
                <tr><td colSpan="6" style={{textAlign: 'center', padding: '20px', color: '#94a3b8'}}>No se encontraron clientes con este filtro.</td></tr>
              ) : (
                clientesFiltrados.map((c) => (
                  <React.Fragment key={c.id}>
                    <tr onClick={() => setExpandido(expandido === c.id ? null : c.id)} style={{ cursor: 'pointer' }}>
                      <td><strong>{c.empresa}</strong></td>
                      <td>{c.nombre_contacto}</td>
                      <td>{c.telefono || 'Sin registro'}</td>
                      <td>{c.email}</td>
                      <td><span className={`badge ${c.estado}`}>{c.estado}</span></td>
                      <td>
                        <button className="btn-edit" onClick={(e) => { e.stopPropagation(); prepararEdicion(c); }}>✏️</button>
                        <button className="btn-delete" onClick={(e) => { e.stopPropagation(); handleEliminar(c.id, c.empresa); }}>🗑️</button>
                      </td>
                    </tr>
                    {expandido === c.id && (
                      <tr className="row-detalles">
                        <td colSpan="6">
                          <div className="detalles-container" style={{background: '#1e293b', padding: '15px', borderRadius: '8px', margin: '5px 10px'}}>
                            <h4 style={{color: '#3b82f6', marginBottom: '8px', fontSize: '0.9rem'}}>Proyectos vinculados</h4>
                            {c.proyectos?.length > 0 ? (
                              <ul style={{listStyle: 'none', padding: 0, margin: 0}}>
                                {c.proyectos.map((p) => (
                                  <li key={p.id} style={{padding: '5px 0', borderBottom: '1px solid #334155', fontSize: '0.85rem'}}>
                                    <strong>{p.nombre_proyecto}</strong> — <small style={{color: '#94a3b8'}}>{p.estado}</small>
                                  </li>
                                ))}
                              </ul>
                            ) : (
                              <p style={{ color: '#94a3b8', fontStyle: 'italic', fontSize: '0.85rem' }}>⚠️ Sin proyectos asignados.</p>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

export default ClientesView