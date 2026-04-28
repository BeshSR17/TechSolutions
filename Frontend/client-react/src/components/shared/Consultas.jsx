// components/shared/Consultas.jsx
import { useState, useEffect, useRef } from 'react'
import { supabase } from '../../supabaseClient'
import { useConsultas, useChatConsulta } from '../../hooks/useConsultas'
import './Consultas.css'

// ── Helpers ───────────────────────────────────────────────────────────────────
const formatHora = (f) =>
  f ? new Date(f).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' }) : ''

const formatFecha = (f) => {
  if (!f) return ''
  const d   = new Date(f)
  const hoy = new Date()
  const ayer = new Date(hoy); ayer.setDate(hoy.getDate() - 1)
  if (d.toDateString() === hoy.toDateString())  return formatHora(f)
  if (d.toDateString() === ayer.toDateString()) return 'Ayer'
  return d.toLocaleDateString('es', { day: 'numeric', month: 'short' })
}

const formatFechaLarga = (f) =>
  f ? new Date(f).toLocaleDateString('es', {
    day: 'numeric', month: 'long', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  }) : ''

const EstadoBadge = ({ estado }) => {
  const cfg = {
    pendiente: { cls: 'badge-pendiente', label: '⏳ Pendiente' },
    activa:    { cls: 'badge-activa',    label: '💬 En curso'  },
    cerrada:   { cls: 'badge-cerrada',   label: '✓ Cerrada'   },
  }[estado] || { cls: '', label: estado }
  return <span className={`consulta-badge ${cfg.cls}`}>{cfg.label}</span>
}

const Avatar = ({ url, nombre, size = 36 }) => (
  <div className="c-avatar" style={{ width: size, height: size, fontSize: size * 0.38 }}>
    {url
      ? <img src={url} alt={nombre} onError={e => { e.target.style.display = 'none' }} />
      : nombre?.charAt(0).toUpperCase() || '?'
    }
  </div>
)

// ── Chat de una consulta ──────────────────────────────────────────────────────
function ChatConsulta({ consulta, contacto, miId, esAdmin, onVolver, onCerrar }) {
  const { mensajes, enviarMensaje, cargando } = useChatConsulta(consulta.id, contacto?.id)
  const [texto,    setTexto]    = useState('')
  const [enviando, setEnviando] = useState(false)
  const bottomRef = useRef(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const handleEnviar = async () => {
    if (!texto.trim() || enviando) return
    setEnviando(true)
    await enviarMensaje(texto, contacto?.id)
    setTexto('')
    setEnviando(false)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleEnviar() }
  }

  const cerrada = consulta.estado === 'cerrada'

  return (

    

    <div className="cc-wrap">
      {/* Header */}
      <div className="cc-header">
        <button className="cc-back" onClick={onVolver}>← Volver</button>
        <div className="cc-header-info">
          <Avatar url={contacto?.avatar_url} nombre={contacto?.nombre} size={36} />
          <div>
            <div className="cc-header-nombre">{contacto?.nombre || (esAdmin ? 'Usuario' : 'Administrador')}</div>
            <EstadoBadge estado={consulta.estado} />
          </div>
        </div>
        <div className="cc-header-titulo" title={consulta.titulo}>{consulta.titulo}</div>
        {esAdmin && consulta.estado === 'activa' && (
          <button className="cc-btn-cerrar" onClick={() => onCerrar(consulta.id)}>
            Finalizar consulta
          </button>
        )}
      </div>

      {/* Banner cerrada */}
      {cerrada && (
        <div className="cc-banner-cerrada">
          ✓ Consulta finalizada · {formatFechaLarga(consulta.cerrado_en)}
        </div>
      )}

      {/* Mensajes */}
      <div className="cc-mensajes">
        {cargando && (
          <div className="cc-cargando"><span /><span /><span /></div>
        )}

        {!cargando && mensajes.length === 0 && (
          <div className="cc-vacio">
            <div style={{ fontSize: 36, marginBottom: 8 }}>💬</div>
            <span>
              {esAdmin
                ? 'Acepta la consulta para comenzar a chatear.'
                : 'Un administrador responderá pronto.'}
            </span>
          </div>
        )}

        {mensajes.map((msg, i) => {
          const esPropio = msg.remitente_id === miId
          return (
            <div key={msg.id || i} className={`cc-msg ${esPropio ? 'propio' : 'ajeno'}`}>
              <div className="cc-burbuja">{msg.contenido}</div>
              {msg.creado_en && (
                <div className="cc-hora">
                  {formatHora(msg.creado_en)}
                  {esPropio && <span className="cc-tick">{msg._optimista ? ' 🕐' : ' ✓✓'}</span>}
                </div>
              )}
            </div>
          )
        })}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      {cerrada ? (
        <div className="cc-input-area cc-input-cerrada">
          <span>Esta consulta está cerrada</span>
        </div>
      ) : (
        <div className="cc-input-area">
          <textarea
            className="cc-input"
            rows={1}
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje... (Enter para enviar)"
            disabled={consulta.estado === 'pendiente' && !esAdmin}
          />
          <button
            className="cc-btn-enviar"
            onClick={handleEnviar}
            disabled={!texto.trim() || enviando || (consulta.estado === 'pendiente' && !esAdmin)}
          >
            <svg viewBox="0 0 24 24"><path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" /></svg>
          </button>
        </div>
      )}
    </div>

    
  )
}

