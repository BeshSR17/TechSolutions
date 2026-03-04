import React, { useState, useEffect } from 'react'

const ProyectosView = () => {
  // --- ESTADOS ---
  const [proyectos, setProyectos] = useState([])
  const [clientes, setClientes] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  
  // NUEVO: Estado para evitar envíos múltiples
  const [enviando, setEnviando] = useState(false)

  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState(null) 

  const [nuevoProyecto, setNuevoProyecto] = useState({
    cliente_id: '',
    nombre_proyecto: '',
    descripcion: '',
    fecha_inicio: '',
    fecha_fin: '',
    estado: 'Planificación'
  })

  // --- CARGA DE DATOS ---
  const fetchData = async () => {
    try {
      setLoading(true)
      const [resProy, resCli] = await Promise.all([
        fetch('http://localhost:5000/api/proyectos'),
        fetch('http://localhost:5000/api/clientes')
      ])
      const dataProy = await resProy.json()
      const dataCli = await resCli.json()
      
      setProyectos(dataProy)
      setClientes(dataCli)
    } catch (error) {
      console.error("Error cargando datos:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // --- LÓGICA DE FILTRADO ---
  const proyectosFiltrados = proyectos.filter(p => {
    const term = busqueda.toLowerCase();
    const cumpleTexto = (
      p.nombre_proyecto?.toLowerCase().includes(term) ||
      p.descripcion?.toLowerCase().includes(term) ||
      p.clientes?.nombre_contacto?.toLowerCase().includes(term) ||
      p.clientes?.empresa?.toLowerCase().includes(term)
    );
    const normalizar = (texto) => 
      texto?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";
    const cumpleEstado = filtroEstado 
      ? normalizar(p.estado).includes(normalizar(filtroEstado)) 
      : true;
    return cumpleTexto && cumpleEstado;
  });

  // --- ESTADÍSTICAS ---
  const stats = {
    total: proyectos.length,
    planificacion: proyectos.filter(p => 
      p.estado?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") === 'planificacion'
    ).length,
    desarrollo: proyectos.filter(p => p.estado?.toLowerCase().includes('progreso')).length,
    finalizados: proyectos.filter(p => p.estado?.toLowerCase().includes('finalizado')).length
  }

  // --- LÓGICA CRUD ---
  const handleGuardar = async (e) => {
    e.preventDefault()

    // 1. Validaciones de UI
    if (!nuevoProyecto.cliente_id) return alert("⚠️ Seleccione un cliente.")
    if (!nuevoProyecto.nombre_proyecto.trim()) return alert("⚠️ Nombre obligatorio.")
    if (!nuevoProyecto.fecha_inicio) return alert("⚠️ Fecha inicio obligatoria.")

    // 2. BLOQUEO: Si ya se está enviando, no hacer nada
    if (enviando) return;

    const url = editandoId ? `http://localhost:5000/api/proyectos/${editandoId}` : 'http://localhost:5000/api/proyectos'
    const metodo = editandoId ? 'PUT' : 'POST'

    try {
      setEnviando(true) // Activamos bloqueo

      const response = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevoProyecto)
      })

      if (response.ok) {
        // RESET INMEDIATO: Cerramos y limpiamos antes de cualquier alerta
        cerrarFormulario()
        await fetchData()
        // Opcional: alert(editandoId ? "✅ Actualizado" : "✅ Creado")
      } else {
        alert("❌ Error al guardar el proyecto")
      }
    } catch (error) { 
      console.error(error)
      alert("❌ Error de conexión")
    } finally {
      setEnviando(false) // Desbloqueamos el botón
    }
  }

  const handleEliminar = async (id) => {
    if (window.confirm("¿Eliminar proyecto?")) {
      try {
        const response = await fetch(`http://localhost:5000/api/proyectos/${id}`, { method: 'DELETE' })
        if (response.ok) {
          setProyectos(prev => prev.filter(p => p.id !== id))
        }
      } catch (error) { console.error(error) }
    }
  }

  const prepararEdicion = (p) => {
    setNuevoProyecto({
      cliente_id: p.cliente_id,
      nombre_proyecto: p.nombre_proyecto,
      descripcion: p.descripcion,
      fecha_inicio: p.fecha_inicio,
      fecha_fin: p.fecha_fin,
      estado: p.estado
    })
    setEditandoId(p.id)
    setMostrarForm(true)
  }

  const cerrarFormulario = () => {
    setMostrarForm(false)
    setEditandoId(null)
    setEnviando(false)
    setNuevoProyecto({ 
      cliente_id: '', 
      nombre_proyecto: '', 
      descripcion: '', 
      fecha_inicio: '', 
      fecha_fin: '', 
      estado: 'Planificación' 
    })
  }

  // --- ESTILO DE TARJETA ---
  const getStatStyle = (color, isActive) => ({
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
    borderTop: isActive ? '1px solid #334155' : '1px solid transparent',
    borderRight: isActive ? '1px solid #334155' : '1px solid transparent',
    borderBottom: isActive ? '1px solid #334155' : '1px solid transparent'
  });

  return (
    <div className="dashboard-content">
      {/* 1. DASHBOARD */}
      {/* 1. DASHBOARD */}
<div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
  
  {/* Botón TOTALES: Siempre limpia el filtro */}
  <div 
    style={getStatStyle('#3b82f6', filtroEstado === null)} 
    onClick={() => setFiltroEstado(null)}
  >
    <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold' }}>TOTALES</span>
    <h2 style={{ margin: '2px 0 0 0', fontSize: '1.4rem', color: 'white' }}>{stats.total}</h2>
  </div>

  {/* Botón PLANIFICACIÓN */}
  <div 
    style={getStatStyle('#8b5cf6', filtroEstado === 'Planificación')} 
    onClick={() => setFiltroEstado(filtroEstado === 'Planificación' ? null : 'Planificación')}
  >
    <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold' }}>PLANIFICACIÓN</span>
    <h2 style={{ margin: '2px 0 0 0', fontSize: '1.4rem', color: '#8b5cf6' }}>{stats.planificacion}</h2>
  </div>

  {/* Botón EN PROGRESO */}
  <div 
    style={getStatStyle('#f59e0b', filtroEstado === 'En Progreso')} 
    onClick={() => setFiltroEstado(filtroEstado === 'En Progreso' ? null : 'En Progreso')}
  >
    <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold' }}>EN PROGRESO</span>
    <h2 style={{ margin: '2px 0 0 0', fontSize: '1.4rem', color: '#f59e0b' }}>{stats.desarrollo}</h2>
  </div>

  {/* Botón FINALIZADOS */}
  <div 
    style={getStatStyle('#10b981', filtroEstado === 'Finalizado')} 
    onClick={() => setFiltroEstado(filtroEstado === 'Finalizado' ? null : 'Finalizado')}
  >
    <span style={{ color: '#94a3b8', fontSize: '0.7rem', fontWeight: 'bold' }}>FINALIZADOS</span>
    <h2 style={{ margin: '2px 0 0 0', fontSize: '1.4rem', color: '#10b981' }}>{stats.finalizados}</h2>
  </div>
</div>

      {/* 2. FILTROS */}
      <div style={{ display: 'flex', gap: '15px', marginBottom: '25px', flexWrap: 'wrap' }}>
        <input 
          type="text" 
          placeholder="🔍 Buscar proyecto..." 
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#1e293b', color: 'white', border: '1px solid #334155' }}
        />
        <button className="btn-save" onClick={() => mostrarForm ? cerrarFormulario() : setMostrarForm(true)}>
          {mostrarForm ? 'Cerrar' : '+ Nuevo Proyecto'}
        </button>
      </div>

      {/* 3. FORMULARIO */}
      {mostrarForm && (
        <section className="form-section animation-slide" style={{ marginBottom: '25px' }}>
          <h3>{editandoId ? '✏️ Editar Proyecto' : '➕ Registrar Proyecto'}</h3>
          <form className="cliente-form" onSubmit={handleGuardar}>
            <select value={nuevoProyecto.cliente_id} onChange={e => setNuevoProyecto({...nuevoProyecto, cliente_id: e.target.value})}>
              <option value="">-- Seleccionar Cliente --</option>
              {clientes.map(c => (
                <option key={c.id} value={c.id}>{c.nombre_contacto} ({c.empresa})</option>
              ))}
            </select>
            <input type="text" placeholder="Nombre del Proyecto" value={nuevoProyecto.nombre_proyecto} onChange={e => setNuevoProyecto({...nuevoProyecto, nombre_proyecto: e.target.value})} />
            <textarea placeholder="Descripción..." value={nuevoProyecto.descripcion} onChange={e => setNuevoProyecto({...nuevoProyecto, descripcion: e.target.value})} style={{ gridColumn: 'span 2' }} />
            <input type="date" value={nuevoProyecto.fecha_inicio} onChange={e => setNuevoProyecto({...nuevoProyecto, fecha_inicio: e.target.value})} />
            <input type="date" value={nuevoProyecto.fecha_fin} onChange={e => setNuevoProyecto({...nuevoProyecto, fecha_fin: e.target.value})} />
            <select value={nuevoProyecto.estado} onChange={e => setNuevoProyecto({...nuevoProyecto, estado: e.target.value})}>
              <option value="Planificación">Planificación</option>
              <option value="En Progreso">En Progreso</option>
              <option value="Finalizado">Finalizado</option>
            </select>
            <div style={{ display: 'flex', gap: '10px', gridColumn: 'span 2' }}>
              <button 
                type="submit" 
                className="btn-save" 
                disabled={enviando}
                style={{ opacity: enviando ? 0.7 : 1, cursor: enviando ? 'not-allowed' : 'pointer' }}
              >
                {enviando ? 'Guardando...' : (editandoId ? 'Actualizar' : 'Crear')}
              </button>
              <button type="button" className="btn-secondary" onClick={cerrarFormulario} disabled={enviando}>Cancelar</button>
            </div>
          </form>
        </section>
      )}

      {/* 4. LISTADO */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
        {loading ? <p>Cargando...</p> : proyectosFiltrados.map(p => (
           <div key={p.id} className="proyecto-card" style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155' }}>
              {/* Contenido de la card igual a tu diseño... */}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 'bold' }}>👤 {p.clientes?.nombre_contacto}</span><br/>
                  <small style={{ color: '#64748b' }}>🏢 {p.clientes?.empresa}</small>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button onClick={() => prepararEdicion(p)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✏️</button>
                  <button onClick={() => handleEliminar(p.id)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                </div>
              </div>
              <h3 style={{ color: '#f8fafc', margin: '15px 0 5px 0' }}>{p.nombre_proyecto}</h3>
              <p style={{ fontSize: '0.85rem', color: '#94a3b8', minHeight: '40px' }}>{p.descripcion}</p>
              <div style={{ margin: '15px 0' }}>
                <span className={`badge ${p.estado?.replace(/\s+/g, '-').toLowerCase()}`}>{p.estado}</span>
              </div>
              <div style={{ borderTop: '1px solid #334155', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#64748b' }}>
                <span>🚀 {p.fecha_inicio}</span>
                <span>🏁 {p.fecha_fin || 'TBD'}</span>
              </div>
           </div>
        ))}
      </div>
    </div>
  )
}

export default ProyectosView