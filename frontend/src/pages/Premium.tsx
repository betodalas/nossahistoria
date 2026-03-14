import { useNavigate } from 'react-router-dom'
import { PayPalButtons } from '@paypal/react-paypal-js'
import { paymentService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'

const features = [
  'Momentos ilimitados com fotos',
  'Mensagens de voz (até 2 min cada)',
  'Perguntas ilimitadas + exclusivas',
  'Livro digital completo com fotos',
  'Datas especiais (1, 5, 10 anos)',
  'Compartilhar com família',
]

export default function Premium() {
  const { isPremium, refreshCouple } = useAuth()
  const navigate = useNavigate()

  if (isPremium) return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center"
      style={{background:'#FFF0F3'}}>
      <div className="text-5xl mb-4">👑</div>
      <h1 className="text-xl font-bold mb-2" style={{color:'#3D1A2A'}}>Vocês já são premium!</h1>
      <p className="text-sm mb-6" style={{color:'#9B6B7A'}}>Aproveitem todos os recursos.</p>
      <button className="btn-primary max-w-xs" onClick={() => navigate('/')}>Voltar ao início</button>
    </div>
  )

  return (
    <div className="min-h-screen flex flex-col" style={{background:'#FFF0F3'}}>
      <div className="flex items-center gap-3 px-4 py-4" style={{borderBottom:'1px solid #E8C4CE'}}>
        <button onClick={() => navigate(-1)} className="text-sm px-3 py-1.5 rounded-lg"
          style={{background:'#FADADD', color:'#7C4D6B'}}>←</button>
        <h2 className="text-base font-semibold" style={{color:'#3D1A2A'}}>Plano premium</h2>
      </div>

      <div className="p-4 flex-1 overflow-y-auto">
        <div className="rounded-2xl p-6 text-center mb-4"
          style={{background:'linear-gradient(135deg,#FADADD,#E8C4CE)', border:'1.5px solid #C9A0B0'}}>
          <div className="text-4xl mb-3">👑</div>
          <div className="text-4xl font-extrabold" style={{color:'#3D1A2A'}}>R$ 49</div>
          <div className="text-xs mt-2" style={{color:'#9B6B7A'}}>pagamento único · sem mensalidade</div>
        </div>

        <div className="rounded-2xl p-4 mb-4" style={{background:'white', border:'1px solid #E8C4CE'}}>
          {features.map(f => (
            <div key={f} className="flex items-center gap-3 py-2" style={{borderBottom:'1px solid #F5E6EA'}}>
              <span style={{color:'#C9A0B0', fontSize:'14px'}}>♥</span>
              <span className="text-sm" style={{color:'#3D1A2A'}}>{f}</span>
            </div>
          ))}
        </div>

        <PayPalButtons
          style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' }}
          createOrder={async () => { const res = await paymentService.createOrder(); return res.data.orderId }}
          onApprove={async (data) => { await paymentService.capture(data.orderID); await refreshCouple(); navigate('/pagamento/sucesso') }}
          onError={() => alert('Erro no pagamento. Tente novamente.')}
        />
        <button onClick={() => navigate(-1)} className="btn-secondary mt-3">Agora não</button>
      </div>
    </div>
  )
}