// ── Formulario nueva consulta ─────────────────────────────────────────────────
function NuevaConsulta({ onCrear, onCancelar }) {
  const [titulo,   setTitulo]   = useState('')
  const [mensaje,  setMensaje]  = useState('')
  const [loading,  setLoading]  = useState(false)
  const [error,    setError]    = useState('')

  const handleSubmit = async () => {
    if (!titulo.trim() || !mensaje.trim()) {
      setError('Completa el título y el mensaje.')
      return
    }
    setLoading(true)
    setError('')
    const { error: err } = await onCrear({ titulo: titulo.trim(), mensaje_inicial: mensaje.trim() })
    if (err) setError('No se pudo enviar. Intenta de nuevo.')
    else { setTitulo(''); setMensaje('') }
    setLoading(false)
  }

  return (
    <div className="nc-wrap">
      <div className="nc-header">
        <button className="cc-back" onClick={onCancelar}>← Volver</button>
        <h3 className="nc-title">Nueva consulta</h3>
      </div>

      <div className="nc-body">
        <div className="nc-info">
          <span>💡</span>
          <p>Describe tu consulta y un administrador te responderá lo antes posible.</p>
        </div>

        {error && <div className="nc-error">{error}</div>}

        <div className="nc-field">
          <label className="nc-label">Título de la consulta</label>
          <input
            className="nc-input"
            type="text"
            placeholder="Ej: Problema con mi tarea #234"
            value={titulo}
            onChange={e => setTitulo(e.target.value)}
            maxLength={100}
          />
        </div>

        <div className="nc-field">
          <label className="nc-label">Describe tu consulta</label>
          <textarea
            className="nc-input nc-textarea"
            placeholder="Explica detalladamente tu consulta..."
            value={mensaje}
            onChange={e => setMensaje(e.target.value)}
            maxLength={1000}
            rows={5}
          />
          <span className="nc-counter">{mensaje.length}/1000</span>
        </div>

        <button className="nc-btn" onClick={handleSubmit} disabled={loading}>
          {loading ? 'Enviando...' : 'Enviar consulta'}
        </button>
      </div>
    </div>
  )
}

