import React, { useState, useEffect } from 'react'
import { apiClient } from '../../apiClient'
import { useToast } from '../shared/Toast'
import { validar, esValido, REGLAS } from '../../hooks/useValidation'
import { useTareaExtras } from '../../hooks/useTareaExtras'
import ConfirmModal from '../shared/ConfirmModal'
import '../admin-design-system.css'
import { generarPDFTareas } from '../../hooks/pdfGenerator'

const PRIORIDAD_CFG = {
  'Urgente': { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: '🔴' },
  'Alta':    { color: '#f97316', bg: 'rgba(249,115,22,0.12)',  icon: '🟠' },
  'Media':   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '🟡' },
  'Baja':    { color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: '🟢' },
}

const ESTADO_CFG = {
  'Pendiente':   { color: '#64748b', bg: 'rgba(100,116,139,0.15)', dot: '#94a3b8' },
  'En Progreso': { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  dot: '#3b82f6' },
  'En Revisión': { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  dot: '#f59e0b' },
  'Completada':  { color: '#10b981', bg: 'rgba(16,185,129,0.15)',  dot: '#10b981' },
}

const ESQUEMA_TAREA = {
  proyecto_id:  [REGLAS.noVacio],
  empleado_id:  [REGLAS.noVacio],
  titulo:       [REGLAS.requerido, REGLAS.minLength(3), REGLAS.maxLength(100)],
}

const formatFecha = f => f ? new Date(f).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

