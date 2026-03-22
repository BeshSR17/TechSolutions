import React, { useState, useEffect } from 'react'
import { apiClient } from '../../apiClient'
import { useToast } from '../shared/Toast'
import { validar, esValido, REGLAS } from '../../hooks/useValidation'
import ConfirmModal from '../shared/ConfirmModal'
import '../admin-design-system.css'

// ── Configs ───────────────────────────────────────────────────────────────────
const ESTADO_CFG = {
  'Activo':   { color: '#10b981', bg: 'rgba(16,185,129,0.12)', dot: '#10b981' },
  'Inactivo': { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  dot: '#ef4444' },
}

const ESQUEMA_CLIENTE = {
  empresa:         [REGLAS.requerido, REGLAS.minLength(2)],
  nombre_contacto: [REGLAS.requerido, REGLAS.minLength(3)],
  email:           [REGLAS.requerido, REGLAS.email],
  telefono:        [REGLAS.telefono],
}

// ── Modal Detalle ─────────────────────────────────────────────────────────────
const ModalCliente = ({ cliente, onCerrar, onEditar, onEliminar }) => {
  const [tab, setTab] = useState('proyectos')
  const cfg = ESTADO_CFG[cliente.estado] || ESTADO_CFG['Activo']
  const proyectos = cliente.proyectos || []

  const estadosProy = {
    total:       proyectos.length,
    activos:     proyectos.filter(p => p.estado === 'En Progreso').length,
    finalizados: proyectos.filter(p => p.estado === 'Finalizado').length,
  }

  return (
    <div className="ads-modal-overlay" onClick={onCerrar}>
      <div className="ads-modal ads-modal--lg" onClick={e => e.stopPropagation()}>

        <div className="ads-modal-header">
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
              <span className="ads-badge" style={{ color: cfg.color, background: cfg.bg }}>
                <span className="ads-dot" style={{ background: cfg.dot }} />
                {cliente.estado}
              </span>
            </div>
            <h2 className="ads-modal-title">{cliente.empresa}</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button className="ads-btn ads-btn--secondary ads-btn--sm" onClick={() => { onCerrar(); onEditar(cliente) }}>✏️ Editar</button>
            <button className="ads-btn ads-btn--danger ads-btn--sm" onClick={() => onEliminar(cliente.id, cliente.empresa)}>🗑️</button>
            <button className="ads-modal-close" onClick={onCerrar}>✕</button>
          </div>
        </div>

        <div className="ads-quickinfo ads-quickinfo--4">
          <div className="ads-qi-item"><span className="ads-qi-label">Contacto</span><span className="ads-qi-val">{cliente.nombre_contacto}</span></div>
          <div className="ads-qi-item"><span className="ads-qi-label">Email</span><span className="ads-qi-val" style={{ fontSize: '12px' }}>{cliente.email}</span></div>
          <div className="ads-qi-item"><span className="ads-qi-label">Teléfono</span><span className="ads-qi-val">{cliente.telefono || '—'}</span></div>
          <div className="ads-qi-item"><span className="ads-qi-label">Proyectos</span><span className="ads-qi-val" style={{ color: '#3b82f6', fontWeight: 700 }}>{estadosProy.total}</span></div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
          {[
            { label: 'Total',       val: estadosProy.total,       color: '#3b82f6' },
            { label: 'En Progreso', val: estadosProy.activos,     color: '#f59e0b' },
            { label: 'Finalizados', val: estadosProy.finalizados, color: '#10b981' },
          ].map(s => (
            <div key={s.label} style={{ background: 'var(--ads-surface2)', border: '1px solid var(--ads-border)', borderRadius: '10px', padding: '12px 16px' }}>
              <div className="ads-stat-label">{s.label}</div>
              <div style={{ fontSize: '1.4rem', fontWeight: 800, color: s.color, marginTop: '4px' }}>{s.val}</div>
            </div>
          ))}
        </div>

        <div className="ads-tabs">
          <button className={`ads-tab ${tab === 'proyectos' ? 'ads-tab--active' : ''}`} onClick={() => setTab('proyectos')}>
            📁 Proyectos ({proyectos.length})
          </button>
        </div>

        <div className="ads-tab-content">
          {proyectos.length === 0 ? (
            <div className="ads-empty"><span className="ads-empty-icon">📂</span><p>Este cliente no tiene proyectos aún.</p></div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {proyectos.map(p => {
                const pCfg = {
                  'Planificación': { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
                  'En Progreso':   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
                  'Finalizado':    { color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
                }[p.estado] || { color: '#64748b', bg: 'rgba(100,116,139,0.12)' }
                return (
                  <div key={p.id} style={{ background: 'var(--ads-surface2)', border: '1px solid var(--ads-border)', borderRadius: '10px', padding: '14px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <p style={{ color: 'var(--ads-text)', fontWeight: 600, margin: 0 }}>{p.nombre_proyecto}</p>
                      {p.fecha_fin && (
                        <p style={{ color: 'var(--ads-sub)', fontSize: '12px', margin: '3px 0 0', fontFamily: 'var(--ads-mono)' }}>
                          Fin: {new Date(p.fecha_fin).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </p>
                      )}
                    </div>
                    <span className="ads-badge" style={{ color: pCfg.color, background: pCfg.bg }}>{p.estado}</span>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── Modal Formulario ──────────────────────────────────────────────────────────
const ModalForm = ({ editando, datos, onChange, onGuardar, onCerrar, enviando, errores, onLimpiarError }) => (
  <div className="ads-modal-overlay" onClick={onCerrar}>
    <div className="ads-modal" onClick={e => e.stopPropagation()}>
      <div className="ads-modal-header">
        <h2 className="ads-modal-title">{editando ? '✏️ Editar Cliente' : '➕ Nuevo Cliente'}</h2>
        <button className="ads-modal-close" onClick={onCerrar}>✕</button>
      </div>

      <form className="ads-form" onSubmit={onGuardar}>
        <div className="ads-form-row ads-form-row--2">
          <div className="ads-form-group">
            <label className="ads-form-label">Empresa *</label>
            <input
              className={`ads-input ${errores.empresa ? 'ads-input--error' : ''}`}
              placeholder="Nombre de la empresa"
              value={datos.empresa}
              onChange={e => { onChange({ ...datos, empresa: e.target.value }); onLimpiarError('empresa') }}
            />
            {errores.empresa && <span className="ads-error-msg">{errores.empresa}</span>}
          </div>
          <div className="ads-form-group">
            <label className="ads-form-label">Contacto *</label>
            <input
              className={`ads-input ${errores.nombre_contacto ? 'ads-input--error' : ''}`}
              placeholder="Nombre del contacto"
              value={datos.nombre_contacto}
              onChange={e => { onChange({ ...datos, nombre_contacto: e.target.value }); onLimpiarError('nombre_contacto') }}
            />
            {errores.nombre_contacto && <span className="ads-error-msg">{errores.nombre_contacto}</span>}
          </div>
        </div>

        <div className="ads-form-row ads-form-row--2">
          <div className="ads-form-group">
            <label className="ads-form-label">Email *</label>
            <input
              className={`ads-input ${errores.email ? 'ads-input--error' : ''}`}
              type="text"
              placeholder="correo@empresa.com"
              value={datos.email}
              onChange={e => { onChange({ ...datos, email: e.target.value }); onLimpiarError('email') }}
            />
            {errores.email && <span className="ads-error-msg">{errores.email}</span>}
          </div>
          <div className="ads-form-group">
            <label className="ads-form-label">Teléfono</label>
            <input
              className={`ads-input ${errores.telefono ? 'ads-input--error' : ''}`}
              placeholder="+502 0000-0000"
              value={datos.telefono}
              onChange={e => { onChange({ ...datos, telefono: e.target.value }); onLimpiarError('telefono') }}
            />
            {errores.telefono && <span className="ads-error-msg">{errores.telefono}</span>}
          </div>
        </div>

        <div className="ads-form-group">
          <label className="ads-form-label">Estado</label>
          <select className="ads-select" value={datos.estado} onChange={e => onChange({ ...datos, estado: e.target.value })}>
            <option value="Activo">Activo</option>
            <option value="Inactivo">Inactivo</option>
          </select>
        </div>

        <div className="ads-form-actions">
          <button type="submit" className="ads-btn ads-btn--primary" disabled={enviando}>
            {enviando ? 'Guardando...' : editando ? 'Actualizar' : 'Registrar Cliente'}
          </button>
          <button type="button" className="ads-btn ads-btn--secondary" onClick={onCerrar}>Cancelar</button>
        </div>
      </form>
    </div>
  </div>
)

// ── Vista principal ───────────────────────────────────────────────────────────
const ClientesView = () => {
  const toast = useToast()

  const [clientes,       setClientes]       = useState([])
  const [loading,        setLoading]        = useState(true)
  const [busqueda,       setBusqueda]       = useState('')
  const [filtroEstado,   setFiltroEstado]   = useState(null)
  const [clienteDetalle, setClienteDetalle] = useState(null)
  const [mostrarForm,    setMostrarForm]    = useState(false)
  const [editandoId,     setEditandoId]     = useState(null)
  const [enviando,       setEnviando]       = useState(false)
  const [errores,        setErrores]        = useState({})
  const [confirm,        setConfirm]        = useState(null)

  const [formData, setFormData] = useState({
    empresa: '', nombre_contacto: '', email: '', telefono: '', estado: 'Activo'
  })

  const fetchClientes = async () => {
    try {
      setLoading(true)
      const res = await apiClient('/clientes')
      if (res.ok) setClientes(await res.json())
      else toast.error('No se pudieron cargar los clientes')
    } catch {
      toast.error('Error de conexión al cargar clientes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchClientes() }, [])

  const stats = {
    total:        clientes.length,
    activos:      clientes.filter(c => c.estado === 'Activo').length,
    inactivos:    clientes.filter(c => c.estado === 'Inactivo').length,
    sinProyectos: clientes.filter(c => !c.proyectos || c.proyectos.length === 0).length,
  }

  const clientesFiltrados = clientes.filter(c => {
    const term = busqueda.toLowerCase()
    const coincide = c.empresa?.toLowerCase().includes(term) || c.nombre_contacto?.toLowerCase().includes(term)
    const estado = filtroEstado === 'Sin Proyectos'
      ? (!c.proyectos || c.proyectos.length === 0)
      : filtroEstado ? c.estado === filtroEstado : true
    return coincide && estado
  })

  const abrirForm = (cliente = null) => {
    setErrores({})
    if (cliente) {
      setFormData({ empresa: cliente.empresa, nombre_contacto: cliente.nombre_contacto, email: cliente.email, telefono: cliente.telefono || '', estado: cliente.estado })
      setEditandoId(cliente.id)
    } else {
      setFormData({ empresa: '', nombre_contacto: '', email: '', telefono: '', estado: 'Activo' })
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

    const erroresNuevos = validar(formData, ESQUEMA_CLIENTE)
    setErrores(erroresNuevos)
    if (!esValido(erroresNuevos)) {
      toast.warning('Corrige los errores antes de continuar')
      return
    }

    setEnviando(true)
    try {
      const endpoint = editandoId ? `/clientes/${editandoId}` : '/clientes'
      const res = await apiClient(endpoint, { method: editandoId ? 'PUT' : 'POST', body: JSON.stringify(formData) })
      if (res.ok) {
        toast.success(editandoId ? 'Cliente actualizado correctamente' : 'Cliente registrado correctamente')
        cerrarForm()
        fetchClientes()
      } else {
        toast.error('No se pudo guardar el cliente')
      }
    } catch {
      toast.error('Error de conexión al guardar')
    } finally {
      setEnviando(false)
    }
  }

  const handleEliminar = async (id, nombre) => {
    setConfirm({
      titulo:   '¿Eliminar cliente?',
      mensaje:  `Se eliminará "${nombre}" y todos sus datos asociados. Esta acción no se puede deshacer.`,
      onAceptar: async () => {
        try {
          const res = await apiClient(`/clientes/${id}`, { method: 'DELETE' })
          if (res.ok) {
            toast.success(`Cliente "${nombre}" eliminado`)
            setClienteDetalle(null)
            fetchClientes()
          } else {
            toast.error('No se pudo eliminar el cliente')
          }
        } catch {
          toast.error('Error de conexión al eliminar')
        }
      }
    })
  }

  return (
    <div className="ads-root">

      {/* Stats */}
      <div className="ads-stats">
        {[
          { label: 'Total',         val: stats.total,         color: '#3b82f6', filtro: null },
          { label: 'Activos',       val: stats.activos,       color: '#10b981', filtro: 'Activo' },
          { label: 'Inactivos',     val: stats.inactivos,     color: '#ef4444', filtro: 'Inactivo' },
          { label: 'Sin Proyectos', val: stats.sinProyectos,  color: '#f59e0b', filtro: 'Sin Proyectos' },
        ].map(s => (
          <div key={s.label}
            className={`ads-stat-card ${filtroEstado === s.filtro ? 'ads-stat-card--active' : ''}`}
            style={{ '--accent': s.color }}
            onClick={() => setFiltroEstado(filtroEstado === s.filtro ? null : s.filtro)}
          >
            <span className="ads-stat-label">{s.label}</span>
            <span className="ads-stat-val" style={{ color: s.color }}>{s.val}</span>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div className="ads-toolbar">
        <input className="ads-search" placeholder="🔍  Buscar empresa o contacto..."
          value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        <button className="ads-btn ads-btn--primary" onClick={() => abrirForm()}>+ Nuevo Cliente</button>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="ads-loading"><div className="ads-spinner" /><span>Cargando clientes...</span></div>
      ) : clientesFiltrados.length === 0 ? (
        <div className="ads-empty"><span className="ads-empty-icon">🏢</span><p>No hay clientes que coincidan.</p></div>
      ) : (
        <div className="ads-grid">
          {clientesFiltrados.map((c, i) => {
            const cfg = ESTADO_CFG[c.estado] || ESTADO_CFG['Activo']
            const numProyectos = c.proyectos?.length || 0
            return (
              <div key={c.id} className="ads-card" style={{ animationDelay: `${i * 0.04}s` }} onClick={() => setClienteDetalle(c)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <span className="ads-badge" style={{ color: cfg.color, background: cfg.bg }}>
                    <span className="ads-dot" style={{ background: cfg.dot }} />{c.estado}
                  </span>
                  <div style={{ display: 'flex', gap: '6px' }}>
                    <button className="ads-btn--icon" title="Editar" onClick={e => { e.stopPropagation(); abrirForm(c) }}>✏️</button>
                    <button className="ads-btn--icon danger" title="Eliminar" onClick={e => { e.stopPropagation(); handleEliminar(c.id, c.empresa) }}>🗑️</button>
                  </div>
                </div>
                <div>
                  <h3 style={{ color: 'var(--ads-text)', fontWeight: 700, fontSize: '1rem', margin: 0 }}>{c.empresa}</h3>
                  <p style={{ color: 'var(--ads-sub)', fontSize: '13px', margin: '4px 0 0', fontFamily: 'var(--ads-mono)' }}>👤 {c.nombre_contacto}</p>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
                  <p style={{ color: 'var(--ads-muted)', fontSize: '12px', margin: 0, fontFamily: 'var(--ads-mono)' }}>✉ {c.email}</p>
                  {c.telefono && <p style={{ color: 'var(--ads-muted)', fontSize: '12px', margin: 0, fontFamily: 'var(--ads-mono)' }}>📞 {c.telefono}</p>}
                </div>
                <div style={{ borderTop: '1px solid var(--ads-border)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ color: 'var(--ads-sub)', fontSize: '12px', fontFamily: 'var(--ads-mono)' }}>
                    {numProyectos} proyecto{numProyectos !== 1 ? 's' : ''}
                  </span>
                  <span style={{ color: 'var(--ads-blue)', fontSize: '12px' }}>Ver detalle →</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {clienteDetalle && (
        <ModalCliente
          cliente={clienteDetalle}
          onCerrar={() => setClienteDetalle(null)}
          onEditar={abrirForm}
          onEliminar={handleEliminar}
        />
      )}

      {mostrarForm && (
        <ModalForm
          editando={!!editandoId}
          datos={formData}
          onChange={setFormData}
          onGuardar={handleGuardar}
          onCerrar={cerrarForm}
          enviando={enviando}
          errores={errores}
          onLimpiarError={limpiarError}
        />
      )}

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

export default ClientesView