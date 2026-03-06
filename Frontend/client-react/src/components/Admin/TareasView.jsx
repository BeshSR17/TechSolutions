import React, { useState, useEffect } from 'react'

const TareasView = () => {
  // --- ESTADOS ---
  const [tareas, setTareas] = useState([])
  const [proyectos, setProyectos] = useState([])
  const [usuarios, setUsuarios] = useState([])
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null) 
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState(null)
  const [filtroPrioridad, setFiltroPrioridad] = useState(null);

  const [nuevaTarea, setNuevaTarea] = useState({
    proyecto_id: '',
    empleado_id: '',
    titulo: '',
    instrucciones: '',
    prioridad: 'Media',
    estado: 'Pendiente'
  })

  // --- CARGA DE DATOS ---
  const fetchData = async () => {
    try {
      setLoading(true)
      const [resT, resP, resU] = await Promise.all([
        fetch('http://localhost:5000/api/tareas'),
        fetch('http://localhost:5000/api/proyectos'),
        fetch('http://localhost:5000/api/usuarios')
      ])

      if (!resT.ok || !resP.ok || !resU.ok) throw new Error("Error en la red")

      setTareas(await resT.json())
      setProyectos(await resP.json())
      setUsuarios(await resU.json())
    } catch (error) {
      console.error("Detalle del error:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // --- LÓGICA DE FILTRADO ---
  const tareasFiltradas = tareas.filter(t => {
  const term = busqueda.toLowerCase();
  const cumpleTexto = (
    t.titulo?.toLowerCase().includes(term) ||
    t.proyectos?.nombre_proyecto?.toLowerCase().includes(term) ||
    t.perfiles?.nombre?.toLowerCase().includes(term) ||
    t.proyectos?.clientes?.empresa?.toLowerCase().includes(term)
  );
  
  const normalizar = (texto) => 
    texto?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";

  const cumpleEstado = filtroEstado 
    ? normalizar(t.estado).includes(normalizar(filtroEstado)) 
    : true;

  // NUEVO: Filtro de prioridad
  const cumplePrioridad = filtroPrioridad 
    ? t.prioridad === filtroPrioridad 
    : true;

  return cumpleTexto && cumpleEstado && cumplePrioridad;
});

  // --- ESTADÍSTICAS ---
  const stats = {
    total: tareas.length,
    pendientes: tareas.filter(t => t.estado === 'Pendiente').length,
    enProgreso: tareas.filter(t => t.estado === 'En Progreso').length,
    completadas: tareas.filter(t => t.estado === 'Completada').length
  }

  // --- LÓGICA CRUD ---
  const handleGuardar = async (e) => {
    e.preventDefault()
    if (!nuevaTarea.proyecto_id || !nuevaTarea.titulo || !nuevaTarea.empleado_id) {
      return alert("⚠️ Proyecto, Título y Responsable son obligatorios.")
    }
    if (enviando) return

    const url = editandoId ? `http://localhost:5000/api/tareas/${editandoId}` : 'http://localhost:5000/api/tareas'
    const metodo = editandoId ? 'PUT' : 'POST'

    try {
      setEnviando(true)
      const response = await fetch(url, {
        method: metodo,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(nuevaTarea)
      })

      if (response.ok) {
        cerrarFormulario()
        await fetchData()
      } else {
        alert("❌ Error al guardar la tarea")
      }
    } catch (error) { 
      console.error(error)
    } finally {
      setEnviando(false)
    }
  }

  const handleEliminar = async (id) => {
    if (window.confirm("¿Eliminar esta tarea?")) {
      try {
        const response = await fetch(`http://localhost:5000/api/tareas/${id}`, { method: 'DELETE' })
        if (response.ok) fetchData()
      } catch (error) { console.error(error) }
    }
  }

  const prepararEdicion = (t) => {
    setNuevaTarea({
      proyecto_id: t.proyecto_id,
      empleado_id: t.empleado_id,
      titulo: t.titulo,
      instrucciones: t.instrucciones,
      prioridad: t.prioridad,
      estado: t.estado
    })
    setEditandoId(t.id)
    setMostrarForm(true)
  }

  const cerrarFormulario = () => {
    setMostrarForm(false)
    setEditandoId(null)
    setNuevaTarea({ proyecto_id: '', empleado_id: '', titulo: '', instrucciones: '', prioridad: 'Media', estado: 'Pendiente' })
  }

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
    border: isActive ? '1px solid #334155' : '1px solid transparent'
  })

  // --- COMPONENTE SUB-VISTA: DETALLE ---
  const DetalleTarea = ({ tarea, alCerrar }) => {
    return (
      <div className="animation-slide" style={{ background: '#1e293b', padding: '30px', borderRadius: '15px', border: '1px solid #334155' }}>
        <button onClick={alCerrar} className="btn-secondary" style={{ marginBottom: '20px' }}>
          ← Volver al listado
        </button>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
          <div>
            <span style={{ color: '#3b82f6', fontWeight: 'bold', fontSize: '0.8rem' }}>
              {tarea.proyectos?.clientes?.empresa?.toUpperCase()}
            </span>
            <h2 style={{ color: 'white', marginTop: '5px' }}>{tarea.titulo}</h2>
            <p style={{ color: '#94a3b8', lineHeight: '1.6' }}>{tarea.instrucciones || "Sin instrucciones detalladas."}</p>
            
            <div style={{ marginTop: '20px', display: 'flex', gap: '10px' }}>
              <span className={`badge ${tarea.prioridad?.toLowerCase()}`}>{tarea.prioridad}</span>
              <span className={`badge ${tarea.estado?.replace(/\s+/g, '-').toLowerCase()}`}>{tarea.estado}</span>
            </div>
          </div>

          <div style={{ background: '#0f172a', borderRadius: '12px', padding: '20px', border: '1px dashed #334155' }}>
            <h4 style={{ color: '#64748b', marginBottom: '15px' }}>Información de Seguimiento</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', color: '#cbd5e1', fontSize: '0.9rem' }}>
               <p><strong>Proyecto:</strong> {tarea.proyectos?.nombre_proyecto}</p>
               <p><strong>Responsable:</strong> {tarea.perfiles?.nombre}</p>
               <div style={{ height: '100px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b', borderRadius: '8px', marginTop: '10px' }}>
                  <span style={{ color: '#475569' }}>[ Gráfico de Avance ]</span>
               </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // --- RENDER PRINCIPAL ---
  return (
    <div className="dashboard-content">
      {tareaSeleccionada ? (
        <DetalleTarea tarea={tareaSeleccionada} alCerrar={() => setTareaSeleccionada(null)} />
      ) : (
        <>
          {/* 1. STATS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <div style={getStatStyle('#3b82f6', filtroEstado === null)} onClick={() => setFiltroEstado(null)}>
              <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>TOTAL TAREAS</span>
              <h2 style={{ margin: '0', color: 'white' }}>{stats.total}</h2>
            </div>
            <div style={getStatStyle('#f59e0b', filtroEstado === 'Pendiente')} onClick={() => setFiltroEstado('Pendiente')}>
              <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>PENDIENTES</span>
              <h2 style={{ margin: '0', color: '#f59e0b' }}>{stats.pendientes}</h2>
            </div>
            <div style={getStatStyle('#3b82f6', filtroEstado === 'En Progreso')} onClick={() => setFiltroEstado('En Progreso')}>
              <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>EN PROGRESO</span>
              <h2 style={{ margin: '0', color: '#3b82f6' }}>{stats.enProgreso}</h2>
            </div>
            <div style={getStatStyle('#10b981', filtroEstado === 'Completada')} onClick={() => setFiltroEstado('Completada')}>
              <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>COMPLETADAS</span>
              <h2 style={{ margin: '0', color: '#10b981' }}>{stats.completadas}</h2>
            </div>
          </div>

          {/* FILTROS DE PRIORIDAD */}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', flexWrap: 'wrap' }}>
            <span style={{ color: '#94a3b8', fontSize: '0.8rem', alignSelf: 'center', marginRight: '5px' }}>Prioridad:</span>
            {['Urgente', 'Alta', 'Media', 'Baja'].map(prio => (
              <button
                key={prio}
                onClick={() => setFiltroPrioridad(filtroPrioridad === prio ? null : prio)}
                style={{
                  padding: '6px 12px',
                  borderRadius: '20px',
                  fontSize: '0.75rem',
                  cursor: 'pointer',
                  border: '1px solid #334155',
                  background: filtroPrioridad === prio ? '#3b82f6' : '#1e293b',
                  color: filtroPrioridad === prio ? 'white' : '#94a3b8',
                  transition: 'all 0.2s'
                }}
              >
                {prio}
              </button>
            ))}
            {filtroPrioridad && (
              <button 
                onClick={() => setFiltroPrioridad(null)}
                style={{ background: 'none', border: 'none', color: '#ef4444', fontSize: '0.75rem', cursor: 'pointer' }}
              >
                ✕ Limpiar
              </button>
            )}
          </div>

          {/* 2. BUSCADOR Y BOTÓN */}
          <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
            <input 
              type="text" 
              placeholder="🔍 Buscar por título, proyecto, cliente o responsable..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#1e293b', color: 'white', border: '1px solid #334155' }}
            />
            <button className="btn-save" onClick={() => setMostrarForm(!mostrarForm)}>
              {mostrarForm ? 'Cerrar' : '+ Nueva Tarea'}
            </button>
          </div>

          {/* 3. FORMULARIO */}
          {mostrarForm && (
            <section className="form-section animation-slide" style={{ marginBottom: '25px', background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
              <h3 style={{ color: 'white', marginBottom: '20px' }}>{editandoId ? '✏️ Editar Tarea' : '➕ Crear Tarea'}</h3>
              
              <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                
                {/* Fila Superior: Proyecto, Responsable y Título */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '15px' }}>
                  <select 
                    value={nuevaTarea.proyecto_id} 
                    onChange={e => setNuevaTarea({...nuevaTarea, proyecto_id: e.target.value})}
                    style={{ padding: '10px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #334155' }}
                  >
                    <option value="">-- Seleccionar Proyecto --</option>
                    {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre_proyecto}</option>)}
                  </select>

                  <select 
                    value={nuevaTarea.empleado_id} 
                    onChange={e => setNuevaTarea({...nuevaTarea, empleado_id: e.target.value})} 
                    required
                    style={{ padding: '10px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #334155' }}
                  >
                    <option value="">-- Asignar Responsable --</option>
                    {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
                  </select>

                  <input 
                    type="text" 
                    placeholder="Título de la tarea" 
                    value={nuevaTarea.titulo} 
                    onChange={e => setNuevaTarea({...nuevaTarea, titulo: e.target.value})} 
                    style={{ padding: '10px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #334155' }}
                  />
                </div>

                {/* Fila Central: Instrucciones (Izquierda) y Selectores (Derecha) */}
                <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '15px' }}>
                  
                  {/* Lado Izquierdo: Instrucciones */}
                  <textarea 
                    placeholder="Escribe aquí las instrucciones detalladas..." 
                    value={nuevaTarea.instrucciones} 
                    onChange={e => setNuevaTarea({...nuevaTarea, instrucciones: e.target.value})} 
                    rows="6"
                    style={{ 
                      padding: '12px',
                      borderRadius: '8px',
                      background: '#0f172a',
                      color: 'white',
                      border: '1px solid #334155',
                      resize: 'none',
                      fontSize: '0.9rem',
                      lineHeight: '1.5'
                    }} 
                  />

                  {/* Lado Derecho: Prioridad y Estado apilados */}
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ color: '#94a3b8', fontSize: '0.75rem', marginLeft: '5px' }}>Prioridad</label>
                      <select 
                        value={nuevaTarea.prioridad} 
                        onChange={e => setNuevaTarea({...nuevaTarea, prioridad: e.target.value})}
                        style={{ padding: '10px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #334155', height: '45px' }}
                      >
                        <option value="Baja">Baja</option>
                        <option value="Media">Media</option>
                        <option value="Alta">Alta</option>
                        <option value="Urgente">Urgente</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                      <label style={{ color: '#94a3b8', fontSize: '0.75rem', marginLeft: '5px' }}>Estado</label>
                      <select 
                        value={nuevaTarea.estado} 
                        onChange={e => setNuevaTarea({...nuevaTarea, estado: e.target.value})}
                        style={{ padding: '10px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #334155', height: '45px' }}
                      >
                        <option value="Pendiente">Pendiente</option>
                        <option value="En Progreso">En Progreso</option>
                        <option value="Completada">Completada</option>
                      </select>
                    </div>
                  </div>
                </div>

                {/* Fila Inferior: Botones de acción */}
                <div style={{ display: 'flex', gap: '10px', marginTop: '5px' }}>
                  <button type="submit" className="btn-save" style={{ padding: '10px 25px' }}>
                    {editandoId ? 'Actualizar Tarea' : 'Crear Tarea'}
                  </button>
                  <button type="button" className="btn-secondary" onClick={cerrarFormulario} style={{ padding: '10px 25px' }}>
                    Cancelar
                  </button>
                </div>
              </form>
            </section>
          )}

          {/* 4. LISTADO DE TAREAS */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {loading ? <p>Cargando...</p> : tareasFiltradas.map(t => (
              <div key={t.id} className="proyecto-card" onClick={() => setTareaSeleccionada(t)} style={{ background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155', cursor: 'pointer' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '0.7rem', color: '#3b82f6', fontWeight: 'bold' }}>
                    🏢 {t.proyectos?.clientes?.empresa || 'Sin Cliente'}
                  </span>
                  <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={(e) => { e.stopPropagation(); prepararEdicion(t); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✏️</button>
                      <button onClick={(e) => { e.stopPropagation(); handleEliminar(t.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                  </div>
                </div>
                <p style={{ margin: '0', fontSize: '0.65rem', color: '#94a3b8' }}>PROYECTO: {t.proyectos?.nombre_proyecto}</p>
                <h3 style={{ color: '#f8fafc', margin: '8px 0' }}>{t.titulo}</h3>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '15px' }}>
                  <div style={{ width: '22px', height: '22px', borderRadius: '50%', background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.6rem', color: 'white' }}>
                    {t.perfiles?.nombre?.charAt(0)}
                  </div>
                  <span style={{ fontSize: '0.8rem', color: '#cbd5e1' }}>{t.perfiles?.nombre}</span>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span className={`badge ${t.prioridad?.toLowerCase()}`}>{t.prioridad}</span>
                  <span className={`badge ${t.estado?.replace(/\s+/g, '-').toLowerCase()}`}>{t.estado}</span>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default TareasView