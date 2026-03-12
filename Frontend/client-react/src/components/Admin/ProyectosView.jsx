import React, { useState, useEffect } from 'react'
import { apiClient } from '../../apiClient'; // Importación vital para la seguridad

const ProyectosView = () => {
  // --- ESTADOS ---
  const [proyectos, setProyectos] = useState([])
  const [clientes, setClientes] = useState([])
  const [todasLasTareas, setTodasLasTareas] = useState([]) 
  const [loading, setLoading] = useState(true)
  const [mostrarForm, setMostrarForm] = useState(false)
  const [editandoId, setEditandoId] = useState(null)
  const [enviando, setEnviando] = useState(false)
  const [busqueda, setBusqueda] = useState('')
  const [filtroEstado, setFiltroEstado] = useState(null)
  const [proyectoSeleccionado, setProyectoSeleccionado] = useState(null)

  const [nuevoProyecto, setNuevoProyecto] = useState({
    cliente_id: '',
    nombre_proyecto: '',
    descripcion: '',
    fecha_inicio: '',
    fecha_fin: '',
    estado: 'Planificación'
  })

  // --- CARGA DE DATOS CON JWT ---
  const fetchData = async () => {
    try {
      setLoading(true);
      // Usamos apiClient para todas las llamadas paralelas
      const [resProy, resCli, resTareas] = await Promise.all([
        apiClient('/proyectos'),
        apiClient('/clientes'),
        apiClient('/tareas')
      ]);

      if (!resProy.ok || !resCli.ok || !resTareas.ok) {
        throw new Error("Error al obtener datos del servidor seguro");
      }

      setProyectos(await resProy.json());
      setClientes(await resCli.json());
      setTodasLasTareas(await resTareas.json());
    } catch (error) {
      console.error("Fallo en la carga de datos:", error);
    } finally { 
      setLoading(false); 
    }
  }

  useEffect(() => { fetchData() }, [])

  // --- LÓGICA DE FILTRADO ---
  const proyectosFiltrados = proyectos.filter(p => {
    const term = busqueda.toLowerCase();
    const cumpleTexto = (
      p.nombre_proyecto?.toLowerCase().includes(term) ||
      p.descripcion?.toLowerCase().includes(term) ||
      p.clientes?.empresa?.toLowerCase().includes(term)
    );
    const normalizar = (texto) => texto?.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "") || "";
    const cumpleEstado = filtroEstado ? normalizar(p.estado).includes(normalizar(filtroEstado)) : true;
    return cumpleTexto && cumpleEstado;
  });

  const stats = {
    total: proyectos.length,
    planificacion: proyectos.filter(p => p.estado === 'Planificación').length,
    desarrollo: proyectos.filter(p => p.estado === 'En Progreso').length,
    finalizados: proyectos.filter(p => p.estado === 'Finalizado').length
  }

  // --- CRUD SEGURO ---
  const handleGuardar = async (e) => {
    e.preventDefault()
    if (!nuevoProyecto.cliente_id || !nuevoProyecto.nombre_proyecto) return alert("⚠️ Datos incompletos")
    if (enviando) return
    
    const endpoint = editandoId ? `/proyectos/${editandoId}` : '/proyectos'
    try {
      setEnviando(true)
      const response = await apiClient(endpoint, {
        method: editandoId ? 'PUT' : 'POST',
        body: JSON.stringify(nuevoProyecto)
      })
      
      if (response.ok) {
        alert(editandoId ? "✅ Proyecto actualizado" : "✅ Proyecto creado");
        cerrarFormulario()
        fetchData()
      } else {
        alert("Error al procesar el proyecto");
      }
    } catch (error) { 
      console.error("Error en el guardado:", error) 
    } finally { 
      setEnviando(false) 
    }
  }

  const handleEliminar = async (id) => {
    if (window.confirm("¿Estás seguro de eliminar este proyecto y sus datos relacionados?")) {
      try {
        const response = await apiClient(`/proyectos/${id}`, { method: 'DELETE' });
        if (response.ok) {
          alert("🗑️ Proyecto eliminado");
          fetchData();
        }
      } catch (error) {
        console.error("Error al eliminar:", error);
      }
    }
  }

  const prepararEdicion = (p) => {
    setNuevoProyecto({ ...p })
    setEditandoId(p.id)
    setMostrarForm(true)
  }

  const cerrarFormulario = () => {
    setMostrarForm(false)
    setEditandoId(null)
    setNuevoProyecto({ cliente_id: '', nombre_proyecto: '', descripcion: '', fecha_inicio: '', fecha_fin: '', estado: 'Planificación' })
  }

  // --- COMPONENTE: DETALLE DEL PROYECTO ---
  const DetalleProyecto = ({ proyecto, alCerrar }) => {
    const tareasDelProyecto = todasLasTareas.filter(t => t.proyecto_id === proyecto.id);

    return (
      <div className="animation-slide" style={{ background: '#1e293b', padding: '30px', borderRadius: '15px', border: '1px solid #334155' }}>
        <button onClick={alCerrar} className="btn-secondary" style={{ marginBottom: '20px' }}>← Volver</button>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '30px' }}>
          <div>
            <h2 style={{ color: 'white', marginBottom: '10px' }}>{proyecto.nombre_proyecto}</h2>
            <p style={{ color: '#94a3b8', fontSize: '0.95rem', lineHeight: '1.6', whiteSpace: 'pre-wrap' }}>{proyecto.descripcion}</p>
            
            <h4 style={{ color: 'white', marginTop: '30px', marginBottom: '15px' }}>Tareas del Proyecto ({tareasDelProyecto.length})</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {tareasDelProyecto.length === 0 ? (
                <p style={{ color: '#475569' }}>No hay tareas vinculadas.</p>
              ) : (
                tareasDelProyecto.map(t => (
                  <div key={t.id} style={{ background: '#0f172a', padding: '12px', borderRadius: '8px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#f8fafc' }}>{t.titulo}</span>
                    <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                      <span style={{ fontSize: '0.7rem', color: '#3b82f6' }}>👤 {t.perfiles?.nombre}</span>
                      <span className={`badge ${t.estado?.replace(/\s+/g, '-').toLowerCase()}`} style={{ fontSize: '0.6rem' }}>{t.estado}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div style={{ background: '#0f172a', borderRadius: '12px', padding: '20px', height: 'fit-content' }}>
            <h4 style={{ color: '#64748b', marginBottom: '15px' }}>Ficha Técnica</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px', color: '#cbd5e1', fontSize: '0.9rem' }}>
              <p><strong>Cliente:</strong> {proyecto.clientes?.empresa}</p>
              <p><strong>Contacto:</strong> {proyecto.clientes?.nombre_contacto}</p>
              <p><strong>Inicio:</strong> {proyecto.fecha_inicio}</p>
              <p><strong>Fin:</strong> {proyecto.fecha_fin || 'Sin definir'}</p>
              <div style={{ height: '120px', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1e293b', borderRadius: '8px', border: '1px dashed #334155' }}>
                <span style={{ color: '#475569' }}>[ Salud del Proyecto ]</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const getStatStyle = (color, isActive) => ({
    background: isActive ? '#2d3748' : '#1e293b',
    padding: '12px 15px',
    borderRadius: '10px',
    borderLeft: `3px solid ${color}`,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: isActive ? '1px solid #334155' : '1px solid transparent'
  });

  return (
    <div className="dashboard-content">
      {proyectoSeleccionado ? (
        <DetalleProyecto proyecto={proyectoSeleccionado} alCerrar={() => setProyectoSeleccionado(null)} />
      ) : (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '12px', marginBottom: '20px' }}>
            <div style={getStatStyle('#3b82f6', filtroEstado === null)} onClick={() => setFiltroEstado(null)}>
              <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>TOTALES</span>
              <h2 style={{ margin: '0', color: 'white' }}>{stats.total}</h2>
            </div>
            <div style={getStatStyle('#8b5cf6', filtroEstado === 'Planificación')} onClick={() => setFiltroEstado('Planificación')}>
              <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>PLANIFICACIÓN</span>
              <h2 style={{ margin: '0', color: '#8b5cf6' }}>{stats.planificacion}</h2>
            </div>
            <div style={getStatStyle('#f59e0b', filtroEstado === 'En Progreso')} onClick={() => setFiltroEstado('En Progreso')}>
              <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>EN PROGRESO</span>
              <h2 style={{ margin: '0', color: '#f59e0b' }}>{stats.desarrollo}</h2>
            </div>
            <div style={getStatStyle('#10b981', filtroEstado === 'Finalizado')} onClick={() => setFiltroEstado('Finalizado')}>
              <span style={{ color: '#94a3b8', fontSize: '0.7rem' }}>FINALIZADOS</span>
              <h2 style={{ margin: '0', color: '#10b981' }}>{stats.finalizados}</h2>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '15px', marginBottom: '25px' }}>
            <input 
              type="text" 
              placeholder="🔍 Buscar proyecto o cliente..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              style={{ flex: 1, padding: '12px', borderRadius: '8px', background: '#1e293b', color: 'white', border: '1px solid #334155' }}
            />
            <button className="btn-save" onClick={() => setMostrarForm(!mostrarForm)}>
              {mostrarForm ? 'Cerrar' : '+ Nuevo Proyecto'}
            </button>
          </div>

          {mostrarForm && (
            <section className="form-section animation-slide" style={{ marginBottom: '25px', background: '#1e293b', padding: '20px', borderRadius: '12px', border: '1px solid #334155' }}>
              <h3 style={{ color: 'white', marginBottom: '20px' }}>{editandoId ? '✏️ Editar Proyecto' : '➕ Nuevo Proyecto'}</h3>
              <form onSubmit={handleGuardar} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '15px' }}>
                  <select value={nuevoProyecto.cliente_id} onChange={e => setNuevoProyecto({...nuevoProyecto, cliente_id: e.target.value})} style={{ padding: '10px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #334155' }}>
                    <option value="">-- Seleccionar Cliente --</option>
                    {clientes.map(c => <option key={c.id} value={c.id}>{c.empresa} ({c.nombre_contacto}) </option>)}
                  </select>
                  <input type="text" placeholder="Nombre del Proyecto" value={nuevoProyecto.nombre_proyecto} onChange={e => setNuevoProyecto({...nuevoProyecto, nombre_proyecto: e.target.value})} style={{ padding: '10px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #334155' }} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '2.5fr 1fr', gap: '15px' }}>
                  <textarea placeholder="Descripción detallada..." value={nuevoProyecto.descripcion} onChange={e => setNuevoProyecto({...nuevoProyecto, descripcion: e.target.value})} rows="6" style={{ padding: '12px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #334155', resize: 'none' }} />
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <label style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Fecha Inicio</label>
                      <input type="date" value={nuevoProyecto.fecha_inicio} onChange={e => setNuevoProyecto({...nuevoProyecto, fecha_inicio: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #334155' }} />
                    </div>
                    <div>
                      <label style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Fecha Fin</label>
                      <input type="date" value={nuevoProyecto.fecha_fin} onChange={e => setNuevoProyecto({...nuevoProyecto, fecha_fin: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #334155' }} />
                    </div>
                    <div>
                      <label style={{ color: '#94a3b8', fontSize: '0.7rem' }}>Estado</label>
                      <select value={nuevoProyecto.estado} onChange={e => setNuevoProyecto({...nuevoProyecto, estado: e.target.value})} style={{ width: '100%', padding: '8px', borderRadius: '8px', background: '#0f172a', color: 'white', border: '1px solid #334155' }}>
                        <option value="Planificación">Planificación</option>
                        <option value="En Progreso">En Progreso</option>
                        <option value="Finalizado">Finalizado</option>
                      </select>
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="submit" className="btn-save" disabled={enviando}>{enviando ? 'Guardando...' : editandoId ? 'Actualizar' : 'Registrar'}</button>
                  <button type="button" className="btn-secondary" onClick={cerrarFormulario}>Cancelar</button>
                </div>
              </form>
            </section>
          )}

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px' }}>
            {loading ? <p>Cargando proyectos corporativos...</p> : proyectosFiltrados.map(p => (
              <div key={p.id} className="proyecto-card" onClick={() => setProyectoSeleccionado(p)} style={{ background: '#1e293b', borderRadius: '12px', padding: '20px', border: '1px solid #334155', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.75rem', color: '#3b82f6', fontWeight: 'bold' }}>🏢 {p.clientes?.empresa}</span>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button onClick={(e) => { e.stopPropagation(); prepararEdicion(p); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>✏️</button>
                      <button onClick={(e) => { e.stopPropagation(); handleEliminar(p.id); }} style={{ background: 'none', border: 'none', cursor: 'pointer' }}>🗑️</button>
                    </div>
                  </div>
                  <h3 style={{ color: '#f8fafc', margin: '0 0 10px 0' }}>{p.nombre_proyecto}</h3>
                  <p style={{ fontSize: '0.8rem', color: '#94a3b8', height: '40px', overflow: 'hidden' }}>{p.descripcion}</p>
                  <div style={{ margin: '15px 0' }}>
                    <span className={`badge ${p.estado?.replace(/\s+/g, '-').toLowerCase()}`}>{p.estado}</span>
                  </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default ProyectosView