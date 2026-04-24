import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { momentsService, questionsService } from '../services/api'
import { parseDate, daysUntil } from '../utils/dateUtils'
import { FREE_MOMENTS_LIMIT } from '../constants'
import Layout from '../components/Layout'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'

export default function Dashboard() {
  const { user, couple, isPremium, logout } = useAuth()
  const navigate = useNavigate()
  const [momentCount, setMomentCount] = useState(0)
  const [answerCount, setAnswerCount] = useState(0)
  const [firstMoment, setFirstMoment] = useState<any>(null)
  const [todayQuestion, setTodayQuestion] = useState<string | null>(null)

  useEffect(() => {
    momentsService.getAll().then(res => {
      const data = res.data
      setMomentCount(data.length)
      if (data.length > 0) {
        const sorted = [...data].sort((a: any, b: any) =>
          new Date(a.moment_date).getTime() - new Date(b.moment_date).getTime()
        )
        setFirstMoment(sorted[0])
      }
    }).catch(() => {})
    questionsService.getAnswerCount().then(res => setAnswerCount(res.data.count || 0)).catch(() => {})
    questionsService.getCurrent().then(res => {
      if (res.data?.done) return
      setTodayQuestion(res.data?.question?.text || null)
    }).catch(() => {})
  }, [])

  const weddingDate = couple?.wedding_date ? parseDate(couple.wedding_date) : null
  const daysLeft = weddingDate ? daysUntil(weddingDate) : null
  const weddingPassed = daysLeft !== null && daysLeft <= 0

  const daysWithMoments = firstMoment
    ? Math.floor((Date.now() - new Date(firstMoment.moment_date).getTime()) / 86400000)
    : null

  const daysSinceWedding = weddingPassed && weddingDate
    ? Math.floor((Date.now() - weddingDate.getTime()) / 86400000)
    : null

  const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

  return (
    <Layout>
      <div className="px-4 pt-5 pb-5 rounded-b-3xl mb-4"
        style={{ background: 'linear-gradient(135deg, #FADADD, #E8C4CE)' }}>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs mb-0.5" style={{ color: '#9B6B7A' }}>Bem-vindos,</p>
            <h1 className="text-lg font-bold" style={{ color: '#3D1A2A' }}>
              {couple?.couple_name || user?.name} 💍
            </h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/perfil')}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.6)', color: '#7C4D6B' }}>
              ⚙️ Perfil
            </button>
            <button onClick={logout}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{ background: 'rgba(255,255,255,0.75)', color: '#9B6B7A' }}>
              Sair
            </button>
            {Capacitor.isNativePlatform() && (
              <button onClick={async () => {
                const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
                alert('Iniciando registro FCM...')
                await PushNotifications.register()
                PushNotifications.addListener('registration', async (token) => {
                  alert('Token: ' + token.value.slice(0, 40))
                  const jwt = localStorage.getItem('token')
                  const res = await fetch(`${BACKEND_URL}/notifications/token`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
                    body: JSON.stringify({ token: token.value, platform: 'android' }),
                  })
                  const body = await res.json()
                  alert('Backend: ' + JSON.stringify(body))
                })
                PushNotifications.addListener('registrationError' as any, (err: any) => {
                  alert('Erro FCM: ' + JSON.stringify(err))
                })
              }}
                className="text-xs px-3 py-1.5 rounded-lg"
                style={{ background: 'rgba(255,100,100,0.75)', color: 'white' }}>
                🔔 Test Push
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="px-4">

        {weddingDate && !weddingPassed && daysLeft !== null && (
          <div className="rounded-2xl p-4 text-center mb-4"
            style={{ background: 'white', border: '1.5px solid #E8C4CE' }}>
            <div className="text-5xl font-extrabold" style={{ color: '#7C4D6B' }}>{daysLeft}</div>
            <div className="text-xs mt-1" style={{ color: '#9B6B7A' }}>dias para o casamento</div>
            <div className="text-xs mt-1" style={{ color: '#9B6B7A' }}>{fmt(weddingDate)}</div>
          </div>
        )}

        {weddingPassed && daysSinceWedding !== null && (
          <div className="rounded-2xl p-4 text-center mb-4"
            style={{ background: 'linear-gradient(135deg,#FADADD,#E8C4CE)', border: '1.5px solid #C9A0B0' }}>
            <div className="text-4xl font-extrabold" style={{ color: '#3D1A2A' }}>{daysSinceWedding}</div>
            <div className="text-xs mt-1 font-semibold" style={{ color: '#7C4D6B' }}>dias de casados 💍</div>
            <div className="text-xs mt-1" style={{ color: '#9B6B7A' }}>desde {fmt(weddingDate!)}</div>
          </div>
        )}

        {!weddingDate && (
          <div className="rounded-2xl p-4 text-center mb-4 cursor-pointer"
            style={{ background: 'white', border: '1.5px dashed #E8C4CE' }}
            onClick={() => navigate('/perfil')}>
            <div className="text-3xl mb-2">💍</div>
            <p className="text-sm font-medium" style={{ color: '#7C4D6B' }}>Adicionar data do casamento</p>
            <p className="text-xs mt-1" style={{ color: '#9B6B7A' }}>Toque para configurar</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="rounded-xl p-3 text-center"
            style={{ background: 'white', border: '1px solid #E8C4CE' }}>
            <div className="text-2xl font-bold" style={{ color: '#7C4D6B' }}>{momentCount}</div>
            <div className="text-xs mt-1" style={{ color: '#9B6B7A' }}>momentos registrados</div>
          </div>
          <div className="rounded-xl p-3 text-center"
            style={{ background: 'white', border: '1px solid #E8C4CE' }}>
            <div className="text-2xl font-bold" style={{ color: '#7C4D6B' }}>{answerCount}</div>
            <div className="text-xs mt-1" style={{ color: '#9B6B7A' }}>perguntas respondidas</div>
          </div>
          {daysWithMoments !== null && (
            <div className="rounded-xl p-3 text-center"
              style={{ background: 'white', border: '1px solid #E8C4CE' }}>
              <div className="text-2xl font-bold" style={{ color: '#7C4D6B' }}>{daysWithMoments}</div>
              <div className="text-xs mt-1" style={{ color: '#9B6B7A' }}>dias com memórias</div>
            </div>
          )}
          <div className="rounded-xl p-3 text-center"
            style={{ background: 'white', border: '1px solid #E8C4CE' }}>
            <div className="text-2xl font-bold" style={{ color: '#7C4D6B' }}>
              {isPremium ? '∞' : `${momentCount}/${FREE_MOMENTS_LIMIT}`}
            </div>
            <div className="text-xs mt-1" style={{ color: '#9B6B7A' }}>
              {isPremium ? 'premium ✨' : 'plano grátis'}
            </div>
          </div>
        </div>

        {firstMoment && (
          <div className="rounded-2xl p-3 mb-4 cursor-pointer"
            style={{ background: 'white', border: '1px solid #E8C4CE' }}
            onClick={() => navigate('/linha-do-tempo')}>
            <p className="text-xs font-bold mb-1" style={{ color: '#9B6B7A' }}>✨ Primeiro momento registrado</p>
            <p className="text-sm font-semibold" style={{ color: '#3D1A2A' }}>{firstMoment.title}</p>
            <p className="text-xs mt-0.5" style={{ color: '#9B6B7A' }}>
              {new Date(firstMoment.moment_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
            </p>
          </div>
        )}

        {!couple && (
          <div className="card cursor-pointer mb-3" onClick={() => navigate('/convidar')}>
            <p className="text-sm font-bold" style={{ color: '#3D1A2A' }}>💌 Convidar parceiro(a)</p>
            <p className="text-xs mt-1" style={{ color: '#9B6B7A' }}>Chame o(a) parceiro(a) para usar junto</p>
          </div>
        )}

        {todayQuestion && (
          <div className="card cursor-pointer mb-3" onClick={() => navigate('/perguntas')}>
            <span className="pill-purple text-xs mb-2 inline-block">PERGUNTA DE HOJE</span>
            <p className="text-sm font-medium leading-relaxed" style={{ color: '#3D1A2A' }}>
              {todayQuestion}
            </p>
            <p className="text-xs mt-2" style={{ color: '#9B6B7A' }}>Toque para responder</p>
          </div>
        )}

        {!isPremium && (
          <div className="card cursor-pointer"
            style={{ background: 'linear-gradient(135deg,#FADADD,#E8C4CE)', borderColor: '#C9A0B0' }}
            onClick={() => navigate('/premium')}>
            <p className="text-sm font-bold" style={{ color: '#3D1A2A' }}>👑 Upgrade para premium</p>
            <p className="text-xs mt-1" style={{ color: '#7C4D6B' }}>Momentos ilimitados + fotos + livro · R$49 único</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
