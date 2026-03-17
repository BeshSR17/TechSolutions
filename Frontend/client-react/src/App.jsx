import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import AdminDashboard from './components/Admin/AdminDashboard'
import UsersDashboard from './components/users/UsersDashboard'
import { ToastProvider } from './components/shared/Toast'
import './App.css'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const LOGO_URL = "https://ycyncrhqawrtgjknstxd.supabase.co/storage/v1/object/public/config/logo.png"

function App() {
  const [session,          setSession]          = useState(null)
  const [rol,              setRol]              = useState(null)
  const [loading,          setLoading]          = useState(false)
  const [view,             setView]             = useState('login') // 'login' | 'reset'
  const [isRecoveryMode,   setIsRecoveryMode]   = useState(false)
  const [authTab,          setAuthTab]          = useState('login') // 'login' | 'register'

  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const [nombre,   setNombre]   = useState('')

  const fetchRol = async (userID) => {
    const { data } = await supabase.from('perfiles').select('rol').eq('id', userID).single()
    if (data) setRol(data.rol)
  }

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchRol(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      if (event === 'PASSWORD_RECOVERY') setIsRecoveryMode(true)
      if (session) fetchRol(session.user.id)
      else setRol(null)
    })

    return () => subscription.unsubscribe()
  }, [])

  const handleLogin = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) alert(error.message)
    setLoading(false)
  }

  const handleSignUp = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.signUp({
      email, password,
      options: { data: { nombre } }
    })
    if (error) alert(error.message)
    else alert('¡Revisa tu correo para validar tu cuenta!')
    setLoading(false)
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin,
    })
    if (error) alert('Error: ' + error.message)
    else { alert('Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.'); setView('login') }
    setLoading(false)
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password })
    if (error) alert('Error al actualizar: ' + error.message)
    else {
      alert('¡Contraseña actualizada! Ya puedes iniciar sesión.')
      setIsRecoveryMode(false)
      setView('login')
      await supabase.auth.signOut()
    }
    setLoading(false)
  }

  const handleLogout = () => supabase.auth.signOut()

  // ── Dashboards ─────────────────────────────────────────────────────────────
  if (session && rol) {
    return rol === 'Administrador'
      ? <AdminDashboard session={session} handleLogout={handleLogout} logo={LOGO_URL} />
      : <UsersDashboard session={session} handleLogout={handleLogout} logo={LOGO_URL} />
  }

  // ── Recovery mode ──────────────────────────────────────────────────────────
  if (isRecoveryMode) {
    return (
      <div className="auth-scene">
        <div className="auth-bg-grid" />
        <div className="auth-glow auth-glow--top"    />
        <div className="auth-glow auth-glow--bottom" />

        <div className="auth-card auth-card--narrow">
          <img src={LOGO_URL} alt="TechSolutions" className="auth-logo" />
          <h2 className="auth-title">Nueva contraseña</h2>
          <p className="auth-subtitle">Elige una contraseña segura para tu cuenta.</p>

          <form className="auth-form" onSubmit={handleUpdatePassword}>
            <div className="auth-field">
              <label className="auth-label">Nueva contraseña</label>
              <input className="auth-input" type="password" placeholder="Mínimo 6 caracteres" required
                onChange={e => setPassword(e.target.value)} />
            </div>
            <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
              {loading ? <span className="auth-spinner" /> : 'Actualizar contraseña'}
            </button>
          </form>
        </div>
      </div>
    )
  }

  // ── Reset password ─────────────────────────────────────────────────────────
  if (view === 'reset') {
    return (
      <div className="auth-scene">
        <div className="auth-bg-grid" />
        <div className="auth-glow auth-glow--top"    />
        <div className="auth-glow auth-glow--bottom" />

        <div className="auth-card auth-card--narrow">
          <img src={LOGO_URL} alt="TechSolutions" className="auth-logo" />
          <h2 className="auth-title">Restablecer contraseña</h2>
          <p className="auth-subtitle">Te enviaremos un enlace a tu correo registrado.</p>

          <form className="auth-form" onSubmit={handleResetPassword}>
            <div className="auth-field">
              <label className="auth-label">Correo corporativo</label>
              <input className="auth-input" type="email" placeholder="tu@empresa.com" required
                onChange={e => setEmail(e.target.value)} />
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

  // ── Login / Register ───────────────────────────────────────────────────────
  return (
    <ToastProvider>
    <div className="auth-scene">
      {/* Fondo decorativo */}
      <div className="auth-bg-grid" />
      <div className="auth-glow auth-glow--top"    />
      <div className="auth-glow auth-glow--bottom" />

      <div className="auth-card">
        {/* Logo */}
        <img src={LOGO_URL} alt="TechSolutions" className="auth-logo" />

        {/* Tabs login / registro */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${authTab === 'login' ? 'auth-tab--active' : ''}`}
            onClick={() => setAuthTab('login')}
          >
            Iniciar sesión
          </button>
          <button
            className={`auth-tab ${authTab === 'register' ? 'auth-tab--active' : ''}`}
            onClick={() => setAuthTab('register')}
          >
            Registrarse
          </button>
        </div>

        {/* ── Tab: Login ── */}
        {authTab === 'login' && (
          <form className="auth-form" onSubmit={handleLogin}>
            <div className="auth-field">
              <label className="auth-label">Correo corporativo</label>
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

            <button
              type="button"
              className="auth-link"
              onClick={() => setView('reset')}
            >
              ¿Olvidaste tu contraseña?
            </button>
          </form>
        )}

        {/* ── Tab: Registro ── */}
        {authTab === 'register' && (
          <form className="auth-form" onSubmit={handleSignUp}>
            <div className="auth-field">
              <label className="auth-label">Nombre completo</label>
              <input className="auth-input" type="text" placeholder="Tu nombre" required
                value={nombre} onChange={e => setNombre(e.target.value)} />
            </div>
            <div className="auth-field">
              <label className="auth-label">Correo corporativo</label>
              <input className="auth-input" type="email" placeholder="tu@empresa.com" required
                value={email} onChange={e => setEmail(e.target.value)} />
            </div>
            <div className="auth-field">
              <label className="auth-label">Contraseña</label>
              <input className="auth-input" type="password" placeholder="Mínimo 6 caracteres" required
                value={password} onChange={e => setPassword(e.target.value)} />
            </div>

            <button type="submit" className="auth-btn auth-btn--primary" disabled={loading}>
              {loading ? <span className="auth-spinner" /> : 'Crear cuenta'}
            </button>
          </form>
        )}
      </div>
    </div>
  </ToastProvider>
  )
}

export default App