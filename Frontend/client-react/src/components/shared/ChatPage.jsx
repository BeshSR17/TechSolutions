// components/shared/ChatPage.jsx
import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient'
import MensajesSection from './MensajesSection'
import Consultas from './Consultas'
import './ChatPage.css'

export default function ChatPage({
  badgeMensajes        = 0,
  badgeConsultas       = 0,
  limpiarBadgeMensajes  = () => {},
  limpiarBadgeConsultas = () => {},
  miIdExterno          = null,
}) {
  const [seccion,  setSeccion]  = useState('mensajes')
  const [perfiles, setPerfiles] = useState([])
  const [miRol,    setMiRol]    = useState(null)

  useEffect(() => {
    if (!miIdExterno) return
    supabase.from('perfiles').select('*').then(({ data }) => setPerfiles(data || []))
    supabase.from('perfiles').select('rol').eq('id', miIdExterno).single()
      .then(({ data }) => setMiRol(data?.rol || 'Usuario'))
  }, [miIdExterno])

  const cambiarSeccion = (s) => {
    setSeccion(s)
    if (s === 'mensajes')  limpiarBadgeMensajes()
    if (s === 'consultas') limpiarBadgeConsultas()
  }

  if (!miIdExterno) {
    return (
      <div className="cp-loading">
        <div className="cp-dots"><span /><span /><span /></div>
      </div>
    )
  }

  return (
    <div className="cp-page">
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
          {/* Punto rojo adicional cuando hay consultas y estamos en mensajes */}
          {badgeConsultas > 0 && seccion === 'mensajes' && (
            <span className="cp-tab-dot" />
          )}
        </button>
      </div>

      <div className="cp-content">
        {seccion === 'mensajes' && (
          <MensajesSection
            miId={miIdExterno}
            miRol={miRol}
            perfiles={perfiles}
            onLeerMensajes={limpiarBadgeMensajes}
          />
        )}
        {seccion === 'consultas' && (
          <Consultas onLeerConsultas={limpiarBadgeConsultas} />
        )}
      </div>
    </div>
  )
}