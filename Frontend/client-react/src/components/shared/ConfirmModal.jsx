// components/shared/ConfirmModal.jsx
// Modal de confirmación reutilizable que reemplaza window.confirm()

import './ConfirmModal.css'


const ConfirmModal = ({
  titulo    = '¿Estás seguro?',
  mensaje   = 'Esta acción no se puede deshacer.',
  labelAceptar  = 'Eliminar',
  labelCancelar = 'Cancelar',
  variante  = 'danger',   
  onAceptar,
  onCancelar,
}) => {
  return (
    <div className="cm-overlay" onClick={onCancelar}>
      <div className="cm-modal" onClick={e => e.stopPropagation()}>

        {/* Ícono */}
        <div className={`cm-icon cm-icon--${variante}`}>
          {variante === 'danger'  && '🗑️'}
          {variante === 'warning' && '⚠️'}
        </div>

        {/* Texto */}
        <h3 className="cm-titulo">{titulo}</h3>
        <p  className="cm-mensaje">{mensaje}</p>

        {/* Botones */}
        <div className="cm-acciones">
          <button className="cm-btn cm-btn--cancelar" onClick={onCancelar}>
            {labelCancelar}
          </button>
          <button
            className={`cm-btn cm-btn--aceptar cm-btn--${variante}`}
            onClick={onAceptar}
          >
            {labelAceptar}
          </button>
        </div>
      </div>
    </div>
  )
}

export default ConfirmModal