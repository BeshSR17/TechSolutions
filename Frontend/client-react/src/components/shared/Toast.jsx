// components/shared/Toast.jsx
// Sistema de notificaciones que reemplaza todos los alert()

import { useState, useEffect, useCallback, createContext, useContext } from 'react'
import './Toast.css'

// ── Contexto global ───────────────────────────────────────────────────────────
const ToastContext = createContext(null)

// ── Proveedor  ────────────────────────────────
export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])

  const agregar = useCallback((mensaje, tipo = 'info', duracion = 3500) => {
    const id = Date.now() + Math.random()
    setToasts(prev => [...prev, { id, mensaje, tipo }])
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id))
    }, duracion)
  }, [])

  const cerrar = (id) => setToasts(prev => prev.filter(t => t.id !== id))

  return (
    <ToastContext.Provider value={{ agregar }}>
      {children}
      <div className="toast-container">
        {toasts.map(t => (
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
        ))}
      </div>
    </ToastContext.Provider>
  )
}


export function useToast() {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast debe usarse dentro de <ToastProvider>')

  return {
    success: (msg) => ctx.agregar(msg, 'success'),
    error:   (msg) => ctx.agregar(msg, 'error'),
    warning: (msg) => ctx.agregar(msg, 'warning'),
    info:    (msg) => ctx.agregar(msg, 'info'),
  }
}