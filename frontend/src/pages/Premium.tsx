import { useNavigate } from 'react-router-dom'
import { PayPalButtons } from '@paypal/react-paypal-js'
import { paymentService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const features = [
  'Momentos ilimitados com fotos',
  'Perguntas ilimitadas + exclusivas',
  'Livro digital completo com fotos',
  'Datas especiais (1, 5, 10 anos)',
  'Compartilhar com família',
]

export default function Premium() {
  const { isPremium, refreshCouple } = useAuth()
  const navigate = useNavigate()

  if (isPremium) return (
    <div className="min-h-screen bg-brand-bg flex flex-col items-center justify-center p-8 text-center">
      <div className="text-5xl mb-4">👑</div>
      <h1 className="text-xl font-bold text-white mb-2">Vocês já são premium!</h1>
      <p className="text-sm text-white/50 mb-6">Aproveitem todos os recursos.</p>
      <button className="btn-primary max-w-xs" onClick={() => navigate('/')}>Voltar ao início</button>
    </div>
  )

  return (
    <div className="min-h-screen bg-brand-bg flex flex-col">
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/7">
        <button onClick={() => navigate(-1)} className="text-brand-light bg-brand-hover rounded-lg px-3 py-1.5 text-sm">←</button>
        <h2 className="text-base font-semibold text-white">Plano premium</h2>
      </div>
      <div className="p-4 flex-1 overflow-y-auto">
        <div className="bg-gradient-to-br from-brand-purple/60 to-brand-pink/60 border border-brand-light/20 rounded-2xl p-6 text-center mb-4">
          <div className="text-4xl mb-3">👑</div>
          <div className="text-4xl font-extrabold text-white">R$ 49</div>
          <div className="text-xs text-white/60 mt-2">pagamento único · sem mensalidade</div>
        </div>
        <div className="bg-brand-card border border-white/10 rounded-2xl p-4 mb-4">
          {features.map(f => (
            <div key={f} className="flex items-center gap-3 py-2 border-b border-white/6 last:border-0">
              <span className="text-brand-light text-sm">★</span>
              <span className="text-sm text-purple-100">{f}</span>
            </div>
          ))}
        </div>
        <PayPalButtons
          style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' }}
          createOrder={async () => {
            const res = await paymentService.createOrder()
            return res.data.orderId
          }}
          onApprove={async (data) => {
            await paymentService.capture(data.orderID)
            await refreshCouple()
            navigate('/pagamento/sucesso')
          }}
          onError={() => alert('Erro no pagamento. Tente novamente.')}
        />
        <button onClick={() => navigate(-1)} className="btn-secondary mt-3">Agora não</button>
      </div>
    </div>
  )
}
