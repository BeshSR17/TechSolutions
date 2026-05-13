// src/components/cliente/ClienteDashboard.jsx
import React, { useState, useEffect, useCallback } from 'react'
import { apiClient } from '../../apiClient'
import { useToast } from '../shared/Toast'
import {
  generarPDFClienteProyectos,
  generarPDFClienteTareas,
} from '../../hooks/pdfGenerator'

// ── Paleta de estados / prioridades ──────────────────────────────────────────
const ESTADO_PROYECTO = {
  'Planificación': { color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)', dot: '#8b5cf6' },
  'En Progreso':   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)',  dot: '#f59e0b' },
  'Finalizado':    { color: '#10b981', bg: 'rgba(16,185,129,0.12)',  dot: '#10b981' },
  'Cancelado':     { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   dot: '#ef4444' },
}

const ESTADO_TAREA = {
  'Pendiente':   { color: '#64748b', bg: 'rgba(100,116,139,0.15)', dot: '#94a3b8' },
  'En Progreso': { color: '#3b82f6', bg: 'rgba(59,130,246,0.15)',  dot: '#3b82f6' },
  'En Revisión': { color: '#f59e0b', bg: 'rgba(245,158,11,0.15)',  dot: '#f59e0b' },
  'Completada':  { color: '#10b981', bg: 'rgba(16,185,129,0.15)',  dot: '#10b981' },
}

const PRIORIDAD_CFG = {
  'Urgente': { color: '#ef4444', bg: 'rgba(239,68,68,0.12)',   icon: '🔴' },
  'Alta':    { color: '#f97316', bg: 'rgba(249,115,22,0.12)',  icon: '🟠' },
  'Media':   { color: '#f59e0b', bg: 'rgba(245,158,11,0.12)', icon: '🟡' },
  'Baja':    { color: '#10b981', bg: 'rgba(16,185,129,0.12)', icon: '🟢' },
}

const fmt = (f) => f
  ? new Date(f).toLocaleDateString('es-GT', { day: 'numeric', month: 'short', year: 'numeric' })
  : '—'

const calcDias = (fin) => {
  if (!fin) return null
  return Math.ceil((new Date(fin) - new Date()) / 86400000)
}

// ── Badge reutilizable ────────────────────────────────────────────────────────
const Badge = ({ label, color, bg, dot }) => (
  <span style={{
    display: 'inline-flex', alignItems: 'center', gap: '5px',
    padding: '3px 10px', borderRadius: '999px', fontSize: '11.5px',
    fontWeight: 600, color, background: bg,
  }}>
    {dot && <span style={{ width: 6, height: 6, borderRadius: '50%', background: dot, display: 'inline-block' }} />}
    {label}
  </span>
)

