// components/shared/Chat.jsx
import { useState, useEffect, useRef } from 'react'
import { useChat } from '../../hooks/useChat'
import { supabase } from '../../supabaseClient'
import './Chat.css'

export default function Chat({ otroUsuarioId, nombreOtro, rolOtro = 'Usuario', avatarOtro = null }) {
  const { mensajes, enviarMensaje, miId, cargando } = useChat(otroUsuarioId)
  const [texto, setTexto] = useState('')
  const [miAvatar, setMiAvatar] = useState(null)
  const bottomRef = useRef(null)

  useEffect(() => {
    if (!miId) return
    supabase
      .from('perfiles')
      .select('avatar_url')
      .eq('id', miId)
      .single()
      .then(({ data }) => {
        if (data?.avatar_url) setMiAvatar(data.avatar_url)
      })
  }, [miId])

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [mensajes])

  const handleEnviar = async () => {
    if (!texto.trim()) return
    await enviarMensaje(texto)
    setTexto('')
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleEnviar()
    }
  }

  const inicial = nombreOtro?.charAt(0).toUpperCase() || '?'

  const formatHora = (fecha) =>
    new Date(fecha).toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' })

  const totalMensajes = mensajes.length
  const misMensajes = mensajes.filter(m => m.remitente_id === miId).length
  const susMensajes = totalMensajes - misMensajes
  const hoy = new Date().toLocaleDateString('es', { day: 'numeric', month: 'long', year: 'numeric' })


  const Avatar = ({ url, nombre, size = 40, fontSize = 15 }) => (
    <div
      className="chat-avatar"
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        overflow: 'hidden',
        flexShrink: 0,
        background: 'linear-gradient(135deg, #3b82f6, #8b5cf6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize,
        fontWeight: 700,
        color: '#fff',
        fontFamily: 'DM Sans, sans-serif',
      }}
    >
      {url ? (
        <img
          src={url}
          alt={nombre}
          style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          onError={e => { e.target.style.display = 'none' }} 
        />
      ) : (
        nombre?.charAt(0).toUpperCase() || '?'
      )}
    </div>
  )

  return (
    <div className="chat-layout">

      {/* ── CHAT PRINCIPAL ── */}
      <div className="chat-container">

        {/* Header */}
        <div className="chat-header">
          <Avatar url={avatarOtro} nombre={nombreOtro} size={40} fontSize={15} />
          <div className="chat-header-info">
            <div className="chat-header-nombre">{nombreOtro}</div>
            <div className="chat-header-estado">En línea</div>
          </div>
        </div>

        {/* Mensajes */}
        <div className="chat-mensajes">
          {cargando && (
            <div className="chat-cargando">
              <span /><span /><span />
            </div>
          )}

          {!cargando && mensajes.length === 0 && (
            <div className="chat-vacio">
              <div className="chat-vacio-icon">💬</div>
              <span>No hay mensajes aún. ¡Inicia la conversación!</span>
            </div>
          )}

          {mensajes.map((msg, i) => {
            const esPropio = msg.remitente_id === miId
            return (
              <div key={msg.id || i} className={`mensaje ${esPropio ? 'propio' : 'ajeno'}`}>
                <div className="mensaje-burbuja">{msg.contenido}</div>
                {msg.creado_en && (
                  <div className="mensaje-hora">{formatHora(msg.creado_en)}</div>
                )}
              </div>
            )
          })}

          <div ref={bottomRef} />
        </div>

        {/* Input */}
        <div className="chat-input-area">
          <textarea
            className="chat-input"
            rows={1}
            value={texto}
            onChange={e => setTexto(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Escribe un mensaje... (Enter para enviar)"
          />
          <button
            className="chat-btn-enviar"
            onClick={handleEnviar}
            disabled={!texto.trim()}
          >
            <svg viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── SIDEBAR DE INFO ── */}
      <div className="chat-sidebar">

        {/* Tarjeta del contacto */}
        <div className="chat-sidebar-card">
          <h4>Contacto</h4>

          {/* Avatar grande en sidebar */}
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
            <Avatar url={avatarOtro} nombre={nombreOtro} size={64} fontSize={24} />
          </div>

          <div className="chat-sidebar-nombre">{nombreOtro}</div>
          <div className="chat-sidebar-rol">{rolOtro}</div>
          <div className="chat-sidebar-estado-badge">En línea ahora</div>
        </div>

        {/* Estadísticas */}
        <div className="chat-sidebar-card">
          <h4>Esta conversación</h4>
          <div className="chat-stat-row">
            <span className="chat-stat-label">Total mensajes</span>
            <span className="chat-stat-value">{totalMensajes}</span>
          </div>
          <div className="chat-stat-row">
            <span className="chat-stat-label">Enviados por ti</span>
            <span className="chat-stat-value">{misMensajes}</span>
          </div>
          <div className="chat-stat-row">
            <span className="chat-stat-label">Recibidos</span>
            <span className="chat-stat-value">{susMensajes}</span>
          </div>
          <div className="chat-stat-row">
            <span className="chat-stat-label">Fecha</span>
            <span className="chat-stat-value" style={{ fontSize: '11px' }}>{hoy}</span>
          </div>
        </div>

        {/* Tips */}
        <div className="chat-sidebar-card">
          <h4>Consejos</h4>
          <div className="chat-sidebar-tip">
            <span className="chat-sidebar-tip-icon">⌨️</span>
            <div className="chat-sidebar-tip-text">
              <strong>Enter para enviar</strong>
              Shift + Enter para nueva línea
            </div>
          </div>
          <div className="chat-sidebar-tip">
            <span className="chat-sidebar-tip-icon">⚡</span>
            <div className="chat-sidebar-tip-text">
              <strong>Tiempo real</strong>
              Los mensajes llegan al instante sin recargar
            </div>
          </div>
          <div className="chat-sidebar-tip">
            <span className="chat-sidebar-tip-icon">🔒</span>
            <div className="chat-sidebar-tip-text">
              <strong>Privado</strong>
              Solo tú y {nombreOtro} pueden ver esta conversación
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}