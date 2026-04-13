// components/shared/ChatPage.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import { useNotificaciones } from '../../hooks/useNotificaciones'
import MensajesSection from './MensajesSection'
import Consultas from './Consultas'
import './ChatPage.css'

// ── Toast individual ──────────────────────────────────────────────────────────
function Toast({ toast, onCerrar }) {
  const iconos = {
    mensaje:        '💬',
    consulta:       '💬',
    consulta_nueva: '🎫',
  }
  return (
    <div className={`cp-toast cp-toast-${toast.tipo}`}>
      <div className="cp-toast-icono">{iconos[toast.tipo] || '🔔'}</div>
      <div className="cp-toast-body">
        <div className="cp-toast-titulo">{toast.titulo}</div>
        <div className="cp-toast-texto">{toast.texto}</div>
      </div>
      <button className="cp-toast-close" onClick={() => onCerrar(toast.id)}>✕</button>
    </div>
  )
}

function ToastContainer({ toasts, onCerrar }) {
  if (toasts.length === 0) return null
  return (
    <div className="cp-toast-container">
      {toasts.map(t => (
        <Toast key={t.id} toast={t} onCerrar={onCerrar} />
      ))}
    </div>
  )
}

// ── Página principal ──────────────────────────────────────────────────────────
export default function ChatPage() {
  const [seccion,  setSeccion]  = useState('mensajes')
  const [perfiles, setPerfiles] = useState([])
  const [miRol,    setMiRol]    = useState(null)

  const {
    badgeMensajes,
    badgeConsultas,
    toasts,
    cerrarToast,
    limpiarBadgeMensajes,
    limpiarBadgeConsultas,
    miId,
  } = useNotificaciones()

  useEffect(() => {
    if (!miId) return
    supabase.from('perfiles').select('*').then(({ data }) => setPerfiles(data || []))
    supabase.from('perfiles').select('rol').eq('id', miId).single()
      .then(({ data }) => setMiRol(data?.rol || 'Usuario'))
  }, [miId])

  const cambiarSeccion = (s) => {
    setSeccion(s)
    if (s === 'mensajes')  limpiarBadgeMensajes()
    if (s === 'consultas') limpiarBadgeConsultas()
  }

  if (!miId) {
    return (
      <div className="cp-loading">
        <div className="cp-dots"><span /><span /><span /></div>
      </div>
    )
  }

  return (
    <div className="cp-page">

      {/* ── Tabs ── */}
      <div className="cp-tabs">
        <button
          className={`cp-tab ${seccion === 'mensajes' ? 'active' : ''}`}
          onClick={() => cambiarSeccion('mensajes')}
        >
          <span className="cp-tab-icon">💬</span>
          <span className="cp-tab-label">Mensajes</span>
          {badgeMensajes > 0 && (
            <span className="cp-tab-badge">{badgeMensajes > 99 ? '99+' : badgeMensajes}</span>
          )}
        </button>

        <button
          className={`cp-tab ${seccion === 'consultas' ? 'active' : ''}`}
          onClick={() => cambiarSeccion('consultas')}
        >
          <span className="cp-tab-icon">🎫</span>
          <span className="cp-tab-label">Consultas</span>
          {badgeConsultas > 0 && (
            <span className="cp-tab-badge">{badgeConsultas > 99 ? '99+' : badgeConsultas}</span>
          )}
        </button>
      </div>

      {/* ── Contenido ── */}
      <div className="cp-content">
        {seccion === 'mensajes' && (
          <MensajesSection
            miId={miId}
            miRol={miRol}
            perfiles={perfiles}
            onLeerMensajes={limpiarBadgeMensajes}
          />
        )}
        {seccion === 'consultas' && (
          <Consultas onLeerConsultas={limpiarBadgeConsultas} />
        )}
      </div>

      {/* ── Toasts ── */}
      <ToastContainer toasts={toasts} onCerrar={cerrarToast} />
    </div>
  )
}