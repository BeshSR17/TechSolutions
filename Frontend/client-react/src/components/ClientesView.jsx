import React, { useState, useEffect } from 'react'

const ClientesView = () => {
  // --- ESTADOS ---
  const [clientes, setClientes] = useState([])
  const [expandido, setExpandido] = useState(null)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [loading, setLoading] = useState(true)
  const [editandoId, setEditandoId] = useState(null)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState('Todos');

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

  const cerrarFormulario = () => {
    setMostrarForm(false);
    setEditandoId(null);
    setNuevoCliente({ empresa: '', nombre_contacto: '', email: '', telefono: '', estado: 'Activo' });
  };

  const handleToggleFiltro = (estado) => {
    setFiltroEstado(prev => prev === estado ? 'Todos' : estado);
  };

  const clientesFiltrados = clientes.filter(c => {
    const coincideBusqueda = c.empresa.toLowerCase().includes(busqueda.toLowerCase()) ||
                             c.nombre_contacto.toLowerCase().includes(busqueda.toLowerCase());
    const coincideEstado = filtroEstado === 'Todos' || c.estado === filtroEstado;
    return coincideBusqueda && coincideEstado;
  });

  // --- ESTADÍSTICAS (Mini Dashboard) ---
  const stats = {
    total: clientes.length,
    activos: clientes.filter(c => c.estado === 'Activo').length,
    inactivos: clientes.filter(c => c.estado === 'Inactivo').length,
    sinProyectos: clientes.filter(c => !c.proyectos || c.proyectos.length === 0).length
  };

  return (
    <div className="dashboard-content">
      
      {/* 1. MINI DASHBOARD */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
        gap: '12px', 
        marginBottom: '20px' 
      }}>
        {[
          { label: 'TOTAL', value: stats.total, color: '#3b82f6' },
          { label: 'ACTIVOS', value: stats.activos, color: '#10b981' },
          { label: 'INACTIVOS', value: stats.inactivos, color: '#ef4444' },
          { label: 'SIN PROYECTOS', value: stats.sinProyectos, color: '#f59e0b' }
        ].map((item, idx) => (
          <div key={idx} style={{ 
            background: '#1e293b', 
            padding: '12px 15px', 
            borderRadius: '10px', 
            borderLeft: `3px solid ${item.color}`,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center'
          }}>
            <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold', letterSpacing: '0.5px' }}>{item.label}</span>
            <h2 style={{ margin: '2px 0 0 0', fontSize: '1.4rem', color: 'white' }}>{item.value}</h2>
          </div>
        ))}
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

          <div style={{ display: 'flex', gap: '8px' }}>
            <button 
              onClick={() => handleToggleFiltro('Activo')}
              style={{
                width: '38px', height: '38px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.3s',
                background: filtroEstado === 'Activo' ? '#10b981' : '#1e293b',
                color: filtroEstado === 'Activo' ? 'white' : '#10b981',
                boxShadow: filtroEstado === 'Activo' ? '0 0 12px rgba(16, 185, 129, 0.4)' : 'none',
                border: '1px solid #10b981'
              }}
            >A</button>
            <button 
              onClick={() => handleToggleFiltro('Inactivo')}
              style={{
                width: '38px', height: '38px', borderRadius: '8px', cursor: 'pointer', fontWeight: 'bold', transition: 'all 0.3s',
                background: filtroEstado === 'Inactivo' ? '#ef4444' : '#1e293b',
                color: filtroEstado === 'Inactivo' ? 'white' : '#ef4444',
                boxShadow: filtroEstado === 'Inactivo' ? '0 0 12px rgba(239, 68, 68, 0.4)' : 'none',
                border: '1px solid #ef4444'
              }}
            >I</button>
          </div>

          <button className="btn-save" onClick={() => mostrarForm ? cerrarFormulario() : setMostrarForm(true)}>
            {mostrarForm ? 'Cerrar' : '+ Nuevo Cliente'}
          </button>
        </div>
      </div>

      {/* 3. FORMULARIO */}
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

      {/* 4. TABLA */}
      <section className="data-section">
        {loading ? <p>Cargando información corporativa...</p> : (
          <table className="empresa-table">
            <thead>
              <tr>
                <th>Empresa</th><th>Contacto</th><th>Teléfono</th><th>Email</th><th>Estado</th><th>Acciones</th>
              </tr>
            </thead>
            <tbody>
              {clientesFiltrados.length > 0 ? (
                clientesFiltrados.map((c) => (
                  <React.Fragment key={c.id}>
                    <tr onClick={() => setExpandido(expandido === c.id ? null : c.id)} style={{ cursor: 'pointer' }}>
                      <td><strong>{c.empresa}</strong></td>
                      <td>{c.nombre_contacto}</td>
                      <td>{c.telefono || 'Sin registro'}</td>
                      <td>{c.email}</td>
                      <td><span className={`badge ${c.estado}`}>{c.estado}</span></td>
                      <td>
                        <button className="btn-edit" onClick={(e) => { e.stopPropagation(); setNuevoCliente(c); setEditandoId(c.id); setMostrarForm(true); }}>✏️</button>
                        <button className="btn-delete" onClick={(e) => { e.stopPropagation(); handleEliminar(c.id, c.empresa); }}>🗑️</button>
                      </td>
                    </tr>
                    {expandido === c.id && (
                      <tr className="row-detalles">
                        <td colSpan="6">
                          <div className="detalles-container" style={{background: '#1e293b', padding: '15px', borderRadius: '8px', margin: '5px 10px'}}>
                            <h4 style={{color: '#3b82f6', marginBottom: '8px', fontSize: '0.9rem'}}>Proyectos vinculados</h4>
                            {c.proyectos && c.proyectos.length > 0 ? (
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
              ) : (
                <tr><td colSpan="6" style={{textAlign: 'center', padding: '30px', color: '#94a3b8'}}>No se encontraron resultados.</td></tr>
              )}
            </tbody>
          </table>
        )}
      </section>
    </div>
  )
}

export default ClientesView