// ── Modal Detalle Tarea ───────────────────────────────────────────────────────
const ModalTarea = ({ tarea, onCerrar, clienteInfo, proyecto }) => {
  const eCfg = ESTADO_TAREA[tarea.estado]  || ESTADO_TAREA['Pendiente']
  const pCfg = PRIORIDAD_CFG[tarea.prioridad] || PRIORIDAD_CFG['Baja']
  const dias = calcDias(tarea.fecha_finalizacion)

  const handleExportarTarea = () => {
    generarPDFClienteTareas(clienteInfo, proyecto, [tarea])
  }

  return (
    <div style={styles.overlay} onClick={onCerrar}>
      <div style={styles.modal} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div style={styles.modalHeader}>
          <div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <span style={{ fontFamily: 'monospace', fontSize: '11px', color: '#64748b',
                background: 'rgba(100,116,139,0.12)', padding: '2px 8px', borderRadius: '6px' }}>
                {tarea.codigo_serie}
              </span>
              <Badge label={`${pCfg.icon} ${tarea.prioridad}`} color={pCfg.color} bg={pCfg.bg} />
              <Badge label={tarea.estado} color={eCfg.color} bg={eCfg.bg} dot={eCfg.dot} />
            </div>
            <h2 style={styles.modalTitulo}>{tarea.titulo}</h2>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button style={styles.btnSecondary} onClick={handleExportarTarea}>📄 Exportar PDF</button>
            <button style={styles.btnClose} onClick={onCerrar}>✕</button>
          </div>
        </div>

        {/* Quick info */}
        <div style={styles.quickInfo}>
          {[
            { label: 'Proyecto',     val: tarea.proyectos?.nombre_proyecto || '—' },
            { label: 'Responsable',  val: tarea.perfiles?.nombre || '—' },
            { label: 'Inicio',       val: fmt(tarea.fecha_inicio) },
            { label: 'Vencimiento',  val: fmt(tarea.fecha_finalizacion) },
          ].map(it => (
            <div key={it.label} style={styles.qiItem}>
              <span style={styles.qiLabel}>{it.label}</span>
              <span style={styles.qiVal}>{it.val}</span>
            </div>
          ))}
        </div>

        {/* Barra de avance */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px',
            color: 'var(--ads-sub, #64748b)', marginBottom: '6px' }}>
            <span>Avance de la tarea</span>
            <strong style={{ color: '#10b981' }}>{tarea.avance || 0}%</strong>
          </div>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${tarea.avance || 0}%`, background: eCfg.dot }} />
          </div>
        </div>

        {/* Chip días restantes */}
        {dias !== null && (
          <div style={{ marginTop: '4px' }}>
            {dias < 0
              ? <Badge label={`⚠ Vencida hace ${Math.abs(dias)} días`} color="#ef4444" bg="rgba(239,68,68,0.12)" />
              : dias === 0
              ? <Badge label="🔥 Vence hoy" color="#f59e0b" bg="rgba(245,158,11,0.12)" />
              : <Badge label={`📅 ${dias} días restantes`} color="#10b981" bg="rgba(16,185,129,0.12)" />}
          </div>
        )}

        {/* Instrucciones */}
        {tarea.instrucciones && (
          <div style={styles.panel}>
            <p style={styles.panelTitle}>Instrucciones</p>
            <p style={{ color: '#94a3b8', fontSize: '14px', lineHeight: 1.7, margin: 0, whiteSpace: 'pre-wrap' }}>
              {tarea.instrucciones}
            </p>
          </div>
        )}

        {/* Fecha completada */}
        {tarea.fecha_completada && (
          <div style={{ ...styles.panel, borderLeft: '3px solid #10b981' }}>
            <p style={{ margin: 0, color: '#10b981', fontWeight: 600, fontSize: '13px' }}>
              ✓ Tarea completada el {fmt(tarea.fecha_completada)}
            </p>
          </div>
        )}
      </div>
    </div>
  )
}

// ── Modal Detalle Proyecto ────────────────────────────────────────────────────
const ModalProyecto = ({ proyecto, clienteInfo, onCerrar }) => {
  const [busqueda, setBusqueda]   = useState('')
  const [filtroEstado, setFiltro] = useState(null)
  const [tareaDetalle, setTarea]  = useState(null)

  const cfg  = ESTADO_PROYECTO[proyecto.estado] || ESTADO_PROYECTO['Planificación']
  const dias = calcDias(proyecto.fecha_fin)
  const tareas = proyecto._tareas || []

  const tareasFiltradas = tareas.filter(t => {
    const term = busqueda.toLowerCase()
    const coincide = t.titulo?.toLowerCase().includes(term) || t.perfiles?.nombre?.toLowerCase().includes(term)
    const estado = filtroEstado ? t.estado === filtroEstado : true
    return coincide && estado
  })

  const statsT = {
    total:       tareas.length,
    pendiente:   tareas.filter(t => t.estado === 'Pendiente').length,
    progreso:    tareas.filter(t => t.estado === 'En Progreso').length,
    revision:    tareas.filter(t => t.estado === 'En Revisión').length,
    completada:  tareas.filter(t => t.estado === 'Completada').length,
  }

  const avanceProyecto = tareas.length
    ? Math.round(tareas.reduce((a, t) => a + (t.avance || 0), 0) / tareas.length) : 0

  return (
    <div style={styles.overlay} onClick={tareaDetalle ? undefined : onCerrar}>
      <div style={{ ...styles.modal, maxWidth: '820px' }} onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div style={styles.modalHeader}>
          <div>
            <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '8px' }}>
              <Badge label={proyecto.estado} color={cfg.color} bg={cfg.bg} dot={cfg.dot} />
              {dias !== null && (
                <Badge
                  label={dias < 0 ? `⚠ Vencido ${Math.abs(dias)}d` : dias === 0 ? '🔥 Vence hoy' : `📅 ${dias}d restantes`}
                  color={dias < 0 ? '#ef4444' : dias <= 7 ? '#f59e0b' : '#10b981'}
                  bg={dias < 0 ? 'rgba(239,68,68,0.12)' : dias <= 7 ? 'rgba(245,158,11,0.12)' : 'rgba(16,185,129,0.12)'}
                />
              )}
            </div>
            <h2 style={styles.modalTitulo}>{proyecto.nombre_proyecto}</h2>
            {proyecto.descripcion && (
              <p style={{ color: '#64748b', fontSize: '13px', margin: '4px 0 0', lineHeight: 1.5 }}>
                {proyecto.descripcion}
              </p>
            )}
          </div>
          <div style={{ display: 'flex', gap: '8px', flexShrink: 0 }}>
            <button style={styles.btnSecondary} onClick={() => generarPDFClienteTareas(clienteInfo, proyecto, tareas)}>
              📄 Exportar tareas
            </button>
            <button style={styles.btnClose} onClick={onCerrar}>✕</button>
          </div>
        </div>

        {/* Quick info */}
        <div style={styles.quickInfo}>
          {[
            { label: 'Inicio',       val: fmt(proyecto.fecha_inicio) },
            { label: 'Vencimiento',  val: fmt(proyecto.fecha_fin) },
            { label: 'Tareas',       val: tareas.length, color: '#3b82f6' },
            { label: 'Avance',       val: `${avanceProyecto}%`, color: '#10b981' },
          ].map(it => (
            <div key={it.label} style={styles.qiItem}>
              <span style={styles.qiLabel}>{it.label}</span>
              <span style={{ ...styles.qiVal, color: it.color || 'inherit', fontWeight: it.color ? 700 : 600 }}>
                {it.val}
              </span>
            </div>
          ))}
        </div>

        {/* Progress */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', color: '#64748b', marginBottom: '6px' }}>
            <span>Avance global del proyecto</span>
            <strong style={{ color: '#10b981' }}>{avanceProyecto}%</strong>
          </div>
          <div style={styles.progressTrack}>
            <div style={{ ...styles.progressFill, width: `${avanceProyecto}%`, background: cfg.dot }} />
          </div>
        </div>

        {/* Stats tareas */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
          {[
            { label: 'Pendientes',  val: statsT.pendiente,  color: '#64748b', filtro: 'Pendiente'   },
            { label: 'En Progreso', val: statsT.progreso,   color: '#3b82f6', filtro: 'En Progreso' },
            { label: 'En Revisión', val: statsT.revision,   color: '#f59e0b', filtro: 'En Revisión' },
            { label: 'Completadas', val: statsT.completada, color: '#10b981', filtro: 'Completada'  },
          ].map(s => (
            <div key={s.label}
              onClick={() => setFiltro(filtroEstado === s.filtro ? null : s.filtro)}
              style={{
                background: filtroEstado === s.filtro ? `${s.color}1a` : 'var(--ads-surface2, #1e293b)',
                border: `1px solid ${filtroEstado === s.filtro ? s.color : 'var(--ads-border, #334155)'}`,
                borderRadius: '10px', padding: '12px 14px', cursor: 'pointer', transition: 'all .2s',
              }}>
              <div style={{ fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>{s.label}</div>
              <div style={{ fontSize: '1.35rem', fontWeight: 800, color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>

        {/* Búsqueda tareas */}
        <input
          style={styles.search}
          placeholder="🔍  Buscar tarea o responsable..."
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
        />

        {/* Lista de tareas */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '320px', overflowY: 'auto' }}>
          {tareasFiltradas.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '30px', color: '#64748b' }}>
              <span style={{ fontSize: '2rem' }}>📋</span>
              <p style={{ margin: '8px 0 0' }}>No hay tareas que coincidan.</p>
            </div>
          ) : tareasFiltradas.map(t => {
            const teCfg = ESTADO_TAREA[t.estado]   || ESTADO_TAREA['Pendiente']
            const tpCfg = PRIORIDAD_CFG[t.prioridad] || PRIORIDAD_CFG['Baja']
            return (
              <div key={t.id}
                onClick={() => setTarea(t)}
                style={{
                  background: 'var(--ads-surface2, #1e293b)',
                  border: '1px solid var(--ads-border, #334155)',
                  borderRadius: '10px', padding: '14px 16px',
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  cursor: 'pointer', transition: 'border-color .2s',
                }}
                onMouseEnter={e => e.currentTarget.style.borderColor = '#3b82f6'}
                onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--ads-border, #334155)'}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px', flexWrap: 'wrap' }}>
                    <span style={{ fontFamily: 'monospace', fontSize: '10px', color: '#64748b' }}>{t.codigo_serie}</span>
                    <Badge label={`${tpCfg.icon} ${t.prioridad}`} color={tpCfg.color} bg={tpCfg.bg} />
                  </div>
                  <p style={{ color: 'var(--ads-text, #f1f5f9)', fontWeight: 600, margin: 0, fontSize: '13.5px' }}>{t.titulo}</p>
                  {t.perfiles?.nombre && (
                    <p style={{ color: '#64748b', fontSize: '12px', margin: '4px 0 0', fontFamily: 'monospace' }}>
                      👤 {t.perfiles.nombre}
                    </p>
                  )}
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '4px' }}>
                      <span>Avance</span><span>{t.avance || 0}%</span>
                    </div>
                    <div style={styles.progressTrack}>
                      <div style={{ ...styles.progressFill, width: `${t.avance || 0}%`, background: teCfg.dot }} />
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', alignItems: 'flex-end', marginLeft: '12px', flexShrink: 0 }}>
                  <Badge label={t.estado} color={teCfg.color} bg={teCfg.bg} dot={teCfg.dot} />
                  {t.fecha_finalizacion && (
                    <span style={{ fontSize: '11px', color: '#64748b', fontFamily: 'monospace' }}>
                      {fmt(t.fecha_finalizacion)}
                    </span>
                  )}
                  <span style={{ fontSize: '11px', color: '#3b82f6' }}>Ver detalle →</span>
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {tareaDetalle && (
        <ModalTarea
          tarea={tareaDetalle}
          clienteInfo={clienteInfo}
          proyecto={proyecto}
          onCerrar={() => setTarea(null)}
        />
      )}
    </div>
  )
}

// ── Vista principal del cliente ───────────────────────────────────────────────
const ClienteDashboard = ({ session, handleLogout, logo }) => {
  const toast = useToast()

  const [clienteData,     setClienteData]     = useState(null)   // fila de tabla clientes
  const [proyectos,       setProyectos]       = useState([])
  const [loading,         setLoading]         = useState(true)
  const [busqueda,        setBusqueda]        = useState('')
  const [filtroEstado,    setFiltroEstado]    = useState(null)
  const [proyectoDetalle, setProyectoDetalle] = useState(null)

  const email = session?.user?.email

  const fetchData = useCallback(async () => {
    if (!email) return
    setLoading(true)
    try {
      // 1. Obtener el cliente por email (match con tabla clientes)
      const resCliente = await apiClient(`/clientes/by-email/${encodeURIComponent(email)}`)
      if (!resCliente.ok) {
        toast.error('No se encontró un cliente asociado a tu cuenta.')
        setLoading(false)
        return
      }
      const cliente = await resCliente.json()
      setClienteData(cliente)

      // 2. Obtener proyectos del cliente con sus tareas
      const resProyectos = await apiClient(`/proyectos/cliente/${cliente.id}`)
      if (!resProyectos.ok) {
        toast.error('No se pudieron cargar los proyectos.')
        setLoading(false)
        return
      }
      const proyectosData = await resProyectos.json()

      // 3. Obtener todas las tareas de esos proyectos
      const resTareas = await apiClient('/tareas')
      const tareas = resTareas.ok ? await resTareas.json() : []

      // Adjuntar tareas a cada proyecto
      const proyectosConTareas = proyectosData.map(p => ({
        ...p,
        _tareas: tareas.filter(t => t.proyecto_id === p.id),
      }))

      setProyectos(proyectosConTareas)
    } catch {
      toast.error('Error de conexión al cargar datos.')
    } finally {
      setLoading(false)
    }
  }, [email])

  useEffect(() => { fetchData() }, [fetchData])

  // Stats
  const stats = {
    total:         proyectos.length,
    planificacion: proyectos.filter(p => p.estado === 'Planificación').length,
    progreso:      proyectos.filter(p => p.estado === 'En Progreso').length,
    finalizados:   proyectos.filter(p => p.estado === 'Finalizado').length,
  }

  const normalizar = t => t?.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') || ''

  const proyectosFiltrados = proyectos.filter(p => {
    const term = busqueda.toLowerCase()
    const coincide = p.nombre_proyecto?.toLowerCase().includes(term) || p.descripcion?.toLowerCase().includes(term)
    const estado = filtroEstado ? normalizar(p.estado).includes(normalizar(filtroEstado)) : true
    return coincide && estado
  })

  const avanceGlobal = proyectos.length
    ? Math.round(proyectos.reduce((acc, p) => {
        const t = p._tareas || []
        const av = t.length ? Math.round(t.reduce((s, x) => s + (x.avance || 0), 0) / t.length) : 0
        return acc + av
      }, 0) / proyectos.length) : 0

  return (
    <div style={styles.root}>
      {/* ── Sidebar ─────────────────────────────────────────────────────── */}
      <aside style={styles.sidebar}>
        {logo && <img src={logo} alt="Logo" style={styles.logo} />}

        <div style={styles.navSection}>
          <span style={styles.navSectionLabel}>PORTAL CLIENTE</span>
          <div style={styles.navItem}>
            <span>📁</span><span>Mis Proyectos</span>
          </div>
        </div>

        <div style={{ marginTop: 'auto' }}>
          {clienteData && (
            <div style={styles.userCard}>
              <div style={styles.avatar}>{clienteData.empresa?.[0] || '?'}</div>
              <div style={{ minWidth: 0 }}>
                <p style={{ margin: 0, fontWeight: 600, fontSize: '13px',
                  color: 'var(--ads-text, #f1f5f9)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {clienteData.empresa}
                </p>
                <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>Portal Cliente</p>
              </div>
            </div>
          )}
          <button style={styles.logoutBtn} onClick={handleLogout}>⎋ Cerrar sesión</button>
        </div>
      </aside>

      {/* ── Contenido principal ─────────────────────────────────────────── */}
      <main style={styles.main}>
        {/* Hero / bienvenida */}
        <div style={styles.hero}>
          <div>
            <h1 style={styles.heroTitle}>
              Bienvenido, {clienteData?.nombre_contacto || clienteData?.empresa || 'Cliente'} 👋
            </h1>
            <p style={styles.heroSub}>
              Aquí puedes consultar el estado de tus proyectos y tareas en tiempo real.
            </p>
          </div>
          <button
            style={styles.btnPrimary}
            onClick={() => generarPDFClienteProyectos(clienteData || { empresa: email, nombre_contacto: '', email }, proyectosFiltrados)}
          >
            📄 Exportar reporte
          </button>
        </div>

        {/* KPI chips */}
        <div style={styles.statsRow}>
          {[
            { label: 'Total',         val: stats.total,         color: '#3b82f6', filtro: null },
            { label: 'Planificación', val: stats.planificacion, color: '#8b5cf6', filtro: 'Planificación' },
            { label: 'En Progreso',   val: stats.progreso,      color: '#f59e0b', filtro: 'En Progreso' },
            { label: 'Finalizados',   val: stats.finalizados,   color: '#10b981', filtro: 'Finalizado' },
            { label: 'Avance Global', val: `${avanceGlobal}%`,  color: '#10b981', filtro: null, noClick: true },
          ].map(s => (
            <div key={s.label}
              style={{
                ...styles.statCard,
                borderColor: filtroEstado === s.filtro && !s.noClick ? s.color : 'var(--ads-border, #334155)',
                background: filtroEstado === s.filtro && !s.noClick ? `${s.color}18` : 'var(--ads-surface, #0f172a)',
                cursor: s.noClick ? 'default' : 'pointer',
              }}
              onClick={() => !s.noClick && setFiltroEstado(filtroEstado === s.filtro ? null : s.filtro)}
            >
              <span style={{ fontSize: '11px', color: '#64748b', fontWeight: 500 }}>{s.label}</span>
              <span style={{ fontSize: '1.5rem', fontWeight: 800, color: s.color, lineHeight: 1.2 }}>{s.val}</span>
            </div>
          ))}
        </div>

        {/* Toolbar */}
        <div style={styles.toolbar}>
          <input
            style={styles.search}
            placeholder="🔍  Buscar proyecto..."
            value={busqueda}
            onChange={e => setBusqueda(e.target.value)}
          />
        </div>

        {/* Grid de proyectos */}
        {loading ? (
          <div style={styles.loadingState}>
            <div style={styles.spinner} /><span>Cargando tus proyectos...</span>
          </div>
        ) : proyectosFiltrados.length === 0 ? (
          <div style={styles.emptyState}>
            <span style={{ fontSize: '2.5rem' }}>📁</span>
            <p style={{ color: '#64748b', marginTop: '8px' }}>
              {proyectos.length === 0 ? 'No tienes proyectos asignados.' : 'No hay proyectos que coincidan.'}
            </p>
          </div>
        ) : (
          <div style={styles.grid}>
            {proyectosFiltrados.map((p, i) => {
              const cfg  = ESTADO_PROYECTO[p.estado] || ESTADO_PROYECTO['Planificación']
              const dias = calcDias(p.fecha_fin)
              const tareas = p._tareas || []
              const avance = tareas.length
                ? Math.round(tareas.reduce((a, t) => a + (t.avance || 0), 0) / tareas.length) : 0
              const completadas = tareas.filter(t => t.estado === 'Completada').length

              return (
                <div
                  key={p.id}
                  style={{ ...styles.card, animationDelay: `${i * 0.05}s` }}
                  onClick={() => setProyectoDetalle(p)}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = '#3b82f6'; e.currentTarget.style.transform = 'translateY(-2px)' }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--ads-border, #334155)'; e.currentTarget.style.transform = 'none' }}
                >
                  {/* Estado + días */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <Badge label={p.estado} color={cfg.color} bg={cfg.bg} dot={cfg.dot} />
                    {dias !== null && (
                      <span style={{
                        fontSize: '11px', fontWeight: 600, fontFamily: 'monospace',
                        color: dias < 0 ? '#ef4444' : dias <= 7 ? '#f59e0b' : '#10b981',
                      }}>
                        {dias < 0 ? `⚠ ${Math.abs(dias)}d` : `${dias}d`}
                      </span>
                    )}
                  </div>

                  {/* Nombre */}
                  <div>
                    <h3 style={{ color: 'var(--ads-text, #f1f5f9)', fontWeight: 700, fontSize: '1rem', margin: 0, lineHeight: 1.35 }}>
                      {p.nombre_proyecto}
                    </h3>
                    {p.descripcion && (
                      <p style={{
                        color: '#64748b', fontSize: '12.5px', margin: '6px 0 0', lineHeight: 1.5,
                        display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
                      }}>
                        {p.descripcion}
                      </p>
                    )}
                  </div>

                  {/* Progreso */}
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#64748b', marginBottom: '5px' }}>
                      <span>{tareas.length} tarea{tareas.length !== 1 ? 's' : ''} · {completadas} completada{completadas !== 1 ? 's' : ''}</span>
                      <span>{avance}%</span>
                    </div>
                    <div style={styles.progressTrack}>
                      <div style={{ ...styles.progressFill, width: `${avance}%`, background: cfg.dot }} />
                    </div>
                  </div>

                  {/* Footer */}
                  <div style={{ borderTop: '1px solid var(--ads-border, #334155)', paddingTop: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ color: '#64748b', fontSize: '11px', fontFamily: 'monospace' }}>
                      {fmt(p.fecha_inicio)} → {fmt(p.fecha_fin)}
                    </span>
                    <span style={{ color: '#3b82f6', fontSize: '12px', fontWeight: 600 }}>Ver tareas →</span>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </main>

      {/* Modal proyecto */}
      {proyectoDetalle && (
        <ModalProyecto
          proyecto={proyectoDetalle}
          clienteInfo={clienteData || { empresa: email, nombre_contacto: '', email }}
          onCerrar={() => setProyectoDetalle(null)}
        />
      )}
    </div>
  )
}

// ── Estilos inline (compatibles con el tema oscuro existente) ─────────────────
const styles = {
  root: {
    display: 'flex',
    height: '100vh',
    background: 'var(--ads-bg, #020817)',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
  },
  sidebar: {
    width: '220px',
    minWidth: '220px',
    background: 'var(--ads-surface, #0f172a)',
    borderRight: '1px solid var(--ads-border, #334155)',
    display: 'flex',
    flexDirection: 'column',
    padding: '24px 16px',
    gap: '8px',
  },
  logo: {
    height: '36px',
    objectFit: 'contain',
    marginBottom: '24px',
    alignSelf: 'center',
  },
  navSection: { display: 'flex', flexDirection: 'column', gap: '4px' },
  navSectionLabel: { fontSize: '10px', fontWeight: 700, color: '#475569', letterSpacing: '0.08em', marginBottom: '4px', paddingLeft: '8px' },
  navItem: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '9px 12px', borderRadius: '8px',
    color: '#f1f5f9', fontSize: '13.5px', fontWeight: 600,
    background: 'rgba(59,130,246,0.15)', cursor: 'default',
  },
  userCard: {
    display: 'flex', alignItems: 'center', gap: '10px',
    padding: '12px', borderRadius: '10px',
    background: 'var(--ads-surface2, #1e293b)',
    border: '1px solid var(--ads-border, #334155)',
    marginBottom: '10px', overflow: 'hidden',
  },
  avatar: {
    width: 36, height: 36, borderRadius: '50%',
    background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    color: '#fff', fontWeight: 700, fontSize: '14px', flexShrink: 0,
  },
  logoutBtn: {
    width: '100%', padding: '9px 12px', borderRadius: '8px',
    background: 'transparent', border: '1px solid rgba(239,68,68,0.3)',
    color: '#ef4444', fontSize: '13px', fontWeight: 600,
    cursor: 'pointer', textAlign: 'left',
  },
  main: {
    flex: 1, overflowY: 'auto',
    padding: '32px 28px',
    display: 'flex', flexDirection: 'column', gap: '24px',
  },
  hero: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '16px',
  },
  heroTitle: {
    margin: 0, fontSize: '1.5rem', fontWeight: 800,
    color: 'var(--ads-text, #f1f5f9)', lineHeight: 1.3,
  },
  heroSub: { margin: '6px 0 0', color: '#64748b', fontSize: '14px' },
  statsRow: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '12px',
  },
  statCard: {
    display: 'flex', flexDirection: 'column', gap: '6px',
    padding: '16px', borderRadius: '12px',
    border: '1px solid var(--ads-border, #334155)',
    background: 'var(--ads-surface, #0f172a)',
    transition: 'all .2s',
  },
  toolbar: { display: 'flex', gap: '12px', alignItems: 'center' },
  search: {
    flex: 1, padding: '9px 14px', borderRadius: '10px',
    background: 'var(--ads-surface2, #1e293b)',
    border: '1px solid var(--ads-border, #334155)',
    color: 'var(--ads-text, #f1f5f9)', fontSize: '13.5px', outline: 'none',
  },
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))',
    gap: '16px',
  },
  card: {
    background: 'var(--ads-surface, #0f172a)',
    border: '1px solid var(--ads-border, #334155)',
    borderRadius: '14px', padding: '20px',
    display: 'flex', flexDirection: 'column', gap: '14px',
    cursor: 'pointer', transition: 'border-color .2s, transform .2s',
  },
  progressTrack: {
    height: '6px', borderRadius: '999px',
    background: 'rgba(100,116,139,0.2)', overflow: 'hidden',
  },
  progressFill: {
    height: '100%', borderRadius: '999px', transition: 'width .5s ease',
  },
  loadingState: {
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: '12px', padding: '60px', color: '#64748b',
  },
  spinner: {
    width: 22, height: 22, borderRadius: '50%',
    border: '2px solid rgba(59,130,246,0.2)',
    borderTopColor: '#3b82f6',
    animation: 'spin 0.8s linear infinite',
  },
  emptyState: {
    display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '60px',
  },
  // Modal
  overlay: {
    position: 'fixed', inset: 0,
    background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    zIndex: 1000, padding: '16px',
  },
  modal: {
    background: 'var(--ads-surface, #0f172a)',
    border: '1px solid var(--ads-border, #334155)',
    borderRadius: '16px', padding: '28px',
    width: '100%', maxWidth: '640px', maxHeight: '90vh', overflowY: 'auto',
    display: 'flex', flexDirection: 'column', gap: '20px',
  },
  modalHeader: {
    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px',
  },
  modalTitulo: {
    margin: 0, fontSize: '1.25rem', fontWeight: 800,
    color: 'var(--ads-text, #f1f5f9)',
  },
  quickInfo: {
    display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
    gap: '10px',
    background: 'var(--ads-surface2, #1e293b)',
    border: '1px solid var(--ads-border, #334155)',
    borderRadius: '12px', padding: '16px',
  },
  qiItem: { display: 'flex', flexDirection: 'column', gap: '4px' },
  qiLabel: { fontSize: '11px', color: '#64748b', fontWeight: 500, textTransform: 'uppercase', letterSpacing: '0.05em' },
  qiVal: { fontSize: '14px', fontWeight: 600, color: 'var(--ads-text, #f1f5f9)' },
  panel: {
    background: 'var(--ads-surface2, #1e293b)',
    border: '1px solid var(--ads-border, #334155)',
    borderRadius: '10px', padding: '16px',
  },
  panelTitle: { margin: '0 0 8px', color: '#94a3b8', fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' },
  btnPrimary: {
    padding: '9px 18px', borderRadius: '10px',
    background: '#3b82f6', color: '#fff',
    border: 'none', fontWeight: 600, fontSize: '13.5px',
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  btnSecondary: {
    padding: '7px 14px', borderRadius: '8px',
    background: 'var(--ads-surface2, #1e293b)',
    border: '1px solid var(--ads-border, #334155)',
    color: 'var(--ads-text, #f1f5f9)', fontWeight: 600, fontSize: '12.5px',
    cursor: 'pointer', whiteSpace: 'nowrap',
  },
  btnClose: {
    width: 32, height: 32, borderRadius: '8px',
    background: 'var(--ads-surface2, #1e293b)',
    border: '1px solid var(--ads-border, #334155)',
    color: '#64748b', fontSize: '14px', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  },
}

export default ClienteDashboard