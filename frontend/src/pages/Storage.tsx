import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { PayPalButtons } from '@paypal/react-paypal-js'
import { storageService } from '../services/api'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'

export default function Storage() {
  const { isPremium } = useAuth()
  const navigate = useNavigate()
  const [info, setInfo] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [success, setSuccess] = useState(false)

  useEffect(() => {
    storageService.getInfo()
      .then(res => setInfo(res.data))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (!isPremium) return (
    <Layout>
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="text-5xl mb-4">🔒</div>
        <p className="text-base font-bold mb-2" style={{color:'#3D1A2A'}}>Disponível no premium</p>
        <p className="text-sm mb-6" style={{color:'#9B6B7A'}}>Faça upgrade para gerenciar armazenamento</p>
        <button className="btn-primary max-w-xs" onClick={() => navigate('/premium')}>Ver premium</button>
      </div>
    </Layout>
  )

  if (success) return (
    <Layout>
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-xl font-bold mb-2" style={{color:'#3D1A2A'}}>+500 MB adicionados!</h2>
        <p className="text-sm mb-8" style={{color:'#9B6B7A'}}>Seu espaço foi ampliado com sucesso.</p>
        <button className="btn-primary max-w-xs" onClick={() => navigate('/')}>Voltar ao início</button>
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div className="flex items-center gap-3 px-4 py-4 border-b" style={{borderColor:'#E8C4CE'}}>
        <button onClick={() => navigate(-1)} className="px-3 py-1.5 rounded-lg text-sm font-semibold"
          style={{background:'#FADADD', color:'#7C4D6B', border:'1px solid #E8C4CE'}}>←</button>
        <h2 className="text-base font-semibold" style={{color:'#3D1A2A'}}>Armazenamento</h2>
      </div>

      <div className="p-4 pb-8">
        {loading ? (
          <div className="text-center py-12 text-sm" style={{color:'#9B6B7A'}}>Carregando...</div>
        ) : info && (
          <>
            {/* Card de uso atual */}
            <div className="rounded-2xl p-5 mb-4" style={{background:'white', border:'1px solid #E8C4CE'}}>
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-semibold" style={{color:'#3D1A2A'}}>Uso atual</p>
                <p className="text-xs" style={{color:'#9B6B7A'}}>{info.usedMB} MB / {info.totalMB} MB</p>
              </div>

              {/* Barra de progresso */}
              <div className="w-full h-3 rounded-full mb-3" style={{background:'#F5E6EA'}}>
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(info.percentUsed, 100)}%`,
                    background: info.percentUsed > 85
                      ? 'linear-gradient(90deg,#ef4444,#dc2626)'
                      : 'linear-gradient(90deg,#C9A0B0,#7C4D6B)'
                  }} />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Usado', value: `${info.usedMB} MB` },
                  { label: 'Disponível', value: `${Math.max(0, info.totalMB - info.usedMB)} MB` },
                  { label: 'Total', value: `${info.totalMB} MB` },
                ].map(s => (
                  <div key={s.label} className="text-center p-2 rounded-xl" style={{background:'#FFF0F3'}}>
                    <p className="text-sm font-bold" style={{color:'#7C4D6B'}}>{s.value}</p>
                    <p className="text-xs mt-0.5" style={{color:'#9B6B7A'}}>{s.label}</p>
                  </div>
                ))}
              </div>

              {info.percentUsed > 85 && (
                <div className="mt-3 px-3 py-2 rounded-xl text-xs text-center"
                  style={{background:'rgba(251,146,60,0.08)', border:'1px solid rgba(251,146,60,0.25)', color:'#c2410c'}}>
                  ⚠️ Espaço quase esgotado — considere adicionar mais
                </div>
              )}
            </div>

            {/* Compra de espaço extra */}
            <div className="rounded-2xl p-5 mb-4"
              style={{background:'linear-gradient(135deg,#FADADD,#F5E6EA)', border:'1px solid #E8C4CE'}}>
              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl">💾</div>
                <div>
                  <p className="text-base font-bold" style={{color:'#3D1A2A'}}>+500 MB de espaço</p>
                  <p className="text-xs" style={{color:'#9B6B7A'}}>pagamento único · sem mensalidade</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-2xl font-extrabold" style={{color:'#3D1A2A'}}>R$ 19</p>
                </div>
              </div>

              <div className="space-y-2 mb-5">
                {[
                  '~100 fotos de alta qualidade',
                  '~250 mensagens de voz',
                  'Acumulável — compre quantas vezes quiser',
                ].map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <span className="text-sm" style={{color:'#7C4D6B'}}>✓</span>
                    <span className="text-sm" style={{color:'#3D1A2A'}}>{f}</span>
                  </div>
                ))}
              </div>

              <PayPalButtons
                style={{ layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' }}
                createOrder={async () => {
                  const res = await storageService.createOrder()
                  return res.data.orderId
                }}
                onApprove={async (data) => {
                  await storageService.capture(data.orderID)
                  setSuccess(true)
                }}
                onError={() => alert('Erro no pagamento. Tente novamente.')}
              />
            </div>

            {/* Histórico de compras */}
            {info.extraMB > 0 && (
              <div className="rounded-2xl p-4" style={{background:'white', border:'1px solid #E8C4CE'}}>
                <p className="text-xs mb-2" style={{color:'#9B6B7A'}}>Espaço extra adquirido</p>
                <p className="text-sm font-semibold" style={{color:'#7C4D6B'}}>+{info.extraMB} MB no total</p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
