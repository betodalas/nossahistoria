interface ConfirmModalProps {
  /** Emoji ou ícone exibido no topo do modal */
  icon?: string
  /** Título principal */
  title: string
  /** Texto explicativo abaixo do título */
  description?: string
  /** Conteúdo adicional (ex: lista de consequências) */
  children?: React.ReactNode
  /** Rótulo do botão de confirmação */
  confirmLabel?: string
  /** Se true, o botão de confirmação fica com cor de perigo (vermelho) */
  danger?: boolean
  /** Rótulo do botão de cancelamento */
  cancelLabel?: string
  /** Se true, desabilita ambos os botões e mostra estado de carregamento */
  loading?: boolean
  /** Rótulo exibido no botão de confirmação durante loading */
  loadingLabel?: string
  /** Mensagem de erro a ser exibida acima dos botões */
  errorMessage?: string
  onConfirm: () => void
  onCancel: () => void
}

export default function ConfirmModal({
  icon = '❓',
  title,
  description,
  children,
  confirmLabel = 'Confirmar',
  danger = false,
  cancelLabel = 'Cancelar',
  loading = false,
  loadingLabel,
  errorMessage,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      style={{ background: 'rgba(61,26,42,0.5)' }}
      onClick={() => !loading && onCancel()}
    >
      <div
        className="w-full rounded-t-3xl p-6"
        style={{ background: 'white', maxWidth: '430px' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Handle bar */}
        <div className="w-10 h-1 rounded-full mx-auto mb-5" style={{ background: '#E8C4CE' }} />

        {/* Conteúdo */}
        <div className="text-center mb-5">
          <div className="text-4xl mb-3">{icon}</div>
          <p className="text-base font-bold" style={{ color: '#3D1A2A' }}>{title}</p>
          {description && (
            <p className="text-sm mt-1" style={{ color: '#9B6B7A' }}>{description}</p>
          )}
          {children && (
            <div className="mt-3 text-left">{children}</div>
          )}
        </div>

        {/* Erro */}
        {errorMessage && (
          <p className="text-xs text-center mb-3 px-2 py-2 rounded-xl"
            style={{ background: '#FEE2E2', color: '#e11d48' }}>
            {errorMessage}
          </p>
        )}

        {/* Botões */}
        <button
          onClick={onConfirm}
          disabled={loading}
          className="w-full py-3 rounded-xl font-bold text-sm mb-3"
          style={{
            background: danger ? '#e11d48' : 'linear-gradient(135deg, #C9A0B0, #7C4D6B)',
            color: 'white',
            border: 'none',
            cursor: loading ? 'not-allowed' : 'pointer',
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (loadingLabel ?? confirmLabel) : confirmLabel}
        </button>
        <button
          onClick={onCancel}
          disabled={loading}
          className="btn-secondary"
          style={{ cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.5 : 1 }}
        >
          {cancelLabel}
        </button>
      </div>
    </div>
  )
}
