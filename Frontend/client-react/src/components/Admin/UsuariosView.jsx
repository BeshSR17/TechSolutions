import React, { useState, useEffect } from 'react'
import { apiClient } from '../../apiClient'
import { useToast } from '../shared/Toast'
import { validar, esValido, REGLAS } from '../../hooks/useValidation'
import { supabase } from '../../supabaseClient'
import '../admin-design-system.css'

const ESQUEMA_USUARIO = {
  nombre: [REGLAS.requerido, REGLAS.minLength(3)],
  email:  [REGLAS.requerido, REGLAS.email],
}

const estadoColor = (estado) => {
  if (estado === 'Activo')   return { color: '#10b981', bg: 'rgba(16,185,129,0.12)', dot: '#10b981' }
  if (estado === 'Inactivo') return { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',  dot: '#ef4444' }
  return                            { color: '#64748b', bg: 'rgba(100,116,139,0.12)',dot: '#94a3b8' }
}

const rolColor = (rol) => {
  if (rol === 'Admin') return { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' }
  return                     { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)' }
}

const Avatar = ({ url, nombre, size = 42, fontSize = 16 }) => {
  const inicial = nombre ? nombre.charAt(0).toUpperCase() : '?'
  return (
    <div className="ads-avatar" style={{ width: size, height: size, fontSize, flexShrink: 0 }}>
      {url ? (
        <img src={url} alt={nombre || ''} style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { e.currentTarget.style.display = 'none' }} />
      ) : inicial}
    </div>
  )
}

const UsuariosView = ({ onChatClick }) => {
  const toast = useToast()

  const [usuarios,       setUsuarios]       = useState([])
  const [tareasUsuario,  setTareasUsuario]  = useState([])
  const [loading,        setLoading]        = useState(true)
  const [busqueda,       setBusqueda]       = useState('')
  const [filtroEstado,   setFiltroEstado]   = useState(null)
  const [usuarioDetalle, setUsuarioDetalle] = useState(null)
  const [mostrarForm,    setMostrarForm]    = useState(false)
  const [editandoId,     setEditandoId]     = useState(null)
  const [tabDetalle,     setTabDetalle]     = useState('tareas')
  const [enviando,       setEnviando]       = useState(false)
  const [errores,        setErrores]        = useState({})

  const formVacio = { id_visual: '', nombre: '', email: '', rol: 'Usuario', biografia: '', avatar_url: '', estado: 'Activo' }
  const [formData, setFormData] = useState(formVacio)

  // ── Realtime: actualizar estado de usuarios en tiempo real ────────────────
  useEffect(() => {
    const canal = supabase
      .channel('perfiles-estado')
      .on('postgres_changes', {
        event: 'UPDATE', schema: 'public', table: 'perfiles',
      }, (payload) => {
        // Actualizar solo el estado del usuario que cambió
        setUsuarios(prev => prev.map(u =>
          u.id === payload.new.id ? { ...u, estado: payload.new.estado } : u
        ))
      })
      .subscribe()

    return () => supabase.removeChannel(canal)
  }, [])

  const fetchData = async () => {
    try {
      setLoading(true)
      const res = await apiClient('/perfiles')
      if (res.ok) setUsuarios(await res.json())
      else toast.error('No se pudieron cargar los colaboradores')
    } catch {
      toast.error('Error de conexión al cargar colaboradores')
    } finally {
      setLoading(false)
    }
  }

  const fetchTareas = async (userId) => {
    try {
      const res = await apiClient('/tareas')
      if (res.ok) {
        const todas = await res.json()
        setTareasUsuario(todas.filter(t => t.empleado_id === userId))
      }
    } catch { console.error('Error cargando tareas') }
  }

  useEffect(() => { fetchData() }, [])

  const stats = {
    total:    usuarios.length,
    activos:  usuarios.filter(u => u.estado === 'Activo').length,
    inactivos:usuarios.filter(u => u.estado === 'Inactivo').length,
    admins:   usuarios.filter(u => u.rol === 'Admin').length,
  }

  const usuariosFiltrados = usuarios.filter(u => {
    const term = busqueda.toLowerCase()
    const nombre   = u.nombre    ? u.nombre.toLowerCase()            : ''
    const email    = u.email     ? u.email.toLowerCase()             : ''
    const idVisual = u.id_visual ? String(u.id_visual).toLowerCase() : ''
    const coincideBusqueda = nombre.includes(term) || email.includes(term) || idVisual.includes(term)
    let coincideFiltro = true
    if (filtroEstado === '__admins__') coincideFiltro = u.rol === 'Admin'
    else if (filtroEstado !== null)   coincideFiltro = u.estado === filtroEstado
    return coincideBusqueda && coincideFiltro
  })

  const abrirDetalle = (u) => { setUsuarioDetalle(u); setTabDetalle('tareas'); fetchTareas(u.id) }
  const cerrarDetalle = () => { setUsuarioDetalle(null); setTareasUsuario([]) }

  const abrirForm = (u = null) => {
    setErrores({})
    if (u) {
      setFormData({ id_visual: u.id_visual || '', nombre: u.nombre || '', email: u.email || '', rol: u.rol || 'Usuario', biografia: u.biografia || '', avatar_url: u.avatar_url || '', estado: u.estado || 'Activo' })
      setEditandoId(u.id)
    } else {
      setFormData(formVacio)
      setEditandoId(null)
    }
    setMostrarForm(true)
  }

  const cerrarForm = () => { setMostrarForm(false); setEditandoId(null); setFormData(formVacio); setErrores({}) }

  const limpiarError = (campo) => {
    if (errores[campo]) setErrores(prev => ({ ...prev, [campo]: null }))
  }

  const handleGuardar = async (e) => {
    e.preventDefault()
    const erroresNuevos = validar(formData, ESQUEMA_USUARIO)
    setErrores(erroresNuevos)
    if (!esValido(erroresNuevos)) { toast.warning('Corrige los errores antes de continuar'); return }
    setEnviando(true)
    try {
      const endpoint = editandoId ? `/perfiles/${editandoId}` : '/perfiles'
      const method   = editandoId ? 'PUT' : 'POST'
      const res = await apiClient(endpoint, { method, body: JSON.stringify(formData) })
      if (res.ok) {
        toast.success(editandoId ? 'Colaborador actualizado correctamente' : 'Colaborador creado correctamente')
        cerrarForm(); fetchData()
      } else {
        toast.error('No se pudo guardar el colaborador')
      }
    } catch { toast.error('Error de conexión al guardar') }
    finally { setEnviando(false) }
  }

  return (
    <div className="ads-root">

      {/* STATS */}
      <div className="ads-stats">
        {[
          { label: 'Total',     val: stats.total,     color: '#3b82f6', filtro: null },
          { label: 'Activos',   val: stats.activos,   color: '#10b981', filtro: 'Activo' },
          { label: 'Inactivos', val: stats.inactivos, color: '#ef4444', filtro: 'Inactivo' },
          { label: 'Admins',    val: stats.admins,    color: '#8b5cf6', filtro: '__admins__' },
        ].map(s => (
          <div key={s.label} className={`ads-stat-card ${filtroEstado === s.filtro ? 'ads-stat-card--active' : ''}`} style={{ '--accent': s.color }} onClick={() => setFiltroEstado(filtroEstado === s.filtro ? null : s.filtro)}>
            <span className="ads-stat-label">{s.label}</span>
            <span className="ads-stat-val" style={{ color: s.color }}>{s.val}</span>
          </div>
        ))}
      </div>

      {/* TOOLBAR */}
      <div className="ads-toolbar">
        <input className="ads-search" placeholder="🔍  Buscar colaborador, email o ID..." value={busqueda} onChange={e => setBusqueda(e.target.value)} />
        <button className="ads-btn ads-btn--primary" onClick={() => abrirForm()}>+ Nuevo Colaborador</button>
      </div>

      {/* GRID */}
      {loading ? (
        <div className="ads-loading"><div className="ads-spinner" /><span>Cargando equipo...</span></div>
      ) : usuariosFiltrados.length === 0 ? (
        <div className="ads-empty"><span className="ads-empty-icon">👥</span><p>No hay colaboradores que coincidan.</p></div>
      ) : (
        <div className="ads-grid">
          {usuariosFiltrados.map((u, i) => {
            const eCfg = estadoColor(u.estado)
            const rCfg = rolColor(u.rol)
            return (
              <div key={u.id} className="ads-card" style={{ animationDelay: `${i * 0.04}s` }} onClick={() => abrirDetalle(u)}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                    <Avatar url={u.avatar_url} nombre={u.nombre} size={44} fontSize={16} />
                    <div>
                      <h3 style={{ color: 'var(--ads-text)', fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>{u.nombre || '—'}</h3>
                      <p style={{ color: 'var(--ads-sub)', fontSize: '12px', margin: '3px 0 0', fontFamily: 'var(--ads-mono)' }}>{u.email || '—'}</p>
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '5px', flexShrink: 0 }}>
                    <button className="ads-btn--icon" title="Editar" onClick={e => { e.stopPropagation(); abrirForm(u) }}>✏️</button>
                    {onChatClick && <button className="ads-btn--icon" title={`Chat con ${u.nombre}`} onClick={e => { e.stopPropagation(); onChatClick(u) }} style={{ color: '#3b82f6', borderColor: 'rgba(59,130,246,0.3)', background: 'rgba(59,130,246,0.08)' }}>💬</button>}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                  {/* Estado = indicador de presencia en tiempo real */}
                  <span className="ads-badge" style={{ color: eCfg.color, background: eCfg.bg }}>
                    <span className="ads-dot" style={{
                      background: eCfg.dot,
                      boxShadow: u.estado === 'Activo' ? `0 0 6px ${eCfg.dot}` : 'none',
                      animation: u.estado === 'Activo' ? 'pulse 2s ease-in-out infinite' : 'none',
                    }} />
                    {u.estado === 'Activo' ? 'En línea' : 'Desconectado'}
                  </span>
                  <span className="ads-badge" style={{ color: rCfg.color, background: rCfg.bg }}>{u.rol || 'Usuario'}</span>
                  {u.id_visual && <span style={{ fontFamily: 'var(--ads-mono)', fontSize: '11px', color: 'var(--ads-muted)', alignSelf: 'center' }}>#{u.id_visual}</span>}
                </div>
                {u.biografia && <p style={{ color: 'var(--ads-sub)', fontSize: '12.5px', margin: 0, lineHeight: 1.5, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{u.biografia}</p>}
                <div style={{ borderTop: '1px solid var(--ads-border)', paddingTop: '10px', display: 'flex', justifyContent: 'flex-end' }}>
                  <span style={{ color: 'var(--ads-blue)', fontSize: '12px' }}>Ver perfil →</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* MODAL DETALLE */}
      {usuarioDetalle && (
        <div className="ads-modal-overlay" onClick={cerrarDetalle}>
          <div className="ads-modal ads-modal--lg" onClick={e => e.stopPropagation()}>
            <div className="ads-modal-header">
              <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <Avatar url={usuarioDetalle.avatar_url} nombre={usuarioDetalle.nombre} size={60} fontSize={22} />
                <div>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '6px', flexWrap: 'wrap', alignItems: 'center' }}>
                    {usuarioDetalle.id_visual && <span style={{ fontFamily: 'var(--ads-mono)', fontSize: '11px', color: 'var(--ads-sub)' }}>#{usuarioDetalle.id_visual}</span>}
                    <span className="ads-badge" style={{ color: estadoColor(usuarioDetalle.estado).color, background: estadoColor(usuarioDetalle.estado).bg }}>
                      <span className="ads-dot" style={{
                        background: estadoColor(usuarioDetalle.estado).dot,
                        boxShadow: usuarioDetalle.estado === 'Activo' ? `0 0 6px ${estadoColor(usuarioDetalle.estado).dot}` : 'none',
                        animation: usuarioDetalle.estado === 'Activo' ? 'pulse 2s ease-in-out infinite' : 'none',
                      }} />
                      {usuarioDetalle.estado === 'Activo' ? 'En línea ahora' : 'Desconectado'}
                    </span>
                    <span className="ads-badge" style={{ color: rolColor(usuarioDetalle.rol).color, background: rolColor(usuarioDetalle.rol).bg }}>{usuarioDetalle.rol || 'Usuario'}</span>
                  </div>
                  <h2 className="ads-modal-title">{usuarioDetalle.nombre}</h2>
                  <p style={{ color: 'var(--ads-sub)', fontSize: '13px', margin: '3px 0 0', fontFamily: 'var(--ads-mono)' }}>{usuarioDetalle.email}</p>
                </div>
              </div>
              <div style={{ display: 'flex', gap: '8px', flexShrink: 0, alignSelf: 'flex-start' }}>
                <button className="ads-btn ads-btn--secondary ads-btn--sm" onClick={() => { cerrarDetalle(); abrirForm(usuarioDetalle) }}>✏️ Editar</button>
                {onChatClick && <button className="ads-btn ads-btn--primary ads-btn--sm" onClick={() => onChatClick(usuarioDetalle)}>💬 Chat</button>}
                <button className="ads-modal-close" onClick={cerrarDetalle}>✕</button>
              </div>
            </div>

            <div className="ads-quickinfo ads-quickinfo--4">
              <div className="ads-qi-item"><span className="ads-qi-label">Tareas</span><span className="ads-qi-val" style={{ color: '#3b82f6', fontWeight: 700 }}>{tareasUsuario.length}</span></div>
              <div className="ads-qi-item"><span className="ads-qi-label">En Progreso</span><span className="ads-qi-val" style={{ color: '#3b82f6', fontWeight: 700 }}>{tareasUsuario.filter(t => t.estado === 'En Progreso').length}</span></div>
              <div className="ads-qi-item"><span className="ads-qi-label">Completadas</span><span className="ads-qi-val" style={{ color: '#10b981', fontWeight: 700 }}>{tareasUsuario.filter(t => t.estado === 'Completada').length}</span></div>
              <div className="ads-qi-item"><span className="ads-qi-label">Avance prom.</span><span className="ads-qi-val" style={{ color: '#f59e0b', fontWeight: 700 }}>{tareasUsuario.length ? Math.round(tareasUsuario.reduce((a, t) => a + (t.avance || 0), 0) / tareasUsuario.length) : 0}%</span></div>
            </div>

            <div className="ads-tabs">
              <button className={`ads-tab ${tabDetalle === 'tareas' ? 'ads-tab--active' : ''}`} onClick={() => setTabDetalle('tareas')}>📋 Tareas ({tareasUsuario.length})</button>
              <button className={`ads-tab ${tabDetalle === 'perfil' ? 'ads-tab--active' : ''}`} onClick={() => setTabDetalle('perfil')}>👤 Perfil</button>
            </div>

            {tabDetalle === 'tareas' && (
              <div className="ads-tab-content">
                {tareasUsuario.length === 0 ? (
                  <div className="ads-empty"><span className="ads-empty-icon">📋</span><p>Sin tareas asignadas actualmente.</p></div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {tareasUsuario.map(t => {
                      const TAREA_ESTADOS = { 'Pendiente': { color: '#64748b', bg: 'rgba(100,116,139,0.12)', dot: '#94a3b8' }, 'En Progreso': { color: '#3b82f6', bg: 'rgba(59,130,246,0.12)', dot: '#3b82f6' }, 'En Revisión': { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', dot: '#f59e0b' }, 'Completada': { color: '#10b981', bg: 'rgba(16,185,129,0.12)', dot: '#10b981' } }
                      const tCfg = TAREA_ESTADOS[t.estado] || TAREA_ESTADOS['Pendiente']
                      return (
                        <div key={t.id} style={{ background: 'var(--ads-surface2)', border: '1px solid var(--ads-border)', borderRadius: '10px', padding: '12px 16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '12px' }}>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <p style={{ color: 'var(--ads-text)', fontWeight: 600, margin: 0, fontSize: '13.5px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{t.titulo}</p>
                            <p style={{ color: 'var(--ads-sub)', fontSize: '12px', margin: '3px 0 0', fontFamily: 'var(--ads-mono)' }}>📁 {t.proyectos?.nombre_proyecto || '—'}</p>
                          </div>
                          <div style={{ display: 'flex', gap: '8px', alignItems: 'center', flexShrink: 0 }}>
                            <div style={{ width: '56px' }}>
                              <div className="ads-progress-track"><div className="ads-progress-fill" style={{ width: `${t.avance || 0}%`, background: tCfg.dot }} /></div>
                              <p style={{ color: 'var(--ads-sub)', fontSize: '10px', margin: '2px 0 0', textAlign: 'right', fontFamily: 'var(--ads-mono)' }}>{t.avance || 0}%</p>
                            </div>
                            <span className="ads-badge" style={{ color: tCfg.color, background: tCfg.bg }}><span className="ads-dot" style={{ background: tCfg.dot }} />{t.estado}</span>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>
            )}

            {tabDetalle === 'perfil' && (
              <div className="ads-tab-content" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div style={{ background: 'var(--ads-surface2)', border: '1px solid var(--ads-border)', borderRadius: '10px', padding: '16px' }}>
                  <p className="ads-panel-title">Información</p>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '13px' }}>
                    <div><span style={{ color: 'var(--ads-sub)' }}>Rol: </span><span style={{ color: 'var(--ads-text)' }}>{usuarioDetalle.rol || '—'}</span></div>
                    <div><span style={{ color: 'var(--ads-sub)' }}>Estado: </span><span style={{ color: 'var(--ads-text)' }}>{usuarioDetalle.estado || '—'}</span></div>
                    <div><span style={{ color: 'var(--ads-sub)' }}>Email: </span><span style={{ color: 'var(--ads-text)', fontFamily: 'var(--ads-mono)', fontSize: '12px' }}>{usuarioDetalle.email || '—'}</span></div>
                  </div>
                </div>
                <div style={{ background: 'var(--ads-surface2)', border: '1px solid var(--ads-border)', borderRadius: '10px', padding: '16px' }}>
                  <p className="ads-panel-title">Biografía</p>
                  <p style={{ color: '#94a3b8', fontSize: '13px', lineHeight: '1.6', margin: 0, whiteSpace: 'pre-wrap' }}>{usuarioDetalle.biografia || 'Sin descripción registrada.'}</p>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL FORM */}
      {mostrarForm && (
        <div className="ads-modal-overlay" onClick={cerrarForm}>
          <div className="ads-modal" onClick={e => e.stopPropagation()}>
            <div className="ads-modal-header">
              <h2 className="ads-modal-title">{editandoId ? '✏️ Editar Colaborador' : '👤 Nuevo Colaborador'}</h2>
              <button className="ads-modal-close" onClick={cerrarForm}>✕</button>
            </div>
            <form className="ads-form" onSubmit={handleGuardar}>
              <div className="ads-form-row ads-form-row--3">
                <div className="ads-form-group">
                  <label className="ads-form-label">ID Visual</label>
                  <input className="ads-input" placeholder="EMP-01" value={formData.id_visual} onChange={e => setFormData({ ...formData, id_visual: e.target.value })} />
                </div>
                <div className="ads-form-group">
                  <label className="ads-form-label">Nombre *</label>
                  <input className={`ads-input ${errores.nombre ? 'ads-input--error' : ''}`} placeholder="Nombre completo" value={formData.nombre}
                    onChange={e => { setFormData({ ...formData, nombre: e.target.value }); limpiarError('nombre') }} />
                  {errores.nombre && <span className="ads-error-msg">{errores.nombre}</span>}
                </div>
                <div className="ads-form-group">
                  <label className="ads-form-label">Email *</label>
                  <input className={`ads-input ${errores.email ? 'ads-input--error' : ''}`} type="text" placeholder="correo@empresa.com" value={formData.email}
                    onChange={e => { setFormData({ ...formData, email: e.target.value }); limpiarError('email') }} />
                  {errores.email && <span className="ads-error-msg">{errores.email}</span>}
                </div>
              </div>
              <div className="ads-form-group">
                <label className="ads-form-label">Biografía</label>
                <textarea className="ads-textarea" placeholder="Habilidades, notas..." rows={4} value={formData.biografia} onChange={e => setFormData({ ...formData, biografia: e.target.value })} />
              </div>
              <div className="ads-form-row ads-form-row--3">
                <div className="ads-form-group">
                  <label className="ads-form-label">Rol</label>
                  <select className="ads-select" value={formData.rol} onChange={e => setFormData({ ...formData, rol: e.target.value })}>
                    <option value="Usuario">Empleado</option><option value="Admin">Admin</option>
                  </select>
                </div>
                <div className="ads-form-group">
                  <label className="ads-form-label">Estado</label>
                  <select className="ads-select" value={formData.estado} onChange={e => setFormData({ ...formData, estado: e.target.value })}>
                    <option value="Activo">Activo</option><option value="Inactivo">Inactivo</option>
                  </select>
                </div>
                <div className="ads-form-group">
                  <label className="ads-form-label">URL Avatar</label>
                  <input className="ads-input" placeholder="https://..." value={formData.avatar_url} onChange={e => setFormData({ ...formData, avatar_url: e.target.value })} />
                </div>
              </div>
              <div className="ads-form-actions">
                <button type="submit" className="ads-btn ads-btn--primary" disabled={enviando}>{enviando ? 'Guardando...' : editandoId ? 'Actualizar' : 'Crear Colaborador'}</button>
                <button type="button" className="ads-btn ads-btn--secondary" onClick={cerrarForm}>Cancelar</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default UsuariosView