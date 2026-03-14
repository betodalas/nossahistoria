import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { momentsService, questionsService } from '../services/api'
import Layout from '../components/Layout'

export default function Dashboard() {
  const { user, couple, isPremium, logout } = useAuth()
  const navigate = useNavigate()
  const [momentCount, setMomentCount] = useState(0)
  const [todayQuestion, setTodayQuestion] = useState<string | null>(null)

  useEffect(() => {
    momentsService.getAll().then(res => setMomentCount(res.data.length)).catch(() => {})
    questionsService.getCurrent().then(res => setTodayQuestion(res.data?.question?.text || null)).catch(() => {})
  }, [])

  const daysLeft = couple?.wedding_date
    ? Math.ceil((new Date(couple.wedding_date).getTime() - Date.now()) / 86400000)
    : null
  const weddingPassed = daysLeft !== null && daysLeft <= 0

  return (
    <Layout>
      {/* Header */}
      <div className="px-4 pt-5 pb-5 rounded-b-3xl mb-4"
        style={{background:'linear-gradient(135deg, #FADADD, #E8C4CE)'}}>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs mb-0.5" style={{color:'#9B6B7A'}}>Bem-vinda,</p>
            <h1 className="text-lg font-bold" style={{color:'#3D1A2A'}}>
              {couple?.couple_name || user?.name} 💍
            </h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/perfil')}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{background:'rgba(255,255,255,0.6)', color:'#7C4D6B'}}>
              ⚙️ Perfil
            </button>
            <button onClick={logout}
              className="text-xs px-3 py-1.5 rounded-lg"
              style={{background:'rgba(255,255,255,0.4)', color:'#9B6B7A'}}>
              Sair
            </button>
          </div>
        </div>
      </div>

      <div className="px-4">
        {/* Modo dia do casamento */}
        {weddingPassed && (
          <div className="card cursor-pointer mb-3 text-center"
            style={{background:'linear-gradient(135deg,#FADADD,#E8C4CE)', borderColor:'#C9A0B0'}}
            onClick={() => navigate('/dia-do-casamento')}>
            <p className="text-xl mb-1">💍</p>
            <p className="text-base font-bold" style={{color:'#3D1A2A'}}>Abrir modo dia do casamento</p>
            <p className="text-xs mt-1" style={{color:'#9B6B7A'}}>Sua história completa te espera</p>
          </div>
        )}

        {/* Countdown */}
        {daysLeft !== null && !weddingPassed ? (
          <div className="rounded-2xl p-4 text-center mb-4"
            style={{background:'white', border:'1.5px solid #E8C4CE'}}>
            <div className="text-5xl font-extrabold" style={{color:'#7C4D6B'}}>{daysLeft}</div>
            <div className="text-xs mt-1" style={{color:'#9B6B7A'}}>dias para o casamento</div>
            <div className="text-xs mt-1" style={{color:'#C9A0B0'}}>
              {new Date(couple.wedding_date).toLocaleDateString('pt-BR', {day:'numeric',month:'long',year:'numeric'})}
            </div>
          </div>
        ) : daysLeft === null && (
          <div className="rounded-2xl p-4 text-center mb-4 cursor-pointer"
            style={{background:'white', border:'1.5px dashed #E8C4CE'}}
            onClick={() => navigate('/perfil')}>
            <div className="text-3xl mb-2">💍</div>
            <p className="text-sm font-medium" style={{color:'#7C4D6B'}}>Adicionar data do casamento</p>
            <p className="text-xs mt-1" style={{color:'#C9A0B0'}}>Toque para configurar</p>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { n: momentCount, l: 'momentos' },
            { n: isPremium ? '∞' : `${momentCount}/5`, l: isPremium ? 'premium ✨' : 'grátis' },
            { n: '💜', l: 'juntos' }
          ].map(s => (
            <div key={s.l} className="rounded-xl p-3 text-center"
              style={{background:'white', border:'1px solid #E8C4CE'}}>
              <div className="text-xl font-bold" style={{color:'#7C4D6B'}}>{s.n}</div>
              <div className="text-xs mt-1" style={{color:'#C9A0B0'}}>{s.l}</div>
            </div>
          ))}
        </div>

        {/* Convidar parceiro */}
        {!couple && (
          <div className="card cursor-pointer mb-1" onClick={() => navigate('/convidar')}>
            <p className="text-sm font-bold" style={{color:'#3D1A2A'}}>💌 Convidar parceiro(a)</p>
            <p className="text-xs mt-1" style={{color:'#9B6B7A'}}>Chame o(a) parceiro(a) para usar junto</p>
          </div>
        )}

        {/* Pergunta do dia */}
        <div className="card cursor-pointer mb-3" onClick={() => navigate('/perguntas')}>
          <span className="pill-purple text-xs mb-2 inline-block">PERGUNTA DE HOJE</span>
          <p className="text-sm font-medium leading-relaxed" style={{color:'#3D1A2A'}}>
            {todayQuestion || 'Qual foi o momento em que você soube que queria ficar com essa pessoa?'}
          </p>
          <p className="text-xs mt-2" style={{color:'#C9A0B0'}}>Toque para responder</p>
        </div>

        {/* Premium CTA */}
        {!isPremium && (
          <div className="card cursor-pointer"
            style={{background:'linear-gradient(135deg,#FADADD,#E8C4CE)', borderColor:'#C9A0B0'}}
            onClick={() => navigate('/premium')}>
            <p className="text-sm font-bold" style={{color:'#3D1A2A'}}>👑 Upgrade para premium</p>
            <p className="text-xs mt-1" style={{color:'#7C4D6B'}}>Momentos ilimitados + fotos + livro · R$49 único</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
