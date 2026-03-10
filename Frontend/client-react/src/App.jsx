import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import AdminDashboard from './components/Admin/AdminDashboard'
import UsersDashboard from './components/users/UsersDashboard'
import './App.css'

// Configuración de Supabase
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

// Reemplaza esto con la URL que copiaste de tu Bucket 'config'
const LOGO_URL = "https://ycyncrhqawrtgjknstxd.supabase.co/storage/v1/object/public/config/logo.png";

function App() {
  const [session, setSession] = useState(null)
  const [rol, setRol] = useState(null)
  const [loading, setLoading] = useState(false)
  const [view, setView] = useState('login') // 'login' o 'reset'
  const [isRecoveryMode, setIsRecoveryMode] = useState(false) 

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')

  const fetchRol = async (userID) => {
    const { data } = await supabase.from('perfiles').select('rol').eq('id', userID).single()
    if (data) setRol(data.rol)
  }

  useEffect(() => {
    // 1. Obtener sesión inicial
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) fetchRol(session.user.id)
    })

    // 2. Escuchar cambios de estado (Login, Logout, Recuperación de contraseña)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session)
      
      // Detectamos si el usuario viene de hacer clic en el correo de restablecimiento
      if (event === 'PASSWORD_RECOVERY') {
        setIsRecoveryMode(true)
      }

      if (session) {
        fetchRol(session.user.id)
      } else {
        setRol(null)
      }
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
      email,
      password,
      options: { data: { nombre: nombre } }
    })
    if (error) alert(error.message)
    else alert("¡Validación enviada! Revisa tu correo.")
    setLoading(false)
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin, 
    })
    if (error) alert("Error: " + error.message)
    else {
      alert("Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.")
      setView('login')
    }
    setLoading(false)
  }

  const handleUpdatePassword = async (e) => {
    e.preventDefault()
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: password })
    
    if (error) {
      alert("Error al actualizar: " + error.message)
    } else {
      alert("¡Contraseña actualizada! Ya puedes iniciar sesión con tu nueva clave.")
      setIsRecoveryMode(false)
      setView('login')
      await supabase.auth.signOut() 
    }
    setLoading(false)
  }

  const handleLogout = () => supabase.auth.signOut()

return (
  <div className="App">
    {/* CASO A: RECUPERACIÓN */}
    {isRecoveryMode ? (
      <div className="auth-wrapper"> {/* Envoltorio opcional para centrar ambos elementos */}
        <img src={LOGO_URL} alt="TechSolutions Logo" className="auth-logo-outside" />
        <div className="auth-container animation-slide">
          <p>Establecer Nueva Contraseña</p>
          <form className="auth-form" onSubmit={handleUpdatePassword}>
            <input 
              type="password" 
              placeholder="Nueva contraseña" 
              required 
              onChange={(e) => setPassword(e.target.value)} 
            />
            <button type="submit" disabled={loading}>
              {loading ? 'Guardando...' : 'Actualizar Contraseña'}
            </button>
          </form>
        </div>
      </div>
    ) : !session ? (
      /* CASO B: LOGIN / REGISTRO */
      <div className="auth-wrapper">
        {/* LOGO FUERA DEL CONTENEDOR */}
        <img src={LOGO_URL} alt="TechSolutions Logo" className="auth-logo-outside" />
        
        <div className="auth-container animation-slide">
          {view === 'login' ? (
            <>
              <p>Gestión Empresarial</p>
              <form className="auth-form" onSubmit={(e) => e.preventDefault()}>
                <input type="text" placeholder="Nombre Completo" onChange={(e) => setNombre(e.target.value)} />
                <input type="email" placeholder="Correo Corporativo" onChange={(e) => setEmail(e.target.value)} />
                <input type="password" placeholder="Contraseña" onChange={(e) => setPassword(e.target.value)} />
                
                <div className="button-group">
                  <button onClick={handleLogin} disabled={loading}>{loading ? 'Cargando...' : 'Iniciar Sesión'}</button>
                  <button onClick={handleSignUp} disabled={loading} className="secondary">Registrarse</button>
                </div>
                
                <button 
                  onClick={() => setView('reset')} 
                  className="link-btn"
                >
                  ¿Olvidaste tu contraseña?
                </button>
              </form>
            </>
          ) : (
            <>
              <p>Restablecer Contraseña</p>
              <form className="auth-form" onSubmit={handleResetPassword}>
                <input 
                  type="email" 
                  placeholder="Correo asociado" 
                  required 
                  onChange={(e) => setEmail(e.target.value)} 
                />
                <div className="button-group">
                  <button type="submit" disabled={loading}>Enviar enlace</button>
                  <button type="button" onClick={() => setView('login')} className="secondary">Volver</button>
                </div>
              </form>
            </>
          )}
        </div>
      </div>
    ) : (
      /* CASO C: DASHBOARDS */
      rol === 'Administrador' ? (
        <AdminDashboard session={session} handleLogout={handleLogout} logo={LOGO_URL} />
      ) : (
        <UsersDashboard session={session} handleLogout={handleLogout} logo={LOGO_URL} />
      )
    )}
  </div>
);
}

export default App