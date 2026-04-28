// components/shared/Toast.jsx
import { useState, useCallback, createContext, useContext } from 'react'
import './Toast.css'

const ToastContext = createContext(null)

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const agregar = useCallback((mensaje, tipo = 'info', duracion = 3500) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, mensaje, tipo }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duracion)
  }, [])

  // ── Nuevo: toast de notificación enriquecido (título + texto) ─────────────
  const agregarNotif = useCallback((notif, duracion = 4500) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, ...notif, esNotif: true }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duracion)
  }, [])

  const cerrar = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ agregar, agregarNotif }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
          t.esNotif ? (
            // Toast de notificación (mensaje + consulta)
            <div key={t.id} className={`toast toast-notif toast-notif--${t.tipo}`}>
              <div className="toast-notif-icono">
                {t.tipo === 'consulta_nueva' ? '🎫' : '💬'}
              </div>
              <div className="toast-notif-body">
                <div className="toast-notif-titulo">{t.titulo}</div>
                <div className="toast-notif-texto">{t.texto}</div>
              </div>
              <button className="toast-close" onClick={() => cerrar(t.id)}>✕</button>
            </div>
          ) : (
            // Toast normal (success/error/warning/info)
            <div key={t.id} className={`toast toast--${t.tipo}`}>
              <span className="toast-icon">
                {t.tipo === 'success' && '✅'}
                {t.tipo === 'error'   && '❌'}
                {t.tipo === 'warning' && '⚠️'}
                {t.tipo === 'info'    && 'ℹ️'}
              </span>
              <span className="toast-msg">{t.mensaje}</span>
              <button className="toast-close" onClick={() => cerrar(t.id)}>✕</button>
            </div>
          )
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')
  return {
    success:    (msg)   => ctx.agregar(msg, 'success'),
    error:      (msg)   => ctx.agregar(msg, 'error'),
    warning:    (msg)   => ctx.agregar(msg, 'warning'),
    info:       (msg)   => ctx.agregar(msg, 'info'),
    notif:      (notif) => ctx.agregarNotif(notif),  // ← nuevo
  }
}