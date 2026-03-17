// En AyudaView.jsx
import Chat from '../shared/Chat'

// Aquí necesitas el ID del admin. 
// Opción simple: guardarlo en .env
const ADMIN_ID = import.meta.env.VITE_ADMIN_ID

export default function AyudaView() {
  return (
    <div>
      <h2>Contacta al Administrador</h2>
      <Chat
        otroUsuarioId={ADMIN_ID}
        nombreOtro="Administrador"
      />
    </div>
  )
}