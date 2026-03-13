import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'

export default function Dashboard() {
  const { user, couple, isPremium, logout } = useAuth()
  const navigate = useNavigate()

  const daysLeft = couple?.wedding_date
    ? Math.ceil((new Date(couple.wedding_date).getTime() - Date.now()) / 86400000)
    : null
  const weddingPassed = daysLeft !== null && daysLeft <= 0
  const moments = JSON.parse(localStorage.getItem('moments') || '[]')
  const answers = JSON.parse(localStorage.getItem('answers') || '[]')

  return (
    <Layout>
      <div className="px-4 pt-5 pb-5 rounded-b-3xl mb-4" style={{background:'linear-gradient(135deg,#2d1060,#6b21a8)'}}>
        <div className="flex justify-between items-start">
          <div>
            <p className="text-xs text-white/60 mb-0.5">Bem-vinda,</p>
            <h1 className="text-lg font-bold text-white">{couple?.couple_name || user?.name} 💍</h1>
          </div>
          <div className="flex gap-2">
            <button onClick={() => navigate('/perfil')} className="text-xs text-white/60 px-3 py-1.5 rounded-lg" style={{background:'rgba(255,255,255,0.15)'}}>⚙️ Perfil</button>
            <button onClick={logout} className="text-xs text-white/60 px-3 py-1.5 rounded-lg" style={{background:'rgba(255,255,255,0.1)'}}>Sair</button>
          </div>
        </div>
      </div>

      <div className="px-4">
        {weddingPassed && (
          <div className="card cursor-pointer mb-3 text-center"
            style={{background:'linear-gradient(135deg,rgba(124,58,237,0.4),rgba(190,24,93,0.4))',borderColor:'rgba(167,139,250,0.5)'}}
            onClick={() => navigate('/dia-do-casamento')}>
            <p className="text-xl mb-1">💍</p>
            <p className="text-base font-bold text-white">Abrir modo dia do casamento</p>
            <p className="text-xs text-white/60 mt-1">Sua história completa te espera</p>
          </div>
        )}

        {daysLeft !== null && !weddingPassed ? (
          <div className="border border-violet-400/20 rounded-2xl p-4 text-center mb-4" style={{background:'rgba(107,33,168,0.3)'}}>
            <div className="text-5xl font-extrabold text-purple-200">{daysLeft}</div>
            <div className="text-xs text-purple-300/70 mt-1">dias para o casamento</div>
            <div className="text-xs text-purple-300/40 mt-1">
              {new Date(couple.wedding_date).toLocaleDateString('pt-BR', {day:'numeric',month:'long',year:'numeric'})}
            </div>
          </div>
        ) : daysLeft === null && (
          <div className="border border-dashed border-violet-500/40 rounded-2xl p-4 text-center mb-4 cursor-pointer"
            style={{background:'rgba(107,33,168,0.15)'}} onClick={() => navigate('/perfil')}>
            <div className="text-3xl mb-2">💍</div>
            <p className="text-sm text-violet-300 font-medium">Adicionar data do casamento</p>
            <p className="text-xs text-white/30 mt-1">Toque para configurar</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-2 mb-4">
          {[
            { n: moments.length, l: 'momentos' },
            { n: answers.length, l: 'perguntas' },
            { n: isPremium ? '∞' : `${moments.length}/5`, l: isPremium ? 'premium ✨' : 'grátis' }
          ].map(s => (
            <div key={s.l} className="border border-white/8 rounded-xl p-3 text-center" style={{background:'#1a1030'}}>
              <div className="text-xl font-bold text-violet-300">{s.n}</div>
              <div className="text-xs text-white/40 mt-1">{s.l}</div>
            </div>
          ))}
        </div>

        {!couple?.partner_email && (
          <div className="card cursor-pointer mb-1" style={{borderColor:'rgba(167,139,250,0.3)'}} onClick={() => navigate('/convidar')}>
            <p className="text-sm font-bold text-purple-100">💌 Convidar parceiro(a)</p>
            <p className="text-xs text-white/45 mt-1">Chame o(a) {couple?.partner_name || 'parceiro(a)'} para usar junto</p>
          </div>
        )}

        <div className="card" onClick={() => navigate('/perguntas')}>
          <span className="pill-purple text-xs mb-2 inline-block">PERGUNTA DE HOJE</span>
          <p className="text-sm text-purple-100 font-medium leading-relaxed">
            Qual foi o momento em que você soube que queria ficar com essa pessoa?
          </p>
          <p className="text-xs text-white/40 mt-2">Toque para responder</p>
        </div>

        {!isPremium && (
          <div className="card cursor-pointer"
            style={{background:'linear-gradient(135deg,rgba(124,58,237,0.25),rgba(190,24,93,0.25))',borderColor:'rgba(167,139,250,0.3)'}}
            onClick={() => navigate('/premium')}>
            <p className="text-sm font-bold text-purple-100">👑 Upgrade para premium</p>
            <p className="text-xs text-white/45 mt-1">Momentos ilimitados + fotos + livro · R$49 único</p>
          </div>
        )}
      </div>
    </Layout>
  )
}
