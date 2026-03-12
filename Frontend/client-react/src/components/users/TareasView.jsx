import React, { useState, useEffect } from 'react';
import { apiClient } from '../../apiClient'; // Importamos tu cliente con JWT

const TareasView = ({ usuarioId }) => {
  const [tareas, setTareas] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroEstado, setFiltroEstado] = useState(null);

  // --- 1. CARGA DE TAREAS VÍA API (JWT) ---
  const fetchMisTareas = async () => {
    try {
      setLoading(true);
      // Asumimos que tu backend Python tiene este endpoint que ya filtra por el usuario del token
      const res = await apiClient(`/tareas/mis-tareas`); 
      
      if (res.ok) {
        const data = await res.json();
        setTareas(data);
      }
    } catch (error) {
      console.error("Error cargando tareas:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (usuarioId) fetchMisTareas();
  }, [usuarioId]);

  // --- 2. ACTUALIZACIÓN DE TAREA (JWT) ---
  const actualizarTarea = async (id, cambios) => {
    try {
      const res = await apiClient(`/tareas/${id}`, {
        method: 'PUT',
        body: JSON.stringify(cambios)
      });
      
      if (res.ok) {
        setTareas(tareas.map(t => t.id === id ? { ...t, ...cambios } : t));
        if (tareaSeleccionada?.id === id) {
          setTareaSeleccionada({ ...tareaSeleccionada, ...cambios });
        }
      }
    } catch (error) {
      console.error("Error al actualizar tarea:", error);
    }
  };

  // --- LÓGICA DE FILTRADO (UI) ---
  const tareasFiltradas = tareas.filter(t => {
    const titulo = (t.titulo || '').toLowerCase();
    const codigo = (t.codigo_serie || '').toLowerCase();
    const busquedaLower = busqueda.toLowerCase();

    const coincideBusqueda = titulo.includes(busquedaLower) || codigo.includes(busquedaLower);
    const coincideEstado = filtroEstado ? t.estado === filtroEstado : true;

    return coincideBusqueda && coincideEstado;
  });

  // --- ESTADÍSTICAS ---
  const stats = {
    total: tareas.length,
    pendiente: tareas.filter(t => t.estado === 'Pendiente').length,
    enProgreso: tareas.filter(t => t.estado === 'En Progreso').length,
    enRevision: tareas.filter(t => t.estado === 'En Revisión').length,
  };

  const getCardStyle = (color, isActive) => ({
    background: isActive ? '#2d3748' : '#1e293b',
    padding: '12px 15px',
    borderRadius: '10px',
    borderLeft: `3px solid ${color}`,
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    transform: isActive ? 'scale(1.02)' : 'scale(1)',
    boxShadow: isActive ? `0 0 10px ${color}44` : 'none',
  });

  return (
    <div className="dashboard-content">
      
      {/* 1. DASHBOARD DE ESTADÍSTICAS */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '12px', marginBottom: '20px' }}>
        <div style={getCardStyle('#3b82f6', filtroEstado === null)} onClick={() => setFiltroEstado(null)}>
          <span style={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: 'bold' }}>TOTAL TAREAS</span>
          <h2 style={{ margin: '2px 0 0 0', fontSize: '1.4rem', color: 'white' }}>{stats.total}</h2>
        </div>
        <div style={getCardStyle('#ef4444', filtroEstado === 'Pendiente')} onClick={() => setFiltroEstado('Pendiente')}>
          <span style={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: 'bold' }}>PENDIENTES</span>
          <h2 style={{ margin: '2px 0 0 0', fontSize: '1.4rem', color: '#ef4444' }}>{stats.pendiente}</h2>
        </div>
        <div style={getCardStyle('#f59e0b', filtroEstado === 'En Progreso')} onClick={() => setFiltroEstado('En Progreso')}>
          <span style={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: 'bold' }}>EN CURSO</span>
          <h2 style={{ margin: '2px 0 0 0', fontSize: '1.4rem', color: '#f59e0b' }}>{stats.enProgreso}</h2>
        </div>
        <div style={getCardStyle('#10b981', filtroEstado === 'En Revisión')} onClick={() => setFiltroEstado('En Revisión')}>
          <span style={{ color: '#94a3b8', fontSize: '0.65rem', fontWeight: 'bold' }}>EN REVISIÓN</span>
          <h2 style={{ margin: '2px 0 0 0', fontSize: '1.4rem', color: '#10b981' }}>{stats.enRevision}</h2>
        </div>
      </div>

      {/* 2. BARRA DE BÚSQUEDA */}
      <div style={{ marginBottom: '20px' }}>
        <input 
          type="text" 
          placeholder="🔍 Buscar por título o código de serie..." 
          value={busqueda}
          onChange={(e) => setBusqueda(e.target.value)}
          style={{ width: '100%', padding: '12px', borderRadius: '8px', background: '#1e293b', color: 'white', border: '1px solid #334155' }}
        />
      </div>

      {/* 3. CONTENIDO PRINCIPAL */}
      <div style={{ display: 'grid', gridTemplateColumns: tareaSeleccionada ? '1fr 1.2fr' : '1fr', gap: '25px' }}>
        
        {/* LISTA FILTRADA */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
          {loading ? <p style={{ color: '#94a3b8' }}>Cargando tareas...</p> : 
           tareasFiltradas.length === 0 ? <p style={{ color: '#94a3b8' }}>No hay tareas que coincidan.</p> :
           tareasFiltradas.map(t => (
            <div 
              key={t.id} 
              onClick={() => setTareaSeleccionada(t)}
              style={{ 
                background: '#1e293b', padding: '15px', borderRadius: '10px', 
                border: tareaSeleccionada?.id === t.id ? '2px solid #3b82f6' : '1px solid #334155',
                cursor: 'pointer'
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                <span style={{ color: '#3b82f6', fontSize: '0.7rem', fontWeight: 'bold' }}>{t.codigo_serie}</span>
                <span className={`badge ${t.priodidad?.toLowerCase() || 'baja'}`}>{t.priodidad}</span>
              </div>
              <h4 style={{ color: 'white', margin: '0 0 8px 0' }}>{t.titulo}</h4>
              <div style={{ background: '#0f172a', borderRadius: '10px', height: '5px' }}>
                <div style={{ width: `${t.avance || 0}%`, background: '#3b82f6', height: '100%', borderRadius: '10px' }}></div>
              </div>
            </div>
          ))}
        </div>

        {/* DETALLE LATERAL */}
        {tareaSeleccionada && (
          <div className="animation-slide" style={{ background: '#1e293b', padding: '25px', borderRadius: '15px', border: '1px solid #334155', height: 'fit-content', position: 'sticky', top: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '15px' }}>
              <div>
                <span style={{ color: '#3b82f6', fontSize: '0.8rem', fontWeight: 'bold' }}>CÓDIGO: {tareaSeleccionada.codigo_serie}</span>
                <h3 style={{ color: 'white', margin: '5px 0 0 0' }}>{tareaSeleccionada.titulo}</h3>
              </div>
              <button onClick={() => setTareaSeleccionada(null)} style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
            </div>

            <div style={{ padding: '15px', background: '#0f172a', borderRadius: '10px', marginBottom: '20px' }}>
              <p style={{ color: '#cbd5e1', fontSize: '0.9rem', whiteSpace: 'pre-wrap' }}>
                {tareaSeleccionada.instrucciones || "Sin instrucciones."}
              </p>
            </div>

            <div style={{ marginBottom: '25px' }}>
              <label style={{ color: 'white', display: 'block', marginBottom: '10px' }}>Avance actual: {tareaSeleccionada.avance}%</label>
              <input 
                type="range" min="0" max="100" 
                value={tareaSeleccionada.avance || 0}
                onChange={(e) => setTareaSeleccionada({...tareaSeleccionada, avance: parseInt(e.target.value)})}
                onMouseUp={(e) => actualizarTarea(tareaSeleccionada.id, { avance: parseInt(e.target.value) })}
                style={{ width: '100%', accentColor: '#3b82f6' }}
              />
            </div>

            <div style={{ display: 'flex', gap: '10px' }}>
              {tareaSeleccionada.estado === 'Pendiente' ? (
                <button className="btn-save" style={{ flex: 1 }} onClick={() => actualizarTarea(tareaSeleccionada.id, { estado: 'En Progreso' })}>Aceptar Tarea</button>
              ) : (
                <button className="btn-secondary" style={{ flex: 1, color: '#10b981', border: '1px solid #10b981', background: 'transparent', padding: '10px', borderRadius: '8px', cursor: 'pointer' }} onClick={() => actualizarTarea(tareaSeleccionada.id, { estado: 'En Revisión' })}>Enviar a Revisión</button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TareasView;