import { useState, useEffect } from 'react'
import { momentsService, lettersService } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function WeddingDay() {
  const { couple } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [revealedLetter, setRevealedLetter] = useState(false)
  const [currentMoment, setCurrentMoment] = useState(0)

  const [moments, setMoments] = useState<any[]>([])
  const [myLetter, setMyLetter] = useState<string | null>(null)

  useEffect(() => {
    momentsService.getAll().then(res => setMoments(res.data)).catch(() => {})
    lettersService.getAll().then(res => {
      const w = res.data.find((l: any) => l.capsule_key === 'wedding')
      if (w) setMyLetter(w.text)
    }).catch(() => {})
  }, [])
  const coupleName = couple?.couple_name || 'Vocês dois'
  const weddingDate = couple?.wedding_date
    ? new Date(couple.wedding_date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
    : 'hoje'

  return (
    <div className="min-h-screen flex flex-col" style={{background:'linear-gradient(160deg,#0f0a1a,#1a0535,#2d1060)'}}>

      {/* Step 0 — Intro */}
      {step === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="text-7xl mb-6 animate-pulse">💍</div>
          <h1 className="text-3xl font-extrabold text-white mb-2">{coupleName}</h1>
          <p className="text-base text-white/60 mb-1">Este é o grande dia</p>
          <p className="text-sm text-white/70 mb-10">{weddingDate}</p>
          <div className="w-full max-w-xs">
            <button className="btn-primary mb-3 py-4 text-base" onClick={() => setStep(1)}>
              💌 Abrir nossa história
            </button>
            <button className="btn-secondary" onClick={() => navigate('/')}>Voltar ao início</button>
          </div>
        </div>
      )}

      {/* Step 1 — Momentos */}
      {step === 1 && (
        <div className="flex-1 flex flex-col">
          <div className="px-4 pt-8 pb-4 text-center">
            <p className="text-xs text-white/70 uppercase tracking-widest mb-1">Nossa jornada até aqui</p>
            <h2 className="text-xl font-bold text-white">{moments.length > 0 ? `${moments.length} momentos especiais` : 'Nossa história'}</h2>
          </div>
          {moments.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="text-5xl mb-4">📖</div>
              <p className="text-sm text-white/50">Nenhum momento registrado ainda</p>
              <p className="text-xs text-white/60 mt-2">Mas a história de vocês está apenas começando 💜</p>
              <button className="btn-primary mt-8 max-w-xs w-full" onClick={() => setStep(2)}>Ver cartas 💌</button>
            </div>
          ) : (
            <div className="flex-1 px-4">
              <div className="rounded-3xl p-6 border border-white/15 text-center"
                style={{background:'rgba(255,255,255,0.07)'}}>
                <p className="text-xs text-white/60 mb-2">
                  {new Date(moments[currentMoment].moment_date).toLocaleDateString('pt-BR', {day:'numeric',month:'long',year:'numeric'})}
                </p>
                <h3 className="text-lg font-bold text-white mb-3">{moments[currentMoment].title}</h3>
                {moments[currentMoment].photo_url && (
                  <img src={moments[currentMoment].photo_url} className="w-full rounded-2xl mb-3 object-contain mx-auto" style={{maxHeight:'220px'}} />
                )}
                {moments[currentMoment].description && (
                  <p className="text-sm text-white/60 leading-relaxed mb-3">{moments[currentMoment].description}</p>
                )}
                {moments[currentMoment].music_name && (
                  <p className="text-xs text-violet-300">♪ {moments[currentMoment].music_name}</p>
                )}
              </div>
              <div className="flex items-center justify-between mt-4 mb-4">
                <button onClick={() => setCurrentMoment(i => Math.max(0,i-1))} disabled={currentMoment===0}
                  className="px-4 py-2 rounded-xl text-sm font-semibold disabled:opacity-20"
                  style={{background:'rgba(255,255,255,0.1)',color:'white'}}>← Anterior</button>
                <p className="text-xs text-white/70">{currentMoment+1} de {moments.length}</p>
                {currentMoment < moments.length-1 ? (
                  <button onClick={() => setCurrentMoment(i => i+1)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold"
                    style={{background:'rgba(255,255,255,0.1)',color:'white'}}>Próximo →</button>
                ) : (
                  <button onClick={() => setStep(2)}
                    className="px-4 py-2 rounded-xl text-sm font-semibold"
                    style={{background:'linear-gradient(135deg,#7c3aed,#be185d)',color:'white'}}>Cartas 💌</button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Step 2 — Cartas */}
      {step === 2 && (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="text-5xl mb-4">💌</div>
          <h2 className="text-xl font-bold text-white mb-1 text-center">Cartas para hoje</h2>
          <p className="text-xs text-white/70 mb-6 text-center">Escritas antes deste dia</p>
          {myLetter ? (
            <div className="w-full rounded-2xl p-5 mb-4 border border-violet-500/30" style={{background:'rgba(124,58,237,0.2)'}}>
              <p className="text-xs font-bold text-violet-300 mb-3">💌 Sua carta para hoje</p>
              <p className="text-sm text-purple-100 leading-relaxed">{myLetter}</p>
            </div>
          ) : (
            <div className="w-full rounded-2xl p-5 mb-4 border border-white/10 text-center" style={{background:'rgba(255,255,255,0.05)'}}>
              <p className="text-sm text-white/60">Você não escreveu uma carta para hoje</p>
            </div>
          )}
          <div className="w-full rounded-2xl p-5 mb-6 border border-pink-500/30" style={{background:'rgba(190,24,93,0.2)'}}>
            <p className="text-xs font-bold text-pink-300 mb-3">💌 Carta do(a) parceiro(a)</p>
            {!revealedLetter ? (
              <div className="text-center cursor-pointer py-2" onClick={() => setRevealedLetter(true)}>
                <p className="text-sm text-purple-100 leading-relaxed" style={{filter:'blur(6px)'}}>
                  "Meu amor, hoje é o dia mais especial da nossa vida..."
                </p>
                <p className="text-xs text-white/70 mt-3">👆 toque para revelar</p>
              </div>
            ) : (
              <p className="text-sm text-purple-100 leading-relaxed">
                "Meu amor, quando você ler isso estaremos prestes a começar nossa vida juntos. Obrigado por cada momento, cada risada, cada abraço. Te amo para sempre. 💜"
              </p>
            )}
          </div>
          <button className="btn-primary w-full" onClick={() => setStep(3)}>Continuar ✨</button>
        </div>
      )}

      {/* Step 3 — Celebração */}
      {step === 3 && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="text-6xl mb-6">🎊</div>
          <h1 className="text-2xl font-extrabold text-white mb-3">Feliz casamento!</h1>
          <p className="text-sm text-white/60 leading-relaxed max-w-xs mb-2">A história de vocês está apenas começando.</p>
          <p className="text-sm text-white/60 leading-relaxed max-w-xs mb-10">Continue registrando cada momento especial 💜</p>
          <button className="btn-primary max-w-xs w-full mb-3" onClick={() => navigate('/novo-momento')}>
            📸 Registrar primeiro momento de casados
          </button>
          <button className="btn-secondary max-w-xs w-full" onClick={() => navigate('/')}>Ir para o início</button>
        </div>
      )}

    </div>
  )
}
