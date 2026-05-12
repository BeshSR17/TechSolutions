import React, { useState, useEffect } from 'react';
import { apiClient } from '../../apiClient';
import { useToast } from '../shared/Toast';
import { useTareaExtras } from '../../hooks/useTareaExtras';
import './TareasView.css';
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

// ─── HELPERS ─────────────────────────────────────────────────────────────────

const PRIORIDAD_CONFIG = {
  'Alta':  { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  icon: '🔴', label: 'Alta'  },
  'Media': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '🟡', label: 'Media' },
  'Baja':  { color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: '🟢', label: 'Baja'  },
};

const ESTADO_CONFIG = {
  'Pendiente':   { color: '#64748b', bg: 'rgba(100,116,139,0.15)', dot: '#94a3b8' },
  'En Progreso': { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  dot: '#3b82f6' },
  'En Revisión': { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  dot: '#f59e0b' },
  'Completada':  { color: '#10b981', bg: 'rgba(16,185,129,0.15)',  dot: '#10b981' },
};

const calcDiasRestantes = (fechaFin) => {
  if (!fechaFin) return null;
  const hoy = new Date(); hoy.setHours(0,0,0,0);
  const fin = new Date(fechaFin); fin.setHours(0,0,0,0);
  return Math.ceil((fin - hoy) / (1000 * 60 * 60 * 24));
};

const formatFecha = (f) => {
  if (!f) return '—';
  return new Date(f).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' });
};

const AlertaDias = ({ dias }) => {
  if (dias === null) return null;
  if (dias < 0)  return <span className="tv-alerta tv-alerta--vencida">⚠ Vencida hace {Math.abs(dias)}d</span>;
  if (dias === 0) return <span className="tv-alerta tv-alerta--hoy">🔥 Vence hoy</span>;
  if (dias <= 3)  return <span className="tv-alerta tv-alerta--urgente">⏰ {dias}d restantes</span>;
  if (dias <= 7)  return <span className="tv-alerta tv-alerta--pronto">📅 {dias}d restantes</span>;
  return <span className="tv-alerta tv-alerta--ok">✓ {dias}d restantes</span>;
};

// ─── MODAL DE DETALLE ─────────────────────────────────────────────────────────

