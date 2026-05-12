import React, { useState, useEffect } from 'react'
import { apiClient } from '../../apiClient'
import { useToast } from '../shared/Toast'
import { validar, esValido, REGLAS } from '../../hooks/useValidation'
import ConfirmModal from '../shared/ConfirmModal'
import '../admin-design-system.css'
import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'

const ESTADO_CFG = {
  'Planificación': { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', dot: '#8b5cf6' },
  'En Progreso':   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  dot: '#f59e0b' },
  'Finalizado':    { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  dot: '#10b981' },
  'Cancelado':     { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   dot: '#ef4444' },
}

const ESQUEMA_PROYECTO = {
  cliente_id:      [REGLAS.noVacio],
  nombre_proyecto: [REGLAS.requerido, REGLAS.minLength(3)],
}

const formatFecha = f => f ? new Date(f).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const calcDias = (fin) => {
  if (!fin) return null
  return Math.ceil((new Date(fin) - new Date()) / 86400000)
}

// ── Modal Detalle ─────────────────────────────────────────────────────────────
const ModalProyecto = ({ proyecto, onCerrar, onEditar, onEliminar }) => {
  const cfg = ESTADO_CFG[proyecto.estado] || ESTADO_CFG['Planificación']
  const tareas = proyecto._tareas || []
  const dias = calcDias(proyecto.fecha_fin)
  const statsT = {
    total:       tareas.length,
    pendientes:  tareas.filter(t => t.estado === 'Pendiente').length,
    progreso:    tareas.filter(t => t.estado === 'En Progreso').length,
    revision:    tareas.filter(t => t.estado === 'En Revisión').length,
    completadas: tareas.filter(t => t.estado === 'Completada').length,
  }
  const avanceTotal = tareas.length
    ? Math.round(tareas.reduce((acc, t) => acc + (t.avance || 0), 0) / tareas.length) : 0

  return (
    <div className="ads-modal-overlay" onClick={onCerrar}>
      <div className="ads-modal ads-modal--lg" onClick={e => e.stopPropagation()}>
        <div className="ads-modal-header">
          <div>
            <div style={{ display: 'flex', gap: '8px', marginBottom: '8px', flexWrap: 'wrap' }}>
              <span className="ads-badge" style={{ color: cfg.color, background: cfg.bg }}>
                <span className="ads-dot" style={{ background: cfg.dot }} />{proyecto.estado}
              </span>
              {dias !== null && (
                <span className="ads-badge" style={{ color: dias < 0 ? '#ef4444' : dias <= 7 ? '#f59e0b' : '#10b981', background: dias < 0 ? 'rgba(239,68,68,0.12)' : dias <= 7 ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)' }}>
                  {dias < 0 ? `⚠ Vencido ${Math.abs(dias)}d` : dias === 0 ? '🔥 Vence hoy' : `📅 ${dias}d restantes`}
                </span>
              )}
            </div>
            <h2 className="ads-modal-title">{proyecto.nombre_proyecto}</h2>
            {proyecto.clientes && (
              <p style={{ color: 'var(--ads-sub)', fontSize: '13px', margin: '4px 0 0', fontFamily: 'var(--ads-mono)' }}>
                🏢 {proyecto.clientes.empresa} — {proyecto.clientes.nombre_contacto}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button className="ads-btn ads-btn--secondary ads-btn--sm" onClick={() => { onCerrar(); onEditar(proyecto) }}>✏️ Editar</button>
            <button className="ads-btn ads-btn--danger ads-btn--sm" onClick={() => onEliminar(proyecto.id)}>🗑️</button>
            <button className="ads-modal-close" onClick={onCerrar}>✕</button>
          </div>
        </div>

        <div className="ads-quickinfo ads-quickinfo--4">
          <div className="ads-qi-item"><span className="ads-qi-label">Inicio</span><span className="ads-qi-val">{formatFecha(proyecto.fecha_inicio)}</span></div>
          <div className="ads-qi-item"><span className="ads-qi-label">Vencimiento</span><span className="ads-qi-val">{formatFecha(proyecto.fecha_fin)}</span></div>
          <div className="ads-qi-item"><span className="ads-qi-label">Tareas</span><span className="ads-qi-val" style={{ color: '#3b82f6', fontWeight: 700 }}>{statsT.total}</span></div>
          <div className="ads-qi-item"><span className="ads-qi-label">Avance global</span><span className="ads-qi-val" style={{ color: '#10b981', fontWeight: 700 }}>{avanceTotal}%</span></div>
        </div>

        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: 'var(--ads-sub)', marginBottom: '8px', fontFamily: 'var(--ads-mono)' }}>
            <span>Progreso del proyecto</span><span>{avanceTotal}%</span>
          </div>
          <div className="ads-progress-track" style={{ height: '8px' }}>
            <div className="ads-progress-fill" style={{ width: `${avanceTotal}%`, background: cfg.dot }} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {[
            { label: 'Pendientes',  val: statsT.pendientes,  color: '#64748b' },
            { label: 'En Progreso', val: statsT.progreso,    color: '#3b82f6' },
            { label: 'En Revisión', val: statsT.revision,    color: '#f59e0b' },
            { label: 'Completadas', val: statsT.completadas, color: '#10b981' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--ads-surface2)', border: '1px solid var(--ads-border)', borderRadius: '10px', padding: '12px 14px' }}>
              <div className="ads-stat-label">{s.label}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color, marginTop: '4px' }}>{s.val}</div>
            </div>
          ))}
        </div>

        {proyecto.descripcion && (
          <div style={{ background: 'var(--ads-surface2)', borderRadius: '10px', padding: '16px', border: '1px solid var(--ads-border)' }}>
            <p className="ads-panel-title" style={{ margin: '0 0 8px' }}>Descripción</p>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: '1.7', margin: 0, whiteSpace: 'pre-wrap' }}>{proyecto.descripcion}</p>
          </div>
        )}

        {tareas.length > 0 && (
          <div>
            <p className="ads-panel-title">Tareas ({tareas.length})</p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {tareas.map(t => {
                const tCfg = { 'Pendiente': { color: '#64748b', bg: 'rgba(100,116,139,0.12)' }, 'En Progreso': { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' }, 'En Revisión': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' }, 'Completada': { color: '#10b981', bg: 'rgba(16,185,129,0.12)' } }[t.estado] || {}
                return (
                  <div key={t.id} style={{ background: 'var(--ads-surface2)', border: '1px solid var(--ads-border)', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <p style={{ color: 'var(--ads-text)', fontWeight: 600, margin: 0, fontSize: '13.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titulo}</p>
                      {t.perfiles?.nombre && <p style={{ color: 'var(--ads-sub)', fontSize: '12px', margin: '3px 0 0', fontFamily: 'var(--ads-mono)' }}>👤 {t.perfiles.nombre}</p>}
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                      <div style={{ width: '60px' }}>
                        <div className="ads-progress-track"><div className="ads-progress-fill" style={{ width: `${t.avance || 0}%` }} /></div>
                        <p style={{ color: 'var(--ads-sub)', fontSize: '10px', margin: '2px 0 0', textAlign: 'right', fontFamily: 'var(--ads-mono)' }}>{t.avance || 0}%</p>
                      </div>
                      <span className="ads-badge" style={{ color: tCfg.color, background: tCfg.bg }}>{t.estado}</span>
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Modal Form ────────────────────────────────────────────────────────────────
const ModalForm = ({ editando, datos, onChange, onGuardar, onCerrar, enviando, clientes, errores, onLimpiarError }) => (
  <div className="ads-modal-overlay" onClick={onCerrar}>
    <div className="ads-modal" onClick={e => e.stopPropagation()}>
      <div className="ads-modal-header">
        <h2 className="ads-modal-title">{editando ? '✏️ Editar Proyecto' : '➕ Nuevo Proyecto'}</h2>
        <button className="ads-modal-close" onClick={onCerrar}>✕</button>
      </div>
      <form className="ads-form" onSubmit={onGuardar}>
        <div className="ads-form-row ads-form-row--2">
          <div className="ads-form-group">
            <label className="ads-form-label">Cliente *</label>
            <select
              className={`ads-select ${errores.cliente_id ? 'ads-select--error' : ''}`}
              value={datos.cliente_id}
              onChange={e => { onChange({ ...datos, cliente_id: e.target.value }); onLimpiarError('cliente_id') }}
            >
              <option value="">— Seleccionar —</option>
              {clientes.map(c => <option key={c.id} value={c.id}>{c.empresa}</option>)}
            </select>
            {errores.cliente_id && <span className="ads-error-msg">{errores.cliente_id}</span>}
          </div>
          <div className="ads-form-group">
            <label className="ads-form-label">Nombre del Proyecto *</label>
            <input
              className={`ads-input ${errores.nombre_proyecto ? 'ads-input--error' : ''}`}
              placeholder="Nombre del proyecto"
              value={datos.nombre_proyecto}
              onChange={e => { onChange({ ...datos, nombre_proyecto: e.target.value }); onLimpiarError('nombre_proyecto') }}
            />
            {errores.nombre_proyecto && <span className="ads-error-msg">{errores.nombre_proyecto}</span>}
          </div>
        </div>
        <div className="ads-form-group">
          <label className="ads-form-label">Descripción</label>
          <textarea className="ads-textarea" placeholder="Detalle el alcance del proyecto..." rows={5}
            value={datos.descripcion} onChange={e => onChange({ ...datos, descripcion: e.target.value })} />
        </div>
        <div className="ads-form-row ads-form-row--3">
          <div className="ads-form-group">
            <label className="ads-form-label">Fecha Inicio</label>
            <input className="ads-input" type="date" value={datos.fecha_inicio} onChange={e => onChange({ ...datos, fecha_inicio: e.target.value })} />
          </div>
          <div className="ads-form-group">
            <label className="ads-form-label">Fecha Fin</label>
            <input className="ads-input" type="date" value={datos.fecha_fin} onChange={e => onChange({ ...datos, fecha_fin: e.target.value })} />
          </div>
          <div className="ads-form-group">
            <label className="ads-form-label">Estado</label>
            <select className="ads-select" value={datos.estado} onChange={e => onChange({ ...datos, estado: e.target.value })}>
              <option>Planificación</option><option>En Progreso</option><option>Finalizado</option><option>Cancelado</option>
            </select>
          </div>
        </div>
        <div className="ads-form-actions">
          <button type="submit" className="ads-btn ads-btn--primary" disabled={enviando}>
            {enviando ? 'Guardando...' : editando ? 'Actualizar' : 'Crear Proyecto'}
          </button>
          <button type="button" className="ads-btn ads-btn--secondary" onClick={onCerrar}>Cancelar</button>
        </div>
      </form>
    </div>
  </div>
)

// ── Vista principal ───────────────────────────────────────────────────────────
const ProyectosView = () => {
  const toast = useToast()

  const [proyectos,       setProyectos]       = useState([])
  const [clientes,        setClientes]        = useState([])
  const [todasLasTareas,  setTodasLasTareas]  = useState([])
  const [loading,         setLoading]         = useState(true)
  const [busqueda,        setBusqueda]        = useState('')
  const [filtroEstado,    setFiltroEstado]    = useState(null)
  const [proyectoDetalle, setProyectoDetalle] = useState(null)
  const [mostrarForm,     setMostrarForm]     = useState(false)
  const [editandoId,      setEditandoId]      = useState(null)
  const [enviando,        setEnviando]        = useState(false)
  const [errores,         setErrores]         = useState({})
  const [confirm,         setConfirm]         = useState(null)

  const [formData, setFormData] = useState({
    cliente_id: '', nombre_proyecto: '', descripcion: '',
    fecha_inicio: '', fecha_fin: '', estado: 'Planificación'
  })

  const fetchData = async () => {
    setLoading(true)
    try {
      const [rP, rC, rT] = await Promise.all([apiClient('/proyectos'), apiClient('/clientes'), apiClient('/tareas')])
      if (rP.ok) setProyectos(await rP.json())
      if (rC.ok) setClientes(await rC.json())
      if (rT.ok) setTodasLasTareas(await rT.json())
    } catch {
      toast.error('Error al cargar los datos')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  const stats = {
    total:         proyectos.length,
    planificacion: proyectos.filter(p => p.estado === 'Planificación').length,
    progreso:      proyectos.filter(p => p.estado === 'En Progreso').length,
    finalizados:   proyectos.filter(p => p.estado === 'Finalizado').length,
  }

  const normalizar = t => t?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || ''

  const proyectosFiltrados = proyectos.filter(p => {
    const term = busqueda.toLowerCase()
    const coincide = p.nombre_proyecto?.toLowerCase().includes(term) || p.clientes?.empresa?.toLowerCase().includes(term) || p.descripcion?.toLowerCase().includes(term)
    const estado = filtroEstado ? normalizar(p.estado).includes(normalizar(filtroEstado)) : true
    return coincide && estado
  })

  const abrirForm = (p = null) => {
    setErrores({})
    if (p) {
      setFormData({ cliente_id: p.cliente_id, nombre_proyecto: p.nombre_proyecto, descripcion: p.descripcion || '', fecha_inicio: p.fecha_inicio || '', fecha_fin: p.fecha_fin || '', estado: p.estado })
      setEditandoId(p.id)
    } else {
      setFormData({ cliente_id: '', nombre_proyecto: '', descripcion: '', fecha_inicio: '', fecha_fin: '', estado: 'Planificación' })
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
    const erroresNuevos = validar(formData, ESQUEMA_PROYECTO)
    setErrores(erroresNuevos)
    if (!esValido(erroresNuevos)) {
      toast.warning('Corrige los errores antes de continuar')
      return
    }
    setEnviando(true)
    try {
      const endpoint = editandoId ? `/proyectos/${editandoId}` : '/proyectos'
      const res = await apiClient(endpoint, { method: editandoId ? 'PUT' : 'POST', body: JSON.stringify(formData) })
      if (res.ok) {
        toast.success(editandoId ? 'Proyecto actualizado correctamente' : 'Proyecto creado correctamente')
        cerrarForm()
        fetchData()
      } else {
        toast.error('No se pudo guardar el proyecto')
      }
    } catch {
      toast.error('Error de conexión al guardar')
    } finally {
      setEnviando(false)
    }
  }

  const handleEliminar = async (id) => {
    const proyecto = proyectos.find(p => p.id === id)
    setConfirm({
      titulo:  '¿Eliminar proyecto?',
      mensaje: `Se eliminará "${proyecto?.nombre_proyecto || 'este proyecto'}" y todas sus tareas asociadas. Esta acción no se puede deshacer.`,
      onAceptar: async () => {
        try {
          const res = await apiClient(`/proyectos/${id}`, { method: 'DELETE' })
          if (res.ok) {
            toast.success('Proyecto eliminado')
            setProyectoDetalle(null)
            fetchData()
          } else {
            toast.error('No se pudo eliminar el proyecto')
          }
        } catch {
          toast.error('Error de conexión al eliminar')
        }
      }
    })
  }

  const abrirDetalle = (p) => {
    const tareas = todasLasTareas.filter(t => t.proyecto_id === p.id)
    setProyectoDetalle({ ...p, _tareas: tareas })
  }

  const generarPDFProyectos = () => {
    const doc = new jsPDF('landscape')

    doc.setFontSize(18)
    doc.text('Reporte de Proyectos', 14, 20)

    doc.setFontSize(10)
    doc.text(`Fecha: ${new Date().toLocaleString()}`, 14, 28)

    autoTable(doc, {
      startY: 40,
      head: [[
        'Proyecto',
        'Cliente',
        'Estado',
        'Fecha Inicio',
        'Fecha Fin',
        'Tareas',
        'Responsables',
        'Avance'
      ]],
      body: proyectosFiltrados.map(p => {
        const tareas = todasLasTareas.filter(t => t.proyecto_id === p.id)

        const responsables = [
          ...new Set(
            tareas
              .map(t => t.perfiles?.nombre)
              .filter(Boolean)
          )
        ].join(', ')

        const avance = tareas.length
          ? Math.round(
              tareas.reduce((a, t) => a + (t.avance || 0), 0) / tareas.length
            )
          : 0

        return [
          p.nombre_proyecto || '',
          p.clientes?.empresa || '',
          p.estado || '',
          formatFecha(p.fecha_inicio),
          formatFecha(p.fecha_fin),
          tareas.length,
          responsables || '—',
          `${avance}%`
        ]
      }),
      styles: {
        fontSize: 8
      },
      headStyles: {
        fillColor: [16, 185, 129]
      }
    })

    doc.save('Reporte_Proyectos.pdf')
  }

  return (
    <div className="ads-root">
      <div className="ads-stats">
        {[
          { label: 'Total',         val: stats.total,         color: '#3b82f6', filtro: null },
          { label: 'Planificación', val: stats.planificacion, color: '#8b5cf6', filtro: 'Planificación' },
          { label: 'En Progreso',   val: stats.progreso,      color: '#f59e0b', filtro: 'En Progreso' },
          { label: 'Finalizados',   val: stats.finalizados,   color: '#10b981', filtro: 'Finalizado' },
        ].map(s => (
          <div key={s.label} className={`ads-stat-card ${filtroEstado === s.filtro ? 'ads-stat-card--active' : ''}`} style={{ '--accent': s.color }} onClick={() => setFiltroEstado(filtroEstado === s.filtro ? null : s.filtro)}>
            <span className="ads-stat-label">{s.label}</span>
            <span className="ads-stat-val" style={{ color: s.color }}>{s.val}</span>
          </div>
        ))}
      </div>

      <div className="ads-toolbar">
        <input className="ads-search" placeholder="🔍  Buscar proyecto, cliente o descripción..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        <button className="ads-btn ads-btn--primary" onClick={() => abrirForm()}>+ Nuevo Proyecto</button>
        <button
          className="ads-btn ads-btn--secondary"
          onClick={generarPDFProyectos}
        >
          📄 Exportar PDF
        </button>
      </div>

      {loading ? (
        <div className="ads-loading"><div className="ads-spinner" /><span>Cargando proyectos...</span></div>
      ) : proyectosFiltrados.length === 0 ? (
        <div className="ads-empty"><span className="ads-empty-icon">📁</span><p>No hay proyectos que coincidan.</p></div>
      ) : (
        <div className="ads-grid">
          {proyectosFiltrados.map((p, i) => {
            const cfg = ESTADO_CFG[p.estado] || ESTADO_CFG['Planificación']
            const tareasProy = todasLasTareas.filter(t => t.proyecto_id === p.id)
            const avance = tareasProy.length ? Math.round(tareasProy.reduce((a, t) => a + (t.avance || 0), 0) / tareasProy.length) : 0
            const dias = calcDias(p.fecha_fin)
            return (
              <div key={p.id} className="ads-card" style={{ animationDelay: `${i * 0.04}s` }} onClick={() => abrirDetalle(p)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span className="ads-badge" style={{ color: cfg.color, background: cfg.bg }}><span className="ads-dot" style={{ background: cfg.dot }} />{p.estado}</span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="ads-btn--icon" onClick={e => { e.stopPropagation(); abrirForm(p) }}>✏️</button>
                    <button className="ads-btn--icon danger" onClick={e => { e.stopPropagation(); handleEliminar(p.id) }}>🗑️</button>
                  </div>
                </div>
                <div>
                  <p style={{ color: 'var(--ads-blue)', fontSize: '11px', margin: '0 0 5px', fontFamily: 'var(--ads-mono)', fontWeight: 600 }}>🏢 {p.clientes?.empresa}</p>
                  <h3 style={{ color: 'var(--ads-text)', fontWeight: 700, fontSize: '1rem', margin: 0, lineHeight: 1.3 }}>{p.nombre_proyecto}</h3>
                  {p.descripcion && <p style={{ color: 'var(--ads-sub)', fontSize: '12.5px', margin: '6px 0 0', lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{p.descripcion}</p>}
                </div>
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: 'var(--ads-sub)', marginBottom: '6px', fontFamily: 'var(--ads-mono)' }}>
                    <span>Avance ({tareasProy.length} tareas)</span><span>{avance}%</span>
                  </div>
                  <div className="ads-progress-track"><div className="ads-progress-fill" style={{ width: `${avance}%`, background: cfg.dot }} /></div>
                </div>
                <div style={{ borderTop: '1px solid var(--ads-border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--ads-sub)', fontSize: '11px', fontFamily: 'var(--ads-mono)' }}>{formatFecha(p.fecha_inicio)} → {formatFecha(p.fecha_fin)}</span>
                  {dias !== null && <span style={{ fontSize: '11px', fontWeight: 600, fontFamily: 'var(--ads-mono)', color: dias < 0 ? '#ef4444' : dias <= 7 ? '#f59e0b' : '#10b981' }}>{dias < 0 ? `⚠ ${Math.abs(dias)}d` : `${dias}d`}</span>}
                </div>
              </div>
            )
          })}
        </div>
      )}

      {proyectoDetalle && <ModalProyecto proyecto={proyectoDetalle} onCerrar={() => setProyectoDetalle(null)} onEditar={abrirForm} onEliminar={handleEliminar} />}
      {mostrarForm && <ModalForm editando={!!editandoId} datos={formData} onChange={setFormData} onGuardar={handleGuardar} onCerrar={cerrarForm} enviando={enviando} clientes={clientes} errores={errores} onLimpiarError={limpiarError} />}

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

export default ProyectosView