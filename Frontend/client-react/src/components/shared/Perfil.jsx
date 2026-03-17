import { useState, useEffect } from 'react'
import { supabase }   from '../../supabaseClient'
import { apiClient }  from '../../apiClient'
import './Perfil.css'

const Perfil = ({ session, onAvatarUpdate }) => {
  const [loading,      setLoading]      = useState(false)
  const [avatarUrl,    setAvatarUrl]    = useState(null)
  const [nombre,       setNombre]       = useState(session?.user?.user_metadata?.nombre || '')
  const [biografia,    setBiografia]    = useState('')
  const [newPassword,  setNewPassword]  = useState('')
  const [confirmPass,  setConfirmPass]  = useState('')
  const [guardado,     setGuardado]     = useState(false)
  const [idVisual,     setIdVisual]     = useState(null)

  const userId = session?.user?.id

  useEffect(() => {
    const getPerfil = async () => {
      try {
        const res = await apiClient(`/perfiles/${userId}`)
        if (res.ok) {
          const data = await res.json()
          setBiografia(data.biografia || '')
          setAvatarUrl(data.avatar_url || null)
          setIdVisual(data.id_visual ? String(data.id_visual) : null)
        }
      } catch (err) {
        console.error('Error al cargar perfil:', err)
      }
    }
    if (userId) getPerfil()
  }, [userId])

  const actualizarPerfil = async (e) => {
    e.preventDefault()
    if (newPassword && newPassword !== confirmPass) {
      alert('Las contraseñas no coinciden.')
      return
    }
    setLoading(true)
    try {
      await supabase.auth.updateUser({ data: { nombre } })

      const res = await apiClient(`/perfiles/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ biografia, nombre })
      })
      if (!res.ok) throw new Error('Error al guardar en el servidor')

      if (newPassword) {
        if (newPassword.length < 6) throw new Error('La contraseña es muy corta (mínimo 6 caracteres)')
        const { error: passError } = await supabase.auth.updateUser({ password: newPassword })
        if (passError) throw passError
        setNewPassword('')
        setConfirmPass('')
      }

      setGuardado(true)
      setTimeout(() => setGuardado(false), 3000)
    } catch (err) {
      alert('Error: ' + err.message)
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
        .upload(fileName, file, { upsert: true, contentType: file.type })

      if (uploadError) throw uploadError

      const { data } = supabase.storage.from('avatars').getPublicUrl(fileName)
      const urlConCache = `${data.publicUrl}?t=${Date.now()}`

      await apiClient(`/perfiles/${userId}`, {
        method: 'PUT',
        body: JSON.stringify({ avatar_url: urlConCache })
      })

      setAvatarUrl(urlConCache)
      if (onAvatarUpdate) onAvatarUpdate(urlConCache)
    } catch (err) {
      alert('Error al subir: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const inicial = nombre ? nombre.charAt(0).toUpperCase() : '?'

  return (
    <div className="prf-root">

      {/* ── Columna izquierda: avatar + info básica ── */}
      <div className="prf-left">

        {/* Avatar */}
        <div className="prf-avatar-wrap">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="prf-avatar-img" />
          ) : (
            <div className="prf-avatar-placeholder">{inicial}</div>
          )}
          {loading && <div className="prf-avatar-loading"><div className="prf-spinner" /></div>}
        </div>

        {/* Subir foto */}
        <label htmlFor="avatar-upload" className="prf-btn prf-btn--secondary prf-upload-btn">
          {loading ? 'Procesando...' : '📷 Cambiar foto'}
        </label>
        <input
          id="avatar-upload"
          type="file"
          accept="image/*"
          onChange={subirFoto}
          style={{ display: 'none' }}
        />

        {/* Info card */}
        <div className="prf-info-card">
          <div className="prf-info-row">
            <span className="prf-info-label">Email</span>
            <span className="prf-info-val">{session?.user?.email}</span>
          </div>
          <div className="prf-info-row">
            <span className="prf-info-label">ID de colaborador</span>
            <span className="prf-info-val prf-mono">{idVisual || '—'}</span>
          </div>
          <div className="prf-info-row">
            <span className="prf-info-label">Último acceso</span>
            <span className="prf-info-val prf-mono">
              {session?.user?.last_sign_in_at
                ? new Date(session.user.last_sign_in_at).toLocaleDateString('es', { day: 'numeric', month: 'short', year: 'numeric' })
                : '—'}
            </span>
          </div>
        </div>
      </div>

      {/* ── Columna derecha: formulario ── */}
      <div className="prf-right">
        <form className="prf-form" onSubmit={actualizarPerfil}>

          {/* Sección: datos personales */}
          <div className="prf-section">
            <h3 className="prf-section-title">Datos personales</h3>

            <div className="prf-field">
              <label className="prf-label">Nombre completo</label>
              <input
                className="prf-input"
                type="text"
                placeholder="Tu nombre"
                value={nombre}
                onChange={e => setNombre(e.target.value)}
              />
            </div>

            <div className="prf-field">
              <label className="prf-label">Biografía</label>
              <textarea
                className="prf-textarea"
                placeholder="Cuéntanos sobre ti, tus habilidades o rol en el equipo..."
                value={biografia}
                onChange={e => setBiografia(e.target.value)}
                rows={4}
              />
            </div>
          </div>

          {/* Sección: seguridad */}
          <div className="prf-section">
            <h3 className="prf-section-title">Seguridad</h3>

            <div className="prf-field">
              <label className="prf-label">Nueva contraseña <span className="prf-optional">(opcional)</span></label>
              <input
                className="prf-input"
                type="password"
                placeholder="Mínimo 6 caracteres"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
              />
            </div>

            <div className="prf-field">
              <label className="prf-label">Confirmar contraseña</label>
              <input
                className={`prf-input ${newPassword && confirmPass && newPassword !== confirmPass ? 'prf-input--error' : ''}`}
                type="password"
                placeholder="Repite la nueva contraseña"
                value={confirmPass}
                onChange={e => setConfirmPass(e.target.value)}
              />
              {newPassword && confirmPass && newPassword !== confirmPass && (
                <span className="prf-error-msg">Las contraseñas no coinciden</span>
              )}
            </div>
          </div>

          {/* Botón guardar */}
          <div className="prf-form-footer">
            {guardado && (
              <span className="prf-success-msg">✅ Cambios guardados correctamente</span>
            )}
            <button
              type="submit"
              className="prf-btn prf-btn--primary"
              disabled={loading}
            >
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

export default Perfil