const ModalDetalle = ({ tarea, onCerrar, onActualizar }) => {
  const toast = useToast();
  const [tab, setTab] = useState('info');
  const [avance, setAvance] = useState(tarea.avance || 0);
  const [comentario, setComentario] = useState('');
  const [linkInput, setLinkInput] = useState('');
  const [linkNombre, setLinkNombre] = useState('');

  // ── Historial local (no necesita ir a DB, es solo para esta sesión) ─────────
  const [historial, setHistorial] = useState([])

  // ── Extras desde la API (comentarios y links compartidos con el admin) ───────
  const {
    comentarios,
    links,
    cargando: cargandoExtras,
    agregarComentario: apiAgregarComentario,
    agregarLink:       apiAgregarLink,
    eliminarExtra,
  } = useTareaExtras(tarea.id)

  const dias = calcDiasRestantes(tarea.fecha_finalizacion);
  const prioridad = PRIORIDAD_CONFIG[tarea.prioridad] || PRIORIDAD_CONFIG['Baja'];
  const estadoCfg = ESTADO_CONFIG[tarea.estado] || ESTADO_CONFIG['Pendiente'];

  const agregarAlHistorial = (texto, tipo) => {
    setHistorial(prev => [{ fecha: new Date().toISOString(), texto, tipo }, ...prev])
  }

  const handleAvanceCommit = (val) => {
    onActualizar(tarea.id, { avance: val });
    agregarAlHistorial(`Avance actualizado a ${val}%`, 'avance')
  };

  const handleEstado = (nuevoEstado) => {
    onActualizar(tarea.id, { estado: nuevoEstado });
    agregarAlHistorial(`Estado cambiado a "${nuevoEstado}"`, 'estado')
  };

  const agregarComentario = async () => {
    if (!comentario.trim()) { toast.warning('Escribe algo antes de agregar'); return; }
    const ok = await apiAgregarComentario(comentario.trim())
    if (ok) {
      setComentario('');
      toast.success('Nota agregada');
    } else {
      toast.error('No se pudo guardar la nota')
    }
  };

  const agregarLink = async () => {
    if (!linkInput.trim()) { toast.warning('Ingresa una URL válida'); return; }
    if (!linkInput.startsWith('http')) { toast.warning('La URL debe comenzar con http:// o https://'); return; }
    const ok = await apiAgregarLink(linkInput.trim(), linkNombre.trim())
    if (ok) {
      setLinkInput(''); setLinkNombre('');
      toast.success('Enlace agregado');
    } else {
      toast.error('No se pudo guardar el enlace')
    }
  };

  const handleEliminarExtra = async (id) => {
    const ok = await eliminarExtra(id)
    if (ok) toast.info('Eliminado')
    else toast.error('No se pudo eliminar')
  };

  return (
    <div className="tv-modal-overlay" onClick={onCerrar}>
      <div className="tv-modal" onClick={e => e.stopPropagation()}>

        <div className="tv-modal-header">
          <div className="tv-modal-meta">
            <span className="tv-codigo">{tarea.codigo_serie}</span>
            <span className="tv-badge-prioridad" style={{ color: prioridad.color, background: prioridad.bg }}>{prioridad.icon} {prioridad.label}</span>
            <span className="tv-badge-estado" style={{ color: estadoCfg.color, background: estadoCfg.bg }}>
              <span className="tv-estado-dot" style={{ background: estadoCfg.dot }} />{tarea.estado}
            </span>
          </div>
          <button className="tv-modal-cerrar" onClick={onCerrar}>✕</button>
        </div>

        <h2 className="tv-modal-titulo">{tarea.titulo}</h2>

        <div className="tv-modal-quickinfo">
          <div className="tv-qi-item"><span className="tv-qi-label">Proyecto</span><span className="tv-qi-val">{tarea.proyectos?.nombre_proyecto || '—'}</span></div>
          <div className="tv-qi-item"><span className="tv-qi-label">Inicio</span><span className="tv-qi-val">{formatFecha(tarea.fecha_inicio)}</span></div>
          <div className="tv-qi-item"><span className="tv-qi-label">Vencimiento</span><span className="tv-qi-val">{formatFecha(tarea.fecha_finalizacion)}</span></div>
          <div className="tv-qi-item"><span className="tv-qi-label">Tiempo</span><AlertaDias dias={dias} /></div>
        </div>

        <div className="tv-avance-section">
          <div className="tv-avance-label"><span>Avance</span><strong>{avance}%</strong></div>
          <div className="tv-progress-track"><div className="tv-progress-fill" style={{ width: `${avance}%` }} /></div>
          <input type="range" min="0" max="100" value={avance}
            onChange={e => setAvance(parseInt(e.target.value))}
            onMouseUp={e => handleAvanceCommit(parseInt(e.target.value))}
            onTouchEnd={() => handleAvanceCommit(avance)}
            className="tv-range" />
        </div>

        <div className="tv-acciones">
          {tarea.estado === 'Pendiente' && (
            <button className="tv-btn tv-btn--primary" onClick={() => handleEstado('En Progreso')}>▶ Iniciar Tarea</button>
          )}
          {tarea.estado === 'En Progreso' && (
            <button className="tv-btn tv-btn--warning" onClick={() => handleEstado('En Revisión')}>📤 Enviar a Revisión</button>
          )}
          {tarea.estado === 'En Revisión' && (
            <span className="tv-badge-estado" style={{ color: '#f59e0b', background: 'rgba(245,158,11,0.15)', padding: '8px 16px' }}>
              ⏳ En espera de revisión del admin
            </span>
          )}
        </div>

        <div className="tv-tabs">
          {['info', 'comentarios', 'adjuntos', 'historial'].map(t => (
            <button key={t} className={`tv-tab ${tab === t ? 'tv-tab--active' : ''}`} onClick={() => setTab(t)}>
              {t === 'info'        && '📋 Instrucciones'}
              {t === 'comentarios' && `💬 Notas ${comentarios.length > 0 ? `(${comentarios.length})` : ''}`}
              {t === 'adjuntos'    && `🔗 Links ${links.length > 0 ? `(${links.length})` : ''}`}
              {t === 'historial'   && `📜 Historial ${historial.length > 0 ? `(${historial.length})` : ''}`}
            </button>
          ))}
        </div>

        <div className="tv-tab-content">
          {tab === 'info' && (
            <div className="tv-instrucciones">
              {tarea.instrucciones ? <p>{tarea.instrucciones}</p> : <p className="tv-empty">Sin instrucciones registradas.</p>}
            </div>
          )}

          {tab === 'comentarios' && (
            <div className="tv-comentarios">
              <div className="tv-input-row">
                <textarea className="tv-textarea" placeholder="Escribe una nota o comentario..." value={comentario} onChange={e => setComentario(e.target.value)} rows={2} />
                <button className="tv-btn tv-btn--primary tv-btn--sm" onClick={agregarComentario}>Agregar</button>
              </div>
              {cargandoExtras ? (
                <p className="tv-empty">Cargando notas...</p>
              ) : comentarios.length === 0 ? (
                <p className="tv-empty">Aún no hay notas. ¡Agrega la primera!</p>
              ) : (
                comentarios.map(c => (
                  <div key={c.id} className="tv-comentario-item">
                    <p>{c.contenido}</p>
                    <div className="tv-comentario-meta">
                      <span>{new Date(c.creado_en).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      <button onClick={() => handleEliminarExtra(c.id)} className="tv-btn-eliminar">✕</button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'adjuntos' && (
            <div className="tv-links">
              <div className="tv-link-inputs">
                <input className="tv-input" placeholder="URL (https://...)" value={linkInput} onChange={e => setLinkInput(e.target.value)} />
                <input className="tv-input" placeholder="Nombre del enlace (opcional)" value={linkNombre} onChange={e => setLinkNombre(e.target.value)} />
                <button className="tv-btn tv-btn--primary tv-btn--sm" onClick={agregarLink}>+ Agregar</button>
              </div>
              {cargandoExtras ? (
                <p className="tv-empty">Cargando enlaces...</p>
              ) : links.length === 0 ? (
                <p className="tv-empty">No hay enlaces adjuntos.</p>
              ) : (
                links.map(l => (
                  <div key={l.id} className="tv-link-item">
                    <span className="tv-link-icon">🔗</span>
                    <div className="tv-link-info">
                      <a href={l.contenido} target="_blank" rel="noopener noreferrer">{l.nombre || l.contenido}</a>
                      <span className="tv-link-fecha">{formatFecha(l.creado_en)}</span>
                    </div>
                    <button onClick={() => handleEliminarExtra(l.id)} className="tv-btn-eliminar">✕</button>
                  </div>
                ))
              )}
            </div>
          )}

          {tab === 'historial' && (
            <div className="tv-historial">
              {historial.length === 0 ? (
                <p className="tv-empty">El historial aparecerá aquí cuando realices cambios en esta sesión.</p>
              ) : (
                historial.map((h, i) => (
                  <div key={i} className="tv-historial-item">
                    <div className={`tv-historial-dot tv-historial-dot--${h.tipo}`} />
                    <div className="tv-historial-body">
                      <p>{h.texto}</p>
                      <span>{new Date(h.fecha).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── TARJETA ──────────────────────────────────────────────────────────────────

const TareaCard = ({ tarea, onClick, index }) => {
  const dias = calcDiasRestantes(tarea.fecha_finalizacion);
  const prioridad = PRIORIDAD_CONFIG[tarea.prioridad] || PRIORIDAD_CONFIG['Baja'];
  const estadoCfg = ESTADO_CONFIG[tarea.estado] || ESTADO_CONFIG['Pendiente'];
  const avance = tarea.avance || 0;
  const esUrgente = dias !== null && dias <= 3;

  return (
    <div className={`tv-card ${esUrgente ? 'tv-card--urgente' : ''}`} style={{ animationDelay: `${index * 0.05}s` }} onClick={onClick}>
      <div className="tv-card-top">
        <span className="tv-codigo">{tarea.codigo_serie}</span>
        <span className="tv-badge-prioridad" style={{ color: prioridad.color, background: prioridad.bg }}>{prioridad.icon} {prioridad.label}</span>
      </div>
      <h3 className="tv-card-titulo">{tarea.titulo}</h3>
      {tarea.proyectos?.nombre_proyecto && <p className="tv-card-proyecto">📁 {tarea.proyectos.nombre_proyecto}</p>}
      <div className="tv-card-avance">
        <div className="tv-card-avance-label"><span>Avance</span><span>{avance}%</span></div>
        <div className="tv-progress-track"><div className="tv-progress-fill" style={{ width: `${avance}%`, background: estadoCfg.dot }} /></div>
      </div>
      <div className="tv-card-footer">
        <span className="tv-badge-estado" style={{ color: estadoCfg.color, background: estadoCfg.bg }}>
          <span className="tv-estado-dot" style={{ background: estadoCfg.dot }} />{tarea.estado}
        </span>
        <AlertaDias dias={dias} />
      </div>
      <div className="tv-card-fechas">
        <span>📅 {formatFecha(tarea.fecha_inicio)}</span><span>→</span><span>{formatFecha(tarea.fecha_finalizacion)}</span>
      </div>
    </div>
  );
};

// ─── VISTA PRINCIPAL ──────────────────────────────────────────────────────────

const TareasView = ({ usuarioId }) => {
  const toast = useToast();
  const [tareas,          setTareas]          = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [tareaSeleccionada, setTareaSeleccionada] = useState(null);
  const [busqueda,        setBusqueda]        = useState('');
  const [filtroEstado,    setFiltroEstado]    = useState(null);
  const [filtroPrioridad, setFiltroPrioridad] = useState(null);

  const fetchMisTareas = async () => {
    try {
      setLoading(true);
      const res = await apiClient('/tareas/mis-tareas');
      if (res.ok) {
        setTareas(await res.json());
      } else {
        toast.error('No se pudieron cargar tus tareas');
      }
    } catch {
      toast.error('Error de conexión al cargar tareas');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { if (usuarioId) fetchMisTareas(); }, [usuarioId]);

  const actualizarTarea = async (id, cambios) => {
    try {
      const res = await apiClient(`/tareas/${id}`, { method: 'PUT', body: JSON.stringify(cambios) });
      if (res.ok) {
        const data = await res.json()
        const tareaActualizada = Array.isArray(data) ? data[0] : data
        setTareas(prev => prev.map(t => t.id === id ? { ...t, ...tareaActualizada } : t));
        if (tareaSeleccionada?.id === id) setTareaSeleccionada(prev => ({ ...prev, ...tareaActualizada }));
        if (cambios.estado) toast.success(`Estado actualizado a "${cambios.estado}"`);
      } else {
        toast.error('No se pudo actualizar la tarea');
      }
    } catch {
      toast.error('Error de conexión al actualizar');
    }
  };

  const generarPDF = () => {
    const doc = new jsPDF('landscape');

    doc.setFontSize(20);
    doc.text('Reporte de Mis Tareas', 14, 20);

    doc.setFontSize(10);
    doc.text(
      `Generado: ${new Date().toLocaleString('es-GT')}`,
      14,
      28
    );

    autoTable(doc, {
      startY: 38,
      head: [[
        'Código',
        'Título',
        'Proyecto',
        'Estado',
        'Prioridad',
        'Avance',
        'Fecha Inicio',
        'Fecha Fin'
      ]],
      body: tareasFiltradas.map(t => [
        t.codigo_serie || '',
        t.titulo || '',
        t.proyectos?.nombre_proyecto || '',
        t.estado || '',
        t.prioridad || '',
        `${t.avance || 0}%`,
        formatFecha(t.fecha_inicio),
        formatFecha(t.fecha_finalizacion)
      ]),
      styles: {
        fontSize: 8,
        cellPadding: 3,
        valign: 'middle'
      },
      headStyles: {
        fillColor: [59, 130, 246]
      },
      alternateRowStyles: {
        fillColor: [245, 247, 250]
      }
    });

    doc.save('Mis_Tareas.pdf');
  };

  const stats = {
    total:      tareas.length,
    pendiente:  tareas.filter(t => t.estado === 'Pendiente').length,
    enProgreso: tareas.filter(t => t.estado === 'En Progreso').length,
    enRevision: tareas.filter(t => t.estado === 'En Revisión').length,
    urgentes:   tareas.filter(t => { const d = calcDiasRestantes(t.fecha_finalizacion); return d !== null && d <= 3 && t.estado !== 'Completada'; }).length,
  };

  const tareasFiltradas = tareas.filter(t => {
    const busq = busqueda.toLowerCase();
    const coincideBusqueda = (t.titulo || '').toLowerCase().includes(busq) || (t.codigo_serie || '').toLowerCase().includes(busq);
    const coincideEstado    = filtroEstado    ? t.estado    === filtroEstado    : true;
    const coincidePrioridad = filtroPrioridad ? t.prioridad === filtroPrioridad : true;
    return coincideBusqueda && coincideEstado && coincidePrioridad;
  });


  

  return (
    <div className="tv-root">

      {/* Stats */}
      <div className="tv-stats">
        {[
          { label: 'Total',      val: stats.total,      color: '#3b82f6', filtro: null           },
          { label: 'Pendiente',  val: stats.pendiente,  color: '#64748b', filtro: 'Pendiente'    },
          { label: 'En Curso',   val: stats.enProgreso, color: '#3b82f6', filtro: 'En Progreso'  },
          { label: 'Revisión',   val: stats.enRevision, color: '#f59e0b', filtro: 'En Revisión'  },
          { label: '⚠ Urgentes', val: stats.urgentes,   color: '#ef4444', filtro: '__urgentes__' },
        ].map(s => (
          <div key={s.label} className={`tv-stat-card ${filtroEstado === s.filtro ? 'tv-stat-card--active' : ''}`} style={{ '--accent': s.color }} onClick={() => setFiltroEstado(filtroEstado === s.filtro ? null : s.filtro)}>
            <span className="tv-stat-label">{s.label}</span>
            <span className="tv-stat-val" style={{ color: s.color }}>{s.val}</span>
          </div>
        ))}
      </div>

      {/* Filtros */}
      <div className="tv-filtros">
        <input className="tv-search" type="text" placeholder="🔍  Buscar por título o código..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        <div className="tv-filtros-prioridad">
          {[null, 'Alta', 'Media', 'Baja'].map(p => (
            <button key={p ?? 'todas'} className={`tv-chip ${filtroPrioridad === p ? 'tv-chip--active' : ''}`} onClick={() => setFiltroPrioridad(p)}>
              {p === null ? 'Todas' : `${PRIORIDAD_CONFIG[p].icon} ${p}`}
            </button>
          ))}
        </div>
        <button
          className="tv-btn tv-btn--primary"
          onClick={generarPDF}
        >
          📄 Exportar PDF
        </button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="tv-loading"><div className="tv-spinner" /><span>Cargando tareas...</span></div>
      ) : tareasFiltradas.length === 0 ? (
        <div className="tv-empty-state"><span className="tv-empty-icon">📭</span><p>No hay tareas que coincidan con tu búsqueda.</p></div>
      ) : (
        <div className="tv-grid">
          {tareasFiltradas.map((t, i) => (
            <TareaCard key={t.id} tarea={t} index={i} onClick={() => setTareaSeleccionada(t)} />
          ))}
        </div>
      )}

      {tareaSeleccionada && (
        <ModalDetalle tarea={tareaSeleccionada} onCerrar={() => setTareaSeleccionada(null)} onActualizar={actualizarTarea} />
      )}
    </div>
  );
};

export default TareasView;