import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import AdminDashboard from './components/AdminDashboard'
import './App.css'

const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

function App() {
  const [session, setSession] = useState(null)
  const [loading, setLoading] = useState(false)
  
  // Estados para capturar lo que el usuario escribe
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [nombre, setNombre] = useState('')

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    supabase.auth.onAuthStateChange((_event, session) => setSession(session))
  }, [])

  // Funciones de autenticación
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
    else alert("¡Revisa tu correo para validar tu cuenta!")
    setLoading(false)
  }

  return (
    <div className="App">
      {!session ? (
        <div className="auth-container">
          <h1>TechSolutions S.A.</h1>
          <p>Gestión Empresarial</p>
          
          <form className="auth-form">
            <input 
              type="text" 
              placeholder="Nombre Completo" 
              onChange={(e) => setNombre(e.target.value)} 
            />
            <input 
              type="email" 
              placeholder="Correo Corporativo" 
              onChange={(e) => setEmail(e.target.value)} 
            />
            <input 
              type="password" 
              placeholder="Contraseña" 
              onChange={(e) => setPassword(e.target.value)} 
            />
            
            <div className="button-group">
              <button onClick={handleLogin} disabled={loading}>
                {loading ? 'Cargando...' : 'Iniciar Sesión'}
              </button>
              <button onClick={handleSignUp} disabled={loading} className="secondary">
                Registrarse
              </button>
            </div>
          </form>
        </div>
      ) : (
        <div className="main-layout">
          <aside className="side-nav">
            <div className="nav-logo">TechSolutions</div>
            <button className="logout-btn" onClick={() => supabase.auth.signOut()}>
              Cerrar Sesión
            </button>
          </aside>

          <main className="content-area">
            <AdminDashboard session={session} supabase={supabase} />
          </main>
        </div>
      )}
    </div>
  );
}

export default App