// ── Modal Detalle ─────────────────────────────────────────────────────────────
const ModalTarea = ({ tarea, onCerrar, onEditar, onEliminar, onActualizar }) => {
  const [tab, setTab] = useState('info')
  const pCfg = PRIORIDAD_CFG[tarea.prioridad] || PRIORIDAD_CFG['Baja']
  const eCfg = ESTADO_CFG[tarea.estado] || ESTADO_CFG['Pendiente']

  const { comentarios, links, cargando: cargandoExtras } = useTareaExtras(tarea.id)

  return (
    <div className="ads-modal-overlay" onClick={onCerrar}>
      <div className="ads-modal ads-modal--lg" onClick={e => e.stopPropagation()}>
        <div className="ads-modal-header">
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span className="ads-code">{tarea.codigo_serie}</span>
              <span className="ads-badge" style={{ color: pCfg.color, background: pCfg.bg }}>{pCfg.icon} {tarea.prioridad}</span>
              <span className="ads-badge" style={{ color: eCfg.color, background: eCfg.bg }}><span className="ads-dot" style={{ background: eCfg.dot }} />{tarea.estado}</span>
            </div>
            <h2 className="ads-modal-title">{tarea.titulo}</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button className="ads-btn ads-btn--secondary ads-btn--sm" onClick={() => { onCerrar(); onEditar(tarea) }}>✏️</button>
            <button className="ads-btn ads-btn--danger ads-btn--sm" onClick={() => onEliminar(tarea.id)}>🗑️</button>
            <button className="ads-modal-close" onClick={onCerrar}>✕</button>
          </div>
        </div>

        <div className="ads-quickinfo ads-quickinfo--4">
          <div className="ads-qi-item"><span className="ads-qi-label">Proyecto</span><span className="ads-qi-val">{tarea.proyectos?.nombre_proyecto || '—'}</span></div>
          <div className="ads-qi-item"><span className="ads-qi-label">Cliente</span><span className="ads-qi-val">{tarea.proyectos?.clientes?.empresa || '—'}</span></div>
          <div className="ads-qi-item"><span className="ads-qi-label">Responsable</span><span className="ads-qi-val">{tarea.perfiles?.nombre || '—'}</span></div>
          <div className="ads-qi-item"><span className="ads-qi-label">Avance</span><span className="ads-qi-val" style={{ color: '#10b981', fontWeight: 700 }}>{tarea.avance || 0}%</span></div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--ads-sub)', marginBottom: '8px', fontFamily: 'var(--ads-mono)' }}>
            <span>Avance de la tarea</span><span>{tarea.avance || 0}%</span>
          </div>
          <div className="ads-progress-track" style={{ height: '8px' }}>
            <div className="ads-progress-fill" style={{ width: `${tarea.avance || 0}%`, background: eCfg.dot }} />
          </div>
        </div>

        <div className={`ads-quickinfo ${tarea.fecha_completada ? 'ads-quickinfo--3' : 'ads-quickinfo--2'}`}>
          <div className="ads-qi-item"><span className="ads-qi-label">Fecha Inicio</span><span className="ads-qi-val">{formatFecha(tarea.fecha_inicio)}</span></div>
          <div className="ads-qi-item"><span className="ads-qi-label">Fecha Límite</span><span className="ads-qi-val">{formatFecha(tarea.fecha_finalizacion)}</span></div>
          {tarea.fecha_completada && (
            <div className="ads-qi-item">
              <span className="ads-qi-label">Completada el</span>
              <span className="ads-qi-val" style={{ color: '#10b981', fontWeight: 700 }}>✓ {formatFecha(tarea.fecha_completada)}</span>
            </div>
          )}
        </div>

        <div>
          <p className="ads-panel-title">Cambiar estado</p>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            {Object.entries(ESTADO_CFG).map(([estado, cfg]) => (
              <button key={estado} onClick={() => onActualizar(tarea.id, { estado })} className="ads-btn ads-btn--sm"
                style={{ background: tarea.estado === estado ? cfg.bg : 'var(--ads-surface2)', color: tarea.estado === estado ? cfg.color : 'var(--ads-sub)', border: `1px solid ${tarea.estado === estado ? cfg.color + '55' : 'var(--ads-border)'}` }}>
                <span className="ads-dot" style={{ background: cfg.dot, display: 'inline-block', marginRight: '5px' }} />{estado}
              </button>
            ))}
          </div>
        </div>

        {/* Tabs: Instrucciones | Notas | Links */}
        <div className="ads-tabs">
          <button className={`ads-tab ${tab === 'info' ? 'ads-tab--active' : ''}`} onClick={() => setTab('info')}>
            📋 Instrucciones
          </button>
          <button className={`ads-tab ${tab === 'notas' ? 'ads-tab--active' : ''}`} onClick={() => setTab('notas')}>
            💬 Notas {comentarios.length > 0 ? `(${comentarios.length})` : ''}
          </button>
          <button className={`ads-tab ${tab === 'links' ? 'ads-tab--active' : ''}`} onClick={() => setTab('links')}>
            🔗 Links {links.length > 0 ? `(${links.length})` : ''}
          </button>
        </div>

        <div className="ads-tab-content">
          {tab === 'info' && (
            tarea.instrucciones ? (
              <div style={{ background: 'var(--ads-surface2)', borderRadius: '10px', padding: '16px', border: '1px solid var(--ads-border)' }}>
                <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.7', margin: 0, whiteSpace: 'pre-wrap' }}>{tarea.instrucciones}</p>
              </div>
            ) : (
              <div className="ads-empty"><span className="ads-empty-icon">📋</span><p>Sin instrucciones registradas.</p></div>
            )
          )}

          {tab === 'notas' && (
            cargandoExtras ? (
              <div className="ads-loading"><div className="ads-spinner" /><span>Cargando notas...</span></div>
            ) : comentarios.length === 0 ? (
              <div className="ads-empty"><span className="ads-empty-icon">💬</span><p>El colaborador no ha agregado notas aún.</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {comentarios.map(c => (
                  <div key={c.id} style={{ background: 'var(--ads-surface2)', border: '1px solid var(--ads-border)', borderRadius: '10px', padding: '14px 16px' }}>
                    <p style={{ color: 'var(--ads-text)', fontSize: '13.5px', margin: '0 0 8px', lineHeight: 1.6 }}>{c.contenido}</p>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ads-sub)', fontFamily: 'var(--ads-mono)' }}>
                      <span>👤 {c.perfiles?.nombre || 'Usuario'}</span>
                      <span>{new Date(c.creado_en).toLocaleString('es', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}

          {tab === 'links' && (
            cargandoExtras ? (
              <div className="ads-loading"><div className="ads-spinner" /><span>Cargando enlaces...</span></div>
            ) : links.length === 0 ? (
              <div className="ads-empty"><span className="ads-empty-icon">🔗</span><p>El colaborador no ha adjuntado enlaces aún.</p></div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {links.map(l => (
                  <div key={l.id} style={{ background: 'var(--ads-surface2)', border: '1px solid var(--ads-border)', borderRadius: '10px', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ fontSize: '18px', flexShrink: 0 }}>🔗</span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <a href={l.contenido} target="_blank" rel="noopener noreferrer"
                        style={{ color: 'var(--ads-blue)', fontSize: '13.5px', fontWeight: 600, textDecoration: 'none', display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {l.nombre || l.contenido}
                      </a>
                      <span style={{ fontSize: '11px', color: 'var(--ads-sub)', fontFamily: 'var(--ads-mono)' }}>
                        👤 {l.perfiles?.nombre || 'Usuario'} · {new Date(l.creado_en).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          )}
        </div>
      </div>
    </div>
  )
}

// ── Modal Form ────────────────────────────────────────────────────────────────
const ModalForm = ({ editando, datos, onChange, onGuardar, onCerrar, enviando, proyectos, usuarios, errores, onLimpiarError }) => (
  <div className="ads-modal-overlay" onClick={onCerrar}>
    <div className="ads-modal" onClick={e => e.stopPropagation()}>
      <div className="ads-modal-header">
        <h2 className="ads-modal-title">{editando ? '✏️ Editar Tarea' : '➕ Nueva Tarea'}</h2>
        <button className="ads-modal-close" onClick={onCerrar}>✕</button>
      </div>
      <form className="ads-form" onSubmit={onGuardar}>
        <div className="ads-form-row ads-form-row--2">
          <div className="ads-form-group">
            <label className="ads-form-label">Proyecto *</label>
            <select className={`ads-select ${errores.proyecto_id ? 'ads-select--error' : ''}`} value={datos.proyecto_id}
              onChange={e => { onChange({ ...datos, proyecto_id: e.target.value }); onLimpiarError('proyecto_id') }}>
              <option value="">— Seleccionar —</option>
              {proyectos.map(p => <option key={p.id} value={p.id}>{p.nombre_proyecto}</option>)}
            </select>
            {errores.proyecto_id && <span className="ads-error-msg">{errores.proyecto_id}</span>}
          </div>
          <div className="ads-form-group">
            <label className="ads-form-label">Responsable *</label>
            <select className={`ads-select ${errores.empleado_id ? 'ads-select--error' : ''}`} value={datos.empleado_id}
              onChange={e => { onChange({ ...datos, empleado_id: e.target.value }); onLimpiarError('empleado_id') }}>
              <option value="">— Seleccionar —</option>
              {usuarios.map(u => <option key={u.id} value={u.id}>{u.nombre}</option>)}
            </select>
            {errores.empleado_id && <span className="ads-error-msg">{errores.empleado_id}</span>}
          </div>
        </div>
        <div className="ads-form-group">
          <label className="ads-form-label">Título *</label>
          <input className={`ads-input ${errores.titulo ? 'ads-input--error' : ''}`} placeholder="Título de la tarea"
            value={datos.titulo} onChange={e => { onChange({ ...datos, titulo: e.target.value }); onLimpiarError('titulo') }} />
          {errores.titulo && <span className="ads-error-msg">{errores.titulo}</span>}
        </div>
        <div className="ads-form-group">
          <label className="ads-form-label">Instrucciones</label>
          <textarea className="ads-textarea" placeholder="Describe en detalle lo que debe hacerse..." rows={5}
            value={datos.instrucciones} onChange={e => onChange({ ...datos, instrucciones: e.target.value })} />
        </div>
        <div className="ads-form-row ads-form-row--3">
          <div className="ads-form-group">
            <label className="ads-form-label">Prioridad</label>
            <select className="ads-select" value={datos.prioridad} onChange={e => onChange({ ...datos, prioridad: e.target.value })}>
              <option>Baja</option><option>Media</option><option>Alta</option><option>Urgente</option>
            </select>
          </div>
          <div className="ads-form-group">
            <label className="ads-form-label">Estado</label>
            <select className="ads-select" value={datos.estado} onChange={e => onChange({ ...datos, estado: e.target.value })}>
              <option>Pendiente</option><option>En Progreso</option><option>En Revisión</option><option>Completada</option>
            </select>
          </div>
          <div className="ads-form-group">
            <label className="ads-form-label">Fecha Fin</label>
            <input className="ads-input" type="date" value={datos.fecha_finalizacion || ''} onChange={e => onChange({ ...datos, fecha_finalizacion: e.target.value })} />
          </div>
        </div>
        <div className="ads-form-actions">
          <button type="submit" className="ads-btn ads-btn--primary" disabled={enviando}>
            {enviando ? 'Guardando...' : editando ? 'Actualizar' : 'Crear Tarea'}
          </button>
          <button type="button" className="ads-btn ads-btn--secondary" onClick={onCerrar}>Cancelar</button>
        </div>
      </form>
    </div>
  </div>
)

// ── Vista principal ───────────────────────────────────────────────────────────
const TareasView = ({ isAdmin }) => {
  const toast = useToast()

  const [tareas,          setTareas]          = useState([])
  const [proyectos,       setProyectos]       = useState([])
  const [usuarios,        setUsuarios]        = useState([])
  const [loading,         setLoading]         = useState(true)
  const [busqueda,        setBusqueda]        = useState('')
  const [filtroEstado,    setFiltroEstado]    = useState(null)
  const [filtroPrioridad, setFiltroPrioridad] = useState(null)
  const [tareaDetalle,    setTareaDetalle]    = useState(null)
  const [mostrarForm,     setMostrarForm]     = useState(false)
  const [editandoId,      setEditandoId]      = useState(null)
  const [enviando,        setEnviando]        = useState(false)
  const [errores,         setErrores]         = useState({})
  const [confirm,         setConfirm]         = useState(null)

  const [formData, setFormData] = useState({
    proyecto_id: '', empleado_id: '', titulo: '',
    instrucciones: '', prioridad: 'Media', estado: 'Pendiente', fecha_finalizacion: ''
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [rT, rP, rU] = await Promise.all([apiClient('/tareas'), apiClient('/proyectos'), apiClient('/usuarios')])
      if (rT.ok) setTareas(await rT.json())
      if (rP.ok) setProyectos(await rP.json())
      if (rU.ok) setUsuarios(await rU.json())
    } catch {
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const stats = {
    total:      tareas.length,
    pendiente:  tareas.filter(t => t.estado === 'Pendiente').length,
    progreso:   tareas.filter(t => t.estado === 'En Progreso').length,
    revision:   tareas.filter(t => t.estado === 'En Revisión').length,
    completada: tareas.filter(t => t.estado === 'Completada').length,
  }

  const normalizar = t => t?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || ''

  const tareasFiltradas = tareas.filter(t => {
    const term = busqueda.toLowerCase()
    const coincide = t.titulo?.toLowerCase().includes(term) || t.proyectos?.nombre_proyecto?.toLowerCase().includes(term) || t.perfiles?.nombre?.toLowerCase().includes(term) || t.proyectos?.clientes?.empresa?.toLowerCase().includes(term)
    const estado = filtroEstado ? normalizar(t.estado).includes(normalizar(filtroEstado)) : true
    const prio = filtroPrioridad ? t.prioridad === filtroPrioridad : true
    return coincide && estado && prio
  })

  const abrirForm = (t = null) => {
    setErrores({})
    if (t) {
      setFormData({ proyecto_id: t.proyecto_id, empleado_id: t.empleado_id, titulo: t.titulo, instrucciones: t.instrucciones || '', prioridad: t.prioridad, estado: t.estado, fecha_finalizacion: t.fecha_finalizacion || '' })
      setEditandoId(t.id)
    } else {
      setFormData({ proyecto_id: '', empleado_id: '', titulo: '', instrucciones: '', prioridad: 'Media', estado: 'Pendiente', fecha_finalizacion: '' })
      setEditandoId(null)
    }
    setMostrarForm(true)
  }

  const cerrarForm = () => { setMostrarForm(false); setEditandoId(null); setErrores({}) }

  const limpiarError = (campo) => {
    if (errores[campo]) setErrores(prev => ({ ...prev, [campo]: null }))
  }

  const handleGuardar = async (e) => {
    e.preventDefault()
    const erroresNuevos = validar(formData, ESQUEMA_TAREA)
    setErrores(erroresNuevos)
    if (!esValido(erroresNuevos)) { toast.warning('Corrige los errores antes de continuar'); return }
    setEnviando(true)
    try {
      const endpoint = editandoId ? `/tareas/${editandoId}` : '/tareas'
      const res = await apiClient(endpoint, { method: editandoId ? 'PUT' : 'POST', body: JSON.stringify(formData) })
      if (res.ok) {
        toast.success(editandoId ? 'Tarea actualizada correctamente' : 'Tarea creada correctamente')
        cerrarForm(); fetchData()
      } else {
        toast.error('No se pudo guardar la tarea')
      }
    } catch { toast.error('Error de conexión al guardar') }
    finally { setEnviando(false) }
  }

  const handleEliminar = async (id) => {
    const tarea = tareas.find(t => t.id === id)
    setConfirm({
      titulo:  '¿Eliminar tarea?',
      mensaje: `Se eliminará "${tarea?.titulo || 'esta tarea'}" permanentemente. Esta acción no se puede deshacer.`,
      onAceptar: async () => {
        try {
          const res = await apiClient(`/tareas/${id}`, { method: 'DELETE' })
          if (res.ok) {
            toast.success('Tarea eliminada')
            setTareaDetalle(null)
            fetchData()
          } else {
            toast.error('No se pudo eliminar la tarea')
          }
        } catch {
          toast.error('Error de conexión al eliminar')
        }
      }
    })
  }

  const handleActualizar = async (id, cambios) => {
    try {
      const res = await apiClient(`/tareas/${id}`, { method: 'PUT', body: JSON.stringify(cambios) })
      if (res.ok) {
        const data = await res.json()
        // Usar la respuesta del backend que incluye fecha_completada
        const tareaActualizada = Array.isArray(data) ? data[0] : data
        toast.success('Estado actualizado')
        setTareas(prev => prev.map(t => t.id === id ? { ...t, ...tareaActualizada } : t))
        if (tareaDetalle?.id === id) setTareaDetalle(prev => ({ ...prev, ...tareaActualizada }))
      } else {
        toast.error('No se pudo actualizar el estado')
      }
    } catch { toast.error('Error de conexión') }
  }

  const generarPDFTareasHandler = () => {
    generarPDFTareas(tareasFiltradas, stats, filtroEstado, filtroPrioridad, 'admin')
  }


  return (
    <div className="ads-root">
      <div className="ads-stats">
        {[
          { label: 'Total',       val: stats.total,     color: '#3b82f6', filtro: null },
          { label: 'Pendiente',   val: stats.pendiente, color: '#64748b', filtro: 'Pendiente' },
          { label: 'En Progreso', val: stats.progreso,  color: '#3b82f6', filtro: 'En Progreso' },
          { label: 'En Revisión', val: stats.revision,  color: '#f59e0b', filtro: 'En Revisión' },
          { label: 'Completadas', val: stats.completada,color: '#10b981', filtro: 'Completada' },
        ].map(s => (
          <div key={s.label} className={`ads-stat-card ${filtroEstado === s.filtro ? 'ads-stat-card--active' : ''}`} style={{ '--accent': s.color }} onClick={() => setFiltroEstado(filtroEstado === s.filtro ? null : s.filtro)}>
            <span className="ads-stat-label">{s.label}</span>
            <span className="ads-stat-val" style={{ color: s.color }}>{s.val}</span>
          </div>
        ))}
      </div>

      <div className="ads-toolbar">
        <input className="ads-search" placeholder="🔍  Buscar tarea, proyecto, cliente o responsable..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        <div className="ads-chips">
          {[null, 'Urgente', 'Alta', 'Media', 'Baja'].map(p => (
            <button key={p ?? 'todas'} className={`ads-chip ${filtroPrioridad === p ? 'ads-chip--active' : ''}`} onClick={() => setFiltroPrioridad(p)}>
              {p === null ? 'Todas' : `${PRIORIDAD_CFG[p].icon} ${p}`}
            </button>
            
          ))}
          
        </div>
        {isAdmin && <button className="ads-btn ads-btn--primary" onClick={() => abrirForm()}>+ Nueva Tarea</button>}
        <button
          className="ads-btn ads-btn--primary"
          onClick={generarPDFTareasHandler}
        >
          📄 Generar Reporte
        </button>
      </div>

      {loading ? (
        <div className="ads-loading"><div className="ads-spinner" /><span>Cargando tareas...</span></div>
      ) : tareasFiltradas.length === 0 ? (
        <div className="ads-empty"><span className="ads-empty-icon">📋</span><p>No hay tareas que coincidan.</p></div>
      ) : (
        <div className="ads-grid">
          {tareasFiltradas.map((t, i) => {
            const pCfg = PRIORIDAD_CFG[t.prioridad] || PRIORIDAD_CFG['Baja']
            const eCfg = ESTADO_CFG[t.estado] || ESTADO_CFG['Pendiente']
            return (
              <div key={t.id} className="ads-card" style={{ animationDelay: `${i * 0.03}s` }} onClick={() => setTareaDetalle(t)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="ads-code">{t.codigo_serie}</span>
                  <div style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                    <span className="ads-badge" style={{ color: pCfg.color, background: pCfg.bg }}>{pCfg.icon} {t.prioridad}</span>
                    {isAdmin && (<><button className="ads-btn--icon" onClick={e => { e.stopPropagation(); abrirForm(t) }}>✏️</button><button className="ads-btn--icon danger" onClick={e => { e.stopPropagation(); handleEliminar(t.id) }}>🗑️</button></>)}
                  </div>
                </div>
                <div>
                  <p style={{ color: 'var(--ads-blue)', fontSize: '11px', margin: '0 0 4px', fontFamily: 'var(--ads-mono)' }}>🏢 {t.proyectos?.clientes?.empresa} / {t.proyectos?.nombre_proyecto}</p>
                  <h3 style={{ color: 'var(--ads-text)', fontWeight: 700, fontSize: '0.95rem', margin: 0, lineHeight: 1.35, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{t.titulo}</h3>
                </div>
                {t.perfiles?.nombre && (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div className="ads-avatar" style={{ width: 24, height: 24, fontSize: 10 }}>{t.perfiles.nombre.charAt(0)}</div>
                    <span style={{ color: 'var(--ads-sub)', fontSize: '12.5px', fontFamily: 'var(--ads-mono)' }}>{t.perfiles.nombre}</span>
                  </div>
                )}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ads-sub)', marginBottom: '5px', fontFamily: 'var(--ads-mono)' }}>
                    <span>Avance</span><span>{t.avance || 0}%</span>
                  </div>
                  <div className="ads-progress-track"><div className="ads-progress-fill" style={{ width: `${t.avance || 0}%`, background: eCfg.dot }} /></div>
                </div>
                <div style={{ borderTop: '1px solid var(--ads-border)', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span className="ads-badge" style={{ color: eCfg.color, background: eCfg.bg }}><span className="ads-dot" style={{ background: eCfg.dot }} />{t.estado}</span>
                  {t.estado === 'Completada' && t.fecha_completada ? (
                    <span style={{ fontSize: '11px', color: '#10b981', fontFamily: 'var(--ads-mono)', fontWeight: 600 }}>
                      ✓ {formatFecha(t.fecha_completada)}
                    </span>
                  ) : t.fecha_finalizacion ? (
                    <span style={{ fontSize: '11px', color: 'var(--ads-muted)', fontFamily: 'var(--ads-mono)' }}>
                      {formatFecha(t.fecha_finalizacion)}
                    </span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {tareaDetalle && <ModalTarea tarea={tareaDetalle} onCerrar={() => setTareaDetalle(null)} onEditar={abrirForm} onEliminar={handleEliminar} onActualizar={handleActualizar} />}
      {mostrarForm && <ModalForm editando={!!editandoId} datos={formData} onChange={setFormData} onGuardar={handleGuardar} onCerrar={cerrarForm} enviando={enviando} proyectos={proyectos} usuarios={usuarios} errores={errores} onLimpiarError={limpiarError} />}

      {confirm && (
        <ConfirmModal
          titulo={confirm.titulo}
          mensaje={confirm.mensaje}
          onAceptar={() => { confirm.onAceptar(); setConfirm(null) }}
          onCancelar={() => setConfirm(null)}
        />
      )}
    </div>
  )
}

export default TareasView