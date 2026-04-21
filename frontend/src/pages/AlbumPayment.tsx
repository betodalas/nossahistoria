import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { PayPalButtons } from '@paypal/react-paypal-js'
import { useAuth } from '../contexts/AuthContext'
import { albumService } from '../services/api'
import Layout from '../components/Layout'

const features = [
  { icon: '💌', title: 'Link exclusivo do casal', desc: 'Um link único e anônimo para compartilhar com convidados' },
  { icon: '📸', title: 'Fotos e mensagens', desc: 'Convidados enviam fotos e mensagens direto pelo celular, sem precisar de conta' },
  { icon: '🔒', title: 'Privacidade total', desc: 'Só vocês dois veem o álbum completo. Convidados não veem o que os outros escreveram' },
  { icon: '💍', title: 'Para sempre', desc: 'O álbum fica disponível para sempre no app de vocês' },
]

export default function AlbumPayment() {
  const { hasAlbum, refreshCouple } = useAuth()
  const navigate = useNavigate()
  const [showPayment, setShowPayment] = useState(false)

  if (hasAlbum) {
    navigate('/album-convidados')
    return null
  }

  return (
    <Layout>
      {/* Header */}
      <div className="rounded-b-3xl px-4 pt-5 pb-5 mb-4"
        style={{ background: 'linear-gradient(135deg,#C9A0B0,#7C4D6B)' }}>
        <h2 className="text-base font-bold text-white text-center">Álbum de convidados</h2>
        <p className="text-xs text-white/70 text-center mt-1">mensagens e fotos da família 💜</p>
      </div>

      <div className="px-4 pb-8">

        {/* Como funciona */}
        <p className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: '#9B6B7A' }}>Como funciona</p>

        <div className="rounded-2xl overflow-hidden mb-5" style={{ border: '1px solid #E8C4CE' }}>
          {features.map((f, i) => (
            <div key={i} className="flex items-start gap-3 p-4"
              style={{ background: i % 2 === 0 ? 'white' : '#FFF8FA', borderBottom: i < features.length - 1 ? '1px solid #F5E6EA' : 'none' }}>
              <span className="text-2xl mt-0.5">{f.icon}</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#3D1A2A' }}>{f.title}</p>
                <p className="text-xs mt-0.5 leading-relaxed" style={{ color: '#9B6B7A' }}>{f.desc}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Passo a passo */}
        <p className="text-xs font-bold mb-3 uppercase tracking-wide" style={{ color: '#9B6B7A' }}>Passo a passo</p>
        <div className="rounded-2xl p-4 mb-5" style={{ background: '#FADADD', border: '1px solid #E8C4CE' }}>
          {[
            'Vocês desbloqueiam o álbum aqui',
            'Recebem um link exclusivo do casal',
            'Compartilham pelo WhatsApp com família e amigos',
            'Cada convidado abre o link, escreve uma mensagem e envia uma foto',
            'Vocês dois veem tudo no app com privacidade total',
          ].map((step, i) => (
            <div key={i} className="flex items-start gap-3 mb-3 last:mb-0">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold text-white flex-shrink-0 mt-0.5"
                style={{ background: 'linear-gradient(135deg,#C9A0B0,#7C4D6B)' }}>{i + 1}</div>
              <p className="text-sm leading-relaxed" style={{ color: '#3D1A2A' }}>{step}</p>
            </div>
          ))}
        </div>

        {/* Preço e pagamento */}
        {!showPayment ? (
          <>
            <div className="rounded-2xl p-5 text-center mb-4"
              style={{ background: 'linear-gradient(135deg,#FADADD,#E8C4CE)', border: '1.5px solid #C9A0B0' }}>
              <div className="text-3xl font-extrabold" style={{ color: '#3D1A2A' }}>R$ 29,90</div>
              <div className="text-xs mt-1" style={{ color: '#9B6B7A' }}>pagamento único · sem mensalidade</div>
            </div>
            <button onClick={() => setShowPayment(true)} className="btn-primary">
              💌 Quero esse recurso
            </button>
          </>
        ) : (
          <div className="rounded-2xl p-4" style={{ background: 'white', border: '1px solid #E8C4CE' }}>
            <p className="text-sm font-semibold text-center mb-3" style={{ color: '#3D1A2A' }}>
              Álbum de convidados · R$ 29,90
            </p>
            <PayPalButtons
              style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' }}
              createOrder={async () => {
                const res = await albumService.createOrder()
                return res.data.orderId
              }}
              onApprove={async (data) => {
                await albumService.capture(data.orderID)
                await refreshCouple()
                navigate('/album-convidados')
              }}
              onError={() => alert('Erro no pagamento. Tente novamente.')}
            />
            <button onClick={() => setShowPayment(false)}
              className="btn-secondary mt-2">
              Voltar
            </button>
          </div>
        )}
      </div>
    </Layout>
  )
}
