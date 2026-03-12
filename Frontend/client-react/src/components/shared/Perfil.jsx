import { useState, useEffect } from 'react'
import { supabase } from '../../supabaseClient' // Importación centralizada
import { apiClient } from '../../apiClient'     // Tu cliente con JWT
import './Perfil.css'

const Perfil = ({ session, onAvatarUpdate }) => {
  const [loading, setLoading] = useState(false)
  const [avatarUrl, setAvatarUrl] = useState(null)
  const [nombre, setNombre] = useState(session?.user?.user_metadata?.nombre || '')
  const [biografia, setBiografia] = useState('')
  const [newPassword, setNewPassword] = useState('')

  const userId = session?.user?.id

  // --- 1. CARGA INICIAL: Backend (Python + JWT) ---
  useEffect(() => {
    const getPerfil = async () => {
      try {
        const res = await apiClient(`/perfiles/${userId}`)
        if (res.ok) {
          const data = await res.json()
          setBiografia(data.biografia || '')
          setAvatarUrl(data.avatar_url || null)
        }
      } catch (error) {
        console.error("Error al cargar perfil:", error)
      }
    }
    if (userId) getPerfil()
  }, [userId])

  // --- 2. ACTUALIZACIÓN: Nombre, Biografía y Password ---
  const actualizarPerfil = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // A. Actualizar metadata en Supabase Auth
      await supabase.auth.updateUser({ data: { nombre: nombre } })

      // B. Sincronizar con Backend Python (vía apiClient)
      const res = await apiClient(`/perfiles/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ biografia, nombre })
      })
      if (!res.ok) throw new Error("Error al guardar en el servidor")

      // C. Cambio de contraseña opcional
      if (newPassword) {
        if (newPassword.length < 6) throw new Error("La contraseña es muy corta")
        const { error: passError } = await supabase.auth.updateUser({ password: newPassword })
        if (passError) throw passError
        setNewPassword('') 
      }

      alert("✨ ¡Perfil actualizado correctamente!")
    } catch (error) {
      alert("Error: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  // --- 3. GESTIÓN DE FOTO: Storage + Referencia en DB ---
  const subirFoto = async (e) => {
    try {
      setLoading(true)
      const file = e.target.files[0]
      if (!file) return

      const fileExt = file.name.split('.').pop()
      const fileName = `${userId}.${fileExt}`

      // Subida al bucket
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(fileName, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      // Obtener URL pública y añadir cache-buster para que se actualice la imagen
      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
      const urlConCacheBuster = `${data.publicUrl}?t=${new Date().getTime()}`

      // Guardar URL en Backend Python
      await apiClient(`/perfiles/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ avatar_url: urlConCacheBuster })
      })

      setAvatarUrl(urlConCacheBuster)
      if (onAvatarUpdate) onAvatarUpdate(urlConCacheBuster)
      
      alert("Foto de perfil actualizada")
    } catch (error) {
      alert("Error al subir: " + error.message)
    } finally {
      setLoading(false)
    }
  }

  // REPETIMOS LA ESTRUCTURA EXACTA DEL DISEÑO ANTERIOR
  return (
    <div className="perfil-container animation-slide">
      <h3>Configuración de Perfil</h3>
      <form onSubmit={actualizarPerfil} className="form-section">
        
        {/* Sección de Imagen idéntica a la original */}
        <div className="avatar-display" style={{ textAlign: 'center', marginBottom: '20px' }}>
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="avatar-img" />
          ) : (
            <div className="avatar-placeholder">Sin Foto</div>
          )}
        </div>

        {/* Controles de carga idénticos */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
          <label htmlFor="avatar-upload" className="btn-save" style={{ cursor: 'pointer' }}>
            {loading ? 'Procesando...' : 'Cambiar Fotografía'}
          </label>
          <input 
            id="avatar-upload" 
            type="file" 
            accept="image/*" 
            onChange={subirFoto} 
            style={{ display: 'none' }} 
          />
        </div>

        {/* Campos de texto con clases originales */}
        <label>Nombre Completo</label>
        <input 
          type="text" 
          value={nombre} 
          onChange={(e) => setNombre(e.target.value)} 
        />

        <label>Biografía</label>
        <textarea 
          value={biografia} 
          onChange={(e) => setBiografia(e.target.value)} 
          placeholder="Cuéntanos sobre ti..." 
        />

        <label>Nueva Contraseña (Opcional)</label>
        <input 
          type="password" 
          placeholder="******" 
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)} 
        />

        <button type="submit" className="btn-save" disabled={loading}>
          {loading ? 'Guardando...' : 'Guardar Cambios'}
        </button>
      </form>
    </div>
  )
}

export default Perfil