// ── Panel admin — lista de consultas ─────────────────────────────────────────
function AdminConsultas({ consultas, perfiles, miId, onAbrir, onAceptar }) {
  const [tab, setTab] = useState('pendiente')

  const getUsuario = (id) => perfiles.find(p => p.id === id)

  const tabs = [
    { key: 'pendiente', label: 'Pendientes' },
    { key: 'activa',    label: 'Activas'    },
    { key: 'cerrada',   label: 'Cerradas'   },
  ]

  const filtradas = consultas.filter(c => c.estado === tab)

  return (
    <div className="ac-wrap">
      <div className="ac-tabs">
        {tabs.map(t => {
          const cnt = consultas.filter(c => c.estado === t.key).length
          return (
            <button
              key={t.key}
              className={`ac-tab ${tab === t.key ? 'active' : ''}`}
              onClick={() => setTab(t.key)}
            >
              {t.label}{cnt > 0 ? ` (${cnt})` : ''}
            </button>
          )
        })}
      </div>

      {filtradas.length === 0 ? (
        <div className="cc-vacio" style={{ paddingTop: 60 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>
            {tab === 'pendiente' ? '✅' : tab === 'activa' ? '💬' : '📁'}
          </div>
          <span>
            {tab === 'pendiente' ? 'Sin consultas pendientes'
              : tab === 'activa' ? 'Sin consultas activas'
              : 'Sin consultas cerradas'}
          </span>
        </div>
      ) : (
        <div className="ac-lista">
          {filtradas.map(c => {
            const usuario = getUsuario(c.usuario_id)
            return (
              <div key={c.id} className="ac-item">
                <div className="ac-item-top">
                  <Avatar url={usuario?.avatar_url} nombre={usuario?.nombre} size={40} />
                  <div className="ac-item-info">
                    <div className="ac-item-titulo">{c.titulo}</div>
                    <div className="ac-item-usuario">{usuario?.nombre || 'Usuario'}</div>
                  </div>
                  <div className="ac-item-meta">
                    <EstadoBadge estado={c.estado} />
                    <span className="ac-item-fecha">{formatFecha(c.creado_en)}</span>
                  </div>
                </div>
                <p className="ac-item-preview">{c.mensaje_inicial}</p>
                <div className="ac-item-actions">
                  {c.estado === 'pendiente' && (
                    <button className="ac-btn-aceptar" onClick={() => onAceptar(c)}>
                      ✓ Aceptar consulta
                    </button>
                  )}
                  {(c.estado === 'activa' || c.estado === 'cerrada') && (
                    <button
                      className={`ac-btn-ver ${c.estado === 'cerrada' ? 'cerrada' : ''}`}
                      onClick={() => onAbrir(c, usuario)}
                    >
                      {c.estado === 'activa' ? '💬 Continuar chat' : '📄 Ver historial'}
                    </button>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Lista de consultas del usuario ────────────────────────────────────────────
function UsuarioConsultas({ consultas, onAbrir, onNueva }) {
  if (consultas.length === 0) {
    return (
      <div className="cc-vacio" style={{ paddingTop: 60 }}>
        <div style={{ fontSize: 48, marginBottom: 12 }}>🎫</div>
        <strong style={{ color: '#94a3b8', fontSize: 15, marginBottom: 6, display: 'block' }}>
          Sin consultas aún
        </strong>
        <span>Crea una nueva consulta y un administrador te atenderá.</span>
        <button className="nc-btn" style={{ marginTop: 20 }} onClick={onNueva}>
          Crear primera consulta
        </button>
      </div>
    )
  }

  return (
    <div className="ac-lista">
      {consultas.map(c => (
        <div key={c.id} className="ac-item" onClick={() => onAbrir(c)} style={{ cursor: 'pointer' }}>
          <div className="ac-item-top">
            <div className="ac-item-info">
              <div className="ac-item-titulo">{c.titulo}</div>
            </div>
            <div className="ac-item-meta">
              <EstadoBadge estado={c.estado} />
              <span className="ac-item-fecha">{formatFecha(c.creado_en)}</span>
            </div>
          </div>
          <p className="ac-item-preview">{c.mensaje_inicial}</p>
        </div>
      ))}
    </div>
  )
}

// ── Componente principal Consultas ────────────────────────────────────────────
export default function Consultas() {
  const {
    consultas, miId, esAdmin, cargando,
    crearConsulta, aceptarConsulta, cerrarConsulta,
  } = useConsultas()

  const [vista,      setVista]      = useState('lista') // lista | nueva | chat
  const [consultaAct, setConsultaAct] = useState(null)
  const [contactoAct, setContactoAct] = useState(null)
  const [perfiles,   setPerfiles]   = useState([])
  const [errMsg,     setErrMsg]     = useState('')

  // Cargar perfiles (admin necesita ver nombres de usuarios)
  useEffect(() => {
    if (!esAdmin) return
    supabase.from('perfiles').select('*').then(({ data }) => setPerfiles(data || []))
  }, [esAdmin])

  const abrirConsulta = async (consulta, usuarioPerfil = null) => {
    setConsultaAct(consulta)
    if (esAdmin) {
      setContactoAct(usuarioPerfil || { nombre: 'Usuario', avatar_url: null, id: consulta.usuario_id })
    } else {
      // Buscar admin asignado
      if (consulta.admin_asignado_id) {
        const { data } = await supabase
          .from('perfiles').select('*').eq('id', consulta.admin_asignado_id).single()
        setContactoAct(data || { nombre: 'Administrador', avatar_url: null, id: consulta.admin_asignado_id })
      } else {
        setContactoAct({ nombre: 'Administrador', avatar_url: null, id: null })
      }
    }
    setVista('chat')
  }

  const handleAceptar = async (consulta) => {
    const { error, data } = await aceptarConsulta(consulta.id)
    if (error) { setErrMsg(error); setTimeout(() => setErrMsg(''), 4000); return }
    const usuario = perfiles.find(p => p.id === consulta.usuario_id)
    abrirConsulta({ ...consulta, estado: 'activa', admin_asignado_id: miId }, usuario)
  }

  const [modalCerrar, setModalCerrar] = useState(null)

  const handleCerrar = (consultaId) => {
    setModalCerrar(consultaId) // abre el modal
  }
  const confirmarCerrar = async () => {
    await cerrarConsulta(modalCerrar)
    setModalCerrar(null)
    setVista('lista')
  }
  const handleCrear = async (datos) => {
    const { error } = await crearConsulta(datos)
    if (!error) setVista('lista')
    return { error }
  }

  

  // ── Render vistas ────────────────────────────────────────────────────────
  if (vista === 'nueva') {
    return (
      <NuevaConsulta
        onCrear={handleCrear}
        onCancelar={() => setVista('lista')}
      />
    )
  }


  if (vista === 'chat' && consultaAct) {
    return (
      <>
        <ChatConsulta
          consulta={consultaAct}
          contacto={contactoAct}
          miId={miId}
          esAdmin={esAdmin}
          onVolver={() => setVista('lista')}
          onCerrar={handleCerrar}
        />

        {/* Modal aquí también, para que sea visible desde la vista chat */}
        {modalCerrar && (
          <div className="modal-overlay" onClick={() => setModalCerrar(null)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <div className="modal-icon">✓</div>
              <h3 className="modal-titulo">¿Finalizar consulta?</h3>
              <p className="modal-texto">
                Ambos podrán seguir viendo el historial. Esta acción no se puede deshacer.
              </p>
              <div className="modal-actions">
                <button className="modal-btn-cancelar" onClick={() => setModalCerrar(null)}>
                  Cancelar
                </button>
                <button className="modal-btn-confirmar" onClick={confirmarCerrar}>
                  Finalizar
                </button>
              </div>
            </div>
          </div>
        )}
      </>
    )
  }

  return (
    <div className="consultas-wrap">
      {/* Header */}
      <div className="consultas-header">
        <h3 className="consultas-title">
          {esAdmin ? 'Consultas de usuarios' : 'Mis consultas'}
        </h3>
        {!esAdmin && (
          <button className="nc-btn-sm" onClick={() => setVista('nueva')}>
            + Nueva consulta
          </button>
        )}
      </div>

      {errMsg && <div className="nc-error" style={{ margin: '0 0 12px' }}>{errMsg}</div>}

      {cargando ? (
        <div className="cc-vacio"><div className="cc-cargando"><span /><span /><span /></div></div>
      ) : esAdmin ? (
        <AdminConsultas
          consultas={consultas}
          perfiles={perfiles}
          miId={miId}
          onAbrir={abrirConsulta}
          onAceptar={handleAceptar}
        />
      ) : (
        <UsuarioConsultas
          consultas={consultas}
          onAbrir={abrirConsulta}
          onNueva={() => setVista('nueva')}
        />
      )}

      {modalCerrar && (
        <div className="modal-overlay" onClick={() => setModalCerrar(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()}>
            <div className="modal-icon">✓</div>
            <h3 className="modal-titulo">¿Finalizar consulta?</h3>
            <p className="modal-texto">Ambos podrán seguir viendo el historial. Esta acción no se puede deshacer.</p>
            <div className="modal-actions">
              <button className="modal-btn-cancelar" onClick={() => setModalCerrar(null)}>Cancelar</button>
              <button className="modal-btn-confirmar" onClick={confirmarCerrar}>Finalizar</button>
            </div>
          </div>
        </div>
      )}
    </div>

  )
}