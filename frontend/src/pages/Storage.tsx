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
        <p className="text-base font-bold text-white mb-2">Disponível no premium</p>
        <p className="text-sm text-white/40 mb-6">Faça upgrade para gerenciar armazenamento</p>
        <button className="btn-primary max-w-xs" onClick={() => navigate('/premium')}>Ver premium</button>
      </div>
    </Layout>
  )

  if (success) return (
    <Layout>
      <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
        <div className="text-6xl mb-4">🎉</div>
        <h2 className="text-xl font-bold text-white mb-2">+500 MB adicionados!</h2>
        <p className="text-sm text-white/50 mb-8">Seu espaço foi ampliado com sucesso.</p>
        <button className="btn-primary max-w-xs" onClick={() => navigate('/')}>Voltar ao início</button>
      </div>
    </Layout>
  )

  return (
    <Layout>
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
        <button onClick={() => navigate(-1)} className="text-violet-300 px-3 py-1.5 rounded-lg text-sm"
          style={{background:'#1e1035'}}>←</button>
        <h2 className="text-base font-semibold text-white">Armazenamento</h2>
      </div>

      <div className="p-4 pb-8">
        {loading ? (
          <div className="text-center py-12 text-white/30 text-sm">Carregando...</div>
        ) : info && (
          <>
            {/* Card de uso atual */}
            <div className="rounded-2xl p-5 mb-4 border border-white/10" style={{background:'#1a1030'}}>
              <div className="flex justify-between items-center mb-3">
                <p className="text-sm font-semibold text-white">Uso atual</p>
                <p className="text-xs text-white/40">{info.usedMB} MB / {info.totalMB} MB</p>
              </div>

              {/* Barra de progresso */}
              <div className="w-full h-3 rounded-full mb-3" style={{background:'rgba(255,255,255,0.08)'}}>
                <div className="h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(info.percentUsed, 100)}%`,
                    background: info.percentUsed > 85
                      ? 'linear-gradient(90deg,#ef4444,#dc2626)'
                      : 'linear-gradient(90deg,#7c3aed,#be185d)'
                  }} />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: 'Usado', value: `${info.usedMB} MB` },
                  { label: 'Disponível', value: `${Math.max(0, info.totalMB - info.usedMB)} MB` },
                  { label: 'Total', value: `${info.totalMB} MB` },
                ].map(s => (
                  <div key={s.label} className="text-center p-2 rounded-xl" style={{background:'rgba(255,255,255,0.05)'}}>
                    <p className="text-sm font-bold text-violet-300">{s.value}</p>
                    <p className="text-xs text-white/30 mt-0.5">{s.label}</p>
                  </div>
                ))}
              </div>

              {info.percentUsed > 85 && (
                <div className="mt-3 px-3 py-2 rounded-xl text-xs text-center text-orange-300"
                  style={{background:'rgba(251,146,60,0.1)', border:'1px solid rgba(251,146,60,0.2)'}}>
                  ⚠️ Espaço quase esgotado — considere adicionar mais
                </div>
              )}
            </div>

            {/* Compra de espaço extra */}
            <div className="rounded-2xl p-5 border mb-4"
              style={{background:'linear-gradient(135deg,rgba(124,58,237,0.2),rgba(190,24,93,0.2))', borderColor:'rgba(167,139,250,0.3)'}}>
              <div className="flex items-center gap-3 mb-4">
                <div className="text-3xl">💾</div>
                <div>
                  <p className="text-base font-bold text-white">+500 MB de espaço</p>
                  <p className="text-xs text-white/50">pagamento único · sem mensalidade</p>
                </div>
                <div className="ml-auto text-right">
                  <p className="text-2xl font-extrabold text-white">R$ 19</p>
                </div>
              </div>

              <div className="space-y-2 mb-5">
                {[
                  '~100 fotos de alta qualidade',
                  '~250 mensagens de voz',
                  'Acumulável — compre quantas vezes quiser',
                ].map(f => (
                  <div key={f} className="flex items-center gap-2">
                    <span className="text-violet-400 text-sm">✓</span>
                    <span className="text-sm text-purple-100">{f}</span>
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
              <div className="rounded-2xl p-4 border border-white/8" style={{background:'#1a1030'}}>
                <p className="text-xs text-white/40 mb-2">Espaço extra adquirido</p>
                <p className="text-sm text-violet-300 font-semibold">+{info.extraMB} MB no total</p>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
