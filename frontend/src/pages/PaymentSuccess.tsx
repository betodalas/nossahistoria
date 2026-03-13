import { useNavigate } from 'react-router-dom'

export default function PaymentSuccess() {
  const navigate = useNavigate()
  return (
    <div className="min-h-screen bg-gradient-to-b from-brand-bg to-brand-deep flex flex-col items-center justify-center p-8 text-center">
      <div className="text-6xl mb-5">🎉</div>
      <h1 className="text-2xl font-bold text-purple-100 mb-2">Vocês são premium!</h1>
      <p className="text-sm text-white/50 leading-relaxed max-w-xs mb-8">
        Agora vocês podem registrar toda a história sem limites.
      </p>
      <button className="btn-primary max-w-xs" onClick={() => navigate('/')}>
        Começar a usar
      </button>
    </div>
  )
}
