import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'
import './Perfil.css'

// 1. Instancia fuera del componente para evitar múltiples conexiones
const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
)

const Perfil = ({ session, onAvatarUpdate }) => {
  const [loading, setLoading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [nombre, setNombre] = useState(session.user.user_metadata?.nombre || '')
  const [biografia, setBiografia] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const userId = session.user.id

  useEffect(() => {
    const getPerfil = async () => {
      const { data, error } = await supabase
        .from('perfiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle()
      
      if (error) {
        console.error("Error al cargar perfil:", error)
      } else if (data) {
        setBiografia(data.biografia || '')
        if (data.avatar_url) setAvatarUrl(data.avatar_url)
      }
    }
    getPerfil()
  }, [userId])

  const actualizarPerfil = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      await supabase.auth.updateUser({ data: { nombre: nombre } })
      const { error: bioError } = await supabase.from('perfiles').update({ biografia }).eq('id', userId)
      if (bioError) throw bioError

      if (newPassword) {
        const { error: passError } = await supabase.auth.updateUser({ password: newPassword })
        if (passError) throw passError
      }
      alert("¡Perfil actualizado correctamente!")
    } catch (error) {
      alert("Error al actualizar: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  const subirFoto = async (e) => {
    try {
      setLoading(true)
      const file = e.target.files[0]
      if (!file) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { 
          upsert: true,
          contentType: file.type 
        })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
      const urlConCacheBuster = `${data.publicUrl}?t=${new Date().getTime()}`

      await supabase.from('perfiles').update({ avatar_url: urlConCacheBuster }).eq('id', userId)

      setAvatarUrl(urlConCacheBuster)
      
      // 2. Llamada segura al padre
      if (onAvatarUpdate) {
        onAvatarUpdate(urlConCacheBuster)
      }
      
      alert("Foto de perfil actualizada")
    } catch (error) {
      alert("Error al subir: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="perfil-container animation-slide">
      <h3>Configuración de Perfil</h3>
      <form onSubmit={actualizarPerfil} className="form-section">
        
        <div className="avatar-display" style={{ textAlign: 'center', marginBottom: '20px' }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="avatar-img" />
          ) : (
            <div className="avatar-placeholder">Sin Foto</div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <label htmlFor="avatar-upload" className="btn-save" style={{ cursor: 'pointer' }}>
            {loading ? 'Procesando...' : 'Cambiar Fotografía'}
          </label>
          <input id="avatar-upload" type="file" accept="image/*" onChange={subirFoto} style={{ display: 'none' }} />
        </div>

        <label>Nombre Completo</label>
        <input type="text" value={nombre} onChange={(e) => setNombre(e.target.value)} />

        <label>Biografía</label>
        <textarea value={biografia} onChange={(e) => setBiografia(e.target.value)} placeholder="Cuéntanos sobre ti..." />

        <label>Nueva Contraseña (Opcional)</label>
        <input type="password" placeholder="******" onChange={(e) => setNewPassword(e.target.value)} />

        <button type="submit" className="btn-save" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </form>
    </div>
  )
}

export default Perfil