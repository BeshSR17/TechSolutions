import { useState, useEffect } from 'react'
import { supabase }  from '../../supabaseClient'
import { apiClient } from '../../apiClient'
import { useToast }  from './Toast'
import './Perfil.css'

const Perfil = ({ session, onAvatarUpdate }) => {
  const toast = useToast()

  const [loading,     setLoading]     = useState(false)
  const [avatarUrl,   setAvatarUrl]   = useState(null)
  const [nombre,      setNombre]      = useState(session?.user?.user_metadata?.nombre || '')
  const [biografia,   setBiografia]   = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPass, setConfirmPass] = useState('')
  const [guardado,    setGuardado]    = useState(false)
  const [idVisual,    setIdVisual]    = useState(null)

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
        } else {
          toast.error('No se pudo cargar el perfil')
        }
      } catch {
        toast.error('Error de conexión al cargar el perfil')
      }
    }
    if (userId) getPerfil()
  }, [userId])

  const actualizarPerfil = async (e) => {
    e.preventDefault()

    if (!nombre.trim()) {
      toast.warning('El nombre no puede estar vacío')
      return
    }

    if (newPassword && newPassword !== confirmPass) {
      toast.warning('Las contraseñas no coinciden')
      return
    }

    if (newPassword && newPassword.length < 6) {
      toast.warning('La contraseña debe tener al menos 6 caracteres')
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
        const { error: passError } = await supabase.auth.updateUser({ password: newPassword })
        if (passError) throw passError
        setNewPassword('')
        setConfirmPass('')
      }

      setGuardado(true)
      setTimeout(() => setGuardado(false), 3000)
      toast.success('Perfil actualizado correctamente')
    } catch (err) {
      toast.error('Error: ' + err.message)
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
      toast.success('Foto de perfil actualizada')
    } catch (err) {
      toast.error('Error al subir la foto: ' + err.message)
    } finally {
      setLoading(false)
    }
  }

  const inicial = nombre ? nombre.charAt(0).toUpperCase() : '?'

  return (
    <div className="prf-root">

      {/* ── Columna izquierda ── */}
      <div className="prf-left">
        <div className="prf-avatar-wrap">
          {avatarUrl
            ? <img src={avatarUrl} alt="Avatar" className="prf-avatar-img" />
            : <div className="prf-avatar-placeholder">{inicial}</div>
          }
          {loading && <div className="prf-avatar-loading"><div className="prf-spinner" /></div>}
        </div>

        <label htmlFor="avatar-upload" className="prf-btn prf-btn--secondary prf-upload-btn">
          {loading ? 'Procesando...' : '📷 Cambiar foto'}
        </label>
        <input id="avatar-upload" type="file" accept="image/*" onChange={subirFoto} style={{ display: 'none' }} />

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

      {/* ── Columna derecha ── */}
      <div className="prf-right">
        <form className="prf-form" onSubmit={actualizarPerfil}>

          <div className="prf-section">
            <h3 className="prf-section-title">Datos personales</h3>
            <div className="prf-field">
              <label className="prf-label">Nombre completo</label>
              <input className="prf-input" type="text" placeholder="Tu nombre" value={nombre} onChange={e => setNombre(e.target.value)} />
            </div>
            <div className="prf-field">
              <label className="prf-label">Biografía</label>
              <textarea className="prf-textarea" placeholder="Cuéntanos sobre ti, tus habilidades o rol en el equipo..." value={biografia} onChange={e => setBiografia(e.target.value)} rows={4} />
            </div>
          </div>

          <div className="prf-section">
            <h3 className="prf-section-title">Seguridad</h3>
            <div className="prf-field">
              <label className="prf-label">Nueva contraseña <span className="prf-optional">(opcional)</span></label>
              <input className="prf-input" type="password" placeholder="Mínimo 6 caracteres" value={newPassword} onChange={e => setNewPassword(e.target.value)} />
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

          <div className="prf-form-footer">
            {guardado && <span className="prf-success-msg">✅ Cambios guardados correctamente</span>}
            <button type="submit" className="prf-btn prf-btn--primary" disabled={loading}>
              {loading ? 'Guardando...' : 'Guardar cambios'}
            </button>
          </div>

        </form>
      </div>
    </div>
  )
}

export default Perfil