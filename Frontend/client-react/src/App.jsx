// src/App.jsx
import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import { apiClient } from './apiClient'
import AdminDashboard from './components/Admin/AdminDashboard'
import UsersDashboard from './components/users/UsersDashboard'
import ClienteDashboard from './components/Cliente/ClientDashboard'
import { ToastProvider, useToast } from './components/shared/Toast'
import './App.css'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const LOGO_URL = "https://ycyncrhqawrtgjknstxd.supabase.co/storage/v1/object/public/config/logo.png"

function AppContent() {
  const toast = useToast()

  const [session,        setSession]        = useState(null)
  const [rol,            setRol]            = useState(null)
  const [loading,        setLoading]        = useState(false)
  const [view,           setView]           = useState('login')
  const [isRecoveryMode, setIsRecoveryMode] = useState(false)
  const [authTab,        setAuthTab]        = useState('login')

  // Tipo de registro seleccionado en el formulario de registro
  // 'usuario' | 'cliente'
  const [tipoRegistro, setTipoRegistro] = useState('usuario')

  // Campos comunes
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [nombre,   setNombre]   = useState('')

  // Campos adicionales solo para registro de cliente
  const [empresa,   setEmpresa]   = useState('')
  const [telefono,  setTelefono]  = useState('')

  const fetchRol = async (userID) => {
    const { data } = await supabase.from('perfiles').select('rol').eq('id', userID).single()
    if (data) setRol(data.rol)
  }

  const marcarActivo = async (userID) => {
    await supabase.from('perfiles').update({ estado: 'Activo' }).eq('id', userID)
  }

  const marcarInactivo = async (userID) => {
    await supabase.from('perfiles').update({ estado: 'Inactivo' }).eq('id', userID)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) {
        fetchRol(session.user.id)
        marcarActivo(session.user.id)
      }
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      if (event === 'PASSWORD_RECOVERY') setIsRecoveryMode(true)
      if (event === 'SIGNED_IN' && session) {
        fetchRol(session.user.id)
        marcarActivo(session.user.id)
      }
      if (event === 'SIGNED_OUT') {
        setRol(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  // ── Login ───────────────────────────────────────────────────────────────────
  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) {
      if (error.message.includes('Invalid login credentials')) {
        toast.error('Credenciales incorrectas. Verifica tu correo y contraseña.')
      } else if (error.message.includes('Email not confirmed')) {
        toast.warning('Debes confirmar tu correo antes de iniciar sesión.')
      } else {
        toast.error('Error al iniciar sesión: ' + error.message)
      }
    }
    setLoading(false)
  }

  // ── Registro (usuario normal o cliente) ─────────────────────────────────────
  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Validación extra para clientes
      if (tipoRegistro === 'cliente' && !empresa.trim()) {
        toast.warning('El nombre de la empresa es requerido para registrarse como cliente.')
        setLoading(false)
        return
      }

      // 1. Crear cuenta en Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: { data: { nombre } },
      })

      if (authError) {
        if (authError.message.includes('already registered')) {
          toast.warning('Este correo ya está registrado. Intenta iniciar sesión.')
        } else {
          toast.error('Error al registrarse: ' + authError.message)
        }
        setLoading(false)
        return
      }

      // 2. Si es cliente, llamar al endpoint que crea perfil + fila en clientes
      if (tipoRegistro === 'cliente') {
        // Necesitamos el token del nuevo usuario — Supabase lo devuelve en la sesión
        // pero con email confirmation puede no haber sesión aún.
        // En ese caso guardamos los datos y mostramos instrucción.
        const newSession = authData?.session

        if (newSession?.access_token) {
          // Hay sesión inmediata (email confirmation desactivado en Supabase)
          const res = await fetch(
            `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : 'http://localhost:5000/api'}/auth/registro-cliente`,
            {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${newSession.access_token}`,
              },
              body: JSON.stringify({
                nombre_contacto: nombre,
                empresa:         empresa.trim(),
                email:           email,
                telefono:        telefono.trim(),
              }),
            }
          )

          if (!res.ok) {
            const err = await res.json()
            toast.error('Cuenta creada pero hubo un error al configurar tu perfil: ' + (err.error || ''))
          } else {
            toast.success('¡Cuenta de cliente creada! Ya puedes iniciar sesión.')
          }
        } else {
          // Email confirmation activado — el usuario debe confirmar primero.
          // Guardamos en localStorage para completar el registro tras confirmación.
          localStorage.setItem('pendingClienteRegistro', JSON.stringify({
            nombre_contacto: nombre,
            empresa:         empresa.trim(),
            email:           email,
            telefono:        telefono.trim(),
          }))
          toast.success('¡Cuenta creada! Revisa tu correo para confirmarla. Al iniciar sesión se completará tu registro.')
        }
      } else {
        // Registro normal de usuario — el trigger de Supabase o el flujo existente
        // ya crea la fila en perfiles con rol = 'Usuario'
        toast.success('¡Cuenta creada! Revisa tu correo para confirmarla.')
      }

      setAuthTab('login')
      // Limpiar campos del formulario
      setNombre(''); setEmpresa(''); setTelefono(''); setEmail(''); setPassword('')

    } catch (err) {
      console.error(err)
      toast.error('Error inesperado al registrarse.')
    } finally {
      setLoading(false)
    }
  }

  // ── Completar registro cliente pendiente (tras confirmar email) ─────────────
  // Se ejecuta cuando el usuario inicia sesión por primera vez tras confirmar email
  // y tiene datos pendientes en localStorage.
  const completarRegistroClientePendiente = async (accessToken) => {
    const pendiente = localStorage.getItem('pendingClienteRegistro')
    if (!pendiente) return

    try {
      const datos = JSON.parse(pendiente)
      const res = await fetch(
        `${import.meta.env.VITE_API_URL ? import.meta.env.VITE_API_URL + '/api' : 'http://localhost:5000/api'}/auth/registro-cliente`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${accessToken}`,
          },
          body: JSON.stringify(datos),
        }
      )
      if (res.ok) {
        localStorage.removeItem('pendingClienteRegistro')
      }
    } catch (err) {
      console.error('Error completando registro cliente pendiente:', err)
    }
  }

  // ── Reset / Update password ─────────────────────────────────────────────────
  const handleResetPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) {
      toast.error('Error: ' + error.message)
    } else {
      toast.success('Si el correo está registrado, recibirás un enlace de restablecimiento.')
      setView('login')
    }
    setLoading(false)
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    if (password.length < 6) {
      toast.warning('La contraseña debe tener al menos 6 caracteres.')
      return
    }
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) {
      toast.error('Error al actualizar: ' + error.message)
    } else {
      toast.success('¡Contraseña actualizada! Ya puedes iniciar sesión.')
      setIsRecoveryMode(false)
      setView('login')
      await supabase.auth.signOut()
    }
    setLoading(false)
  }

  // ── Logout ───────────────────────────────────────────────────────────────────
  const handleLogout = async () => {
    const { data: { session: currentSession } } = await supabase.auth.getSession()
    if (currentSession?.user?.id) {
      await marcarInactivo(currentSession.user.id)
    }
    await supabase.auth.signOut()
  }

  // ── Cuando inicia sesión, completar registro pendiente si existe ─────────────
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === 'SIGNED_IN' && session?.access_token) {
        await completarRegistroClientePendiente(session.access_token)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  // ── Routing por rol ──────────────────────────────────────────────────────────
  if (session && rol) {
    if (rol === 'Administrador') return <AdminDashboard session={session} handleLogout={handleLogout} logo={LOGO_URL} />
    if (rol === 'Usuario')       return <UsersDashboard session={session} handleLogout={handleLogout} logo={LOGO_URL} />
    if (rol === 'Cliente')       return <ClienteDashboard session={session} handleLogout={handleLogout} logo={LOGO_URL} />
  }

  // ── Recovery mode ────────────────────────────────────────────────────────────
  if (isRecoveryMode) {
    return (
      <div className="auth-scene">
        <div className="auth-bg-grid" /><div className="auth-glow auth-glow--top" /><div className="auth-glow auth-glow--bottom" />
        <div className="auth-card auth-card--narrow">
          <img src={LOGO_URL} alt="Logo" className="auth-logo" />
          <h2 className="auth-title">Nueva contraseña</h2>
          <p className="auth-subtitle">Elige una contraseña segura para tu cuenta.</p>
          <form className="auth-form" onSubmit={handleUpdatePassword}>
            <div className="auth-field">
              <label className="auth-label">Nueva contraseña</label>
              <input className="auth-input" type="password" placeholder="Mínimo 6 caracteres" required onChange={e => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
              {loading ? <span className="auth-spinner" /> : 'Actualizar contraseña'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Reset password ────────────────────────────────────────────────────────────
  if (view === 'reset') {
    return (
      <div className="auth-scene">
        <div className="auth-bg-grid" /><div className="auth-glow auth-glow--top" /><div className="auth-glow auth-glow--bottom" />
        <div className="auth-card auth-card--narrow">
          <img src={LOGO_URL} alt="Logo" className="auth-logo" />
          <h2 className="auth-title">Restablecer contraseña</h2>
          <p className="auth-subtitle">Te enviaremos un enlace a tu correo registrado.</p>
          <form className="auth-form" onSubmit={handleResetPassword}>
            <div className="auth-field">
              <label className="auth-label">Correo</label>
              <input className="auth-input" type="email" placeholder="tu@empresa.com" required onChange={e => setEmail(e.target.value)} />
            </div>
            <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
              {loading ? <span className="auth-spinner" /> : 'Enviar enlace'}
            </button>
            <button type="button" className="auth-btn auth-btn--ghost" onClick={() => setView('login')}>
              ← Volver al inicio de sesión
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Login / Register ──────────────────────────────────────────────────────────
  return (
    <div className="auth-scene">
      <div className="auth-bg-grid" />
      <div className="auth-glow auth-glow--top" />
      <div className="auth-glow auth-glow--bottom" />

      <div className="auth-card">
        <img src={LOGO_URL} alt="Logo" className="auth-logo" />

        <div className="auth-tabs">
          <button className={`auth-tab ${authTab === 'login'    ? 'auth-tab--active' : ''}`} onClick={() => setAuthTab('login')}>
            Iniciar sesión
          </button>
          <button className={`auth-tab ${authTab === 'register' ? 'auth-tab--active' : ''}`} onClick={() => setAuthTab('register')}>
            Registrarse
          </button>
        </div>

        {/* ── LOGIN ── */}
        {authTab === 'login' && (
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="auth-field">
              <label className="auth-label">Correo</label>
              <input className="auth-input" type="email" placeholder="tu@empresa.com" required
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="auth-field">
              <label className="auth-label">Contraseña</label>
              <input className="auth-input" type="password" placeholder="••••••••" required
                value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
              {loading ? <span className="auth-spinner" /> : 'Iniciar sesión'}
            </button>
            <button type="button" className="auth-link" onClick={() => setView('reset')}>
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        )}

        {/* ── REGISTRO ── */}
        {authTab === 'register' && (
          <form className="auth-form" onSubmit={handleSignUp}>

            {/* Selector de tipo de cuenta */}
            <div className="auth-tipo-selector">
              <button
                type="button"
                className={`auth-tipo-btn ${tipoRegistro === 'usuario' ? 'auth-tipo-btn--active' : ''}`}
                onClick={() => setTipoRegistro('usuario')}
              >
                <span className="auth-tipo-icon">👤</span>
                <span className="auth-tipo-label">Colaborador</span>
                <span className="auth-tipo-desc">Empleado o colaborador interno</span>
              </button>
              <button
                type="button"
                className={`auth-tipo-btn ${tipoRegistro === 'cliente' ? 'auth-tipo-btn--active' : ''}`}
                onClick={() => setTipoRegistro('cliente')}
              >
                <span className="auth-tipo-icon">🏢</span>
                <span className="auth-tipo-label">Cliente</span>
                <span className="auth-tipo-desc">Empresa o cliente externo</span>
              </button>
            </div>

            {/* Campos comunes */}
            <div className="auth-field">
              <label className="auth-label">
                {tipoRegistro === 'cliente' ? 'Nombre del contacto *' : 'Nombre completo *'}
              </label>
              <input className="auth-input" type="text"
                placeholder={tipoRegistro === 'cliente' ? 'Nombre del responsable' : 'Tu nombre completo'}
                required value={nombre} onChange={e => setNombre(e.target.value)} />
            </div>

            {/* Campos exclusivos de cliente */}
            {tipoRegistro === 'cliente' && (
              <>
                <div className="auth-field">
                  <label className="auth-label">Nombre de la empresa *</label>
                  <input className="auth-input" type="text" placeholder="Ej: Constructora XYZ S.A."
                    required value={empresa} onChange={e => setEmpresa(e.target.value)} />
                </div>
                <div className="auth-field">
                  <label className="auth-label">Teléfono (opcional)</label>
                  <input className="auth-input" type="tel" placeholder="+502 0000-0000"
                    value={telefono} onChange={e => setTelefono(e.target.value)} />
                </div>
              </>
            )}

            <div className="auth-field">
              <label className="auth-label">Correo *</label>
              <input className="auth-input" type="email" placeholder="tu@empresa.com"
                required value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="auth-field">
              <label className="auth-label">Contraseña *</label>
              <input className="auth-input" type="password" placeholder="Mínimo 6 caracteres"
                required value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
              {loading
                ? <span className="auth-spinner" />
                : tipoRegistro === 'cliente'
                  ? '🏢 Crear cuenta de cliente'
                  : '👤 Crear cuenta de colaborador'
              }
            </button>
          </form>
        )}
      </div>
    </div>
  )
}

function App() {
  return (
    <ToastProvider>
      <AppContent />
    </ToastProvider>
  )
}

export default App