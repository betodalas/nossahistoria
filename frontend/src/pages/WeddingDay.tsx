import { useState, useEffect, useRef } from 'react'
import { momentsService, lettersService } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import MusicPlayer from '../components/MusicPlayer'

export default function WeddingDay() {
  const { user, couple } = useAuth()
  const navigate = useNavigate()
  const [step, setStep] = useState(0)
  const [revealedLetter, setRevealedLetter] = useState(false)
  const [currentMoment, setCurrentMoment] = useState(0)
  const [moments, setMoments] = useState<any[]>([])
  const [myLetter, setMyLetter] = useState<string | null>(null)
  const [partnerLetter, setPartnerLetter] = useState<string | null>(null)
  const [partnerName, setPartnerName] = useState<string>('parceiro(a)')
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const thumbsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    momentsService.getAll().then(res => setMoments(res.data)).catch(() => {})
    lettersService.getAll().then(res => {
      const letters = res.data.filter((l: any) => l.capsule_key === 'wedding')
      const mine = letters.find((l: any) => l.user_id === user?.id)
      const partner = letters.find((l: any) => l.user_id !== user?.id)
      if (mine) setMyLetter(mine.text)
      if (partner) setPartnerLetter(partner.text)
    }).catch(() => {})
    if (couple?.partner_name) setPartnerName(couple.partner_name)
  }, [])

  const coupleName = couple?.couple_name || 'Vocês dois'
  const weddingDate = couple?.wedding_date
    ? (() => {
        const [y, m, d] = couple.wedding_date.split('T')[0].split('-').map(Number)
        return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
      })()
    : null

  const goToMoment = (index: number) => {
    if (index === currentMoment || isTransitioning) return
    setIsTransitioning(true)
    setTimeout(() => {
      setCurrentMoment(index)
      setIsTransitioning(false)
    }, 250)

    setTimeout(() => {
      const container = thumbsRef.current
      if (!container) return
      const thumb = container.children[index] as HTMLElement
      if (thumb) {
        thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
      }
    }, 50)
  }

  const moment = moments[currentMoment]

  const formatDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('T')[0].split('-').map(Number)
      return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch {
      return dateStr
    }
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: 'linear-gradient(160deg,#0f0a1a,#1a0535,#2d1060)' }}>

      {/* Lightbox de foto */}
      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.95)' }}
          onClick={() => setLightbox(null)}
        >
          <img src={lightbox} className="max-w-full max-h-full rounded-2xl object-contain" />
          <button
            className="absolute top-5 right-5 text-white text-2xl w-10 h-10 rounded-full flex items-center justify-center"
            style={{ background: 'rgba(255,255,255,0.15)' }}
            onClick={() => setLightbox(null)}
          >x</button>
        </div>
      )}

      {/* Step 0 — Intro */}
      {step === 0 && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="text-7xl mb-6 animate-pulse">💍</div>
          <h1 className="text-3xl font-extrabold text-white mb-2">{coupleName}</h1>
          <p className="text-base text-white/60 mb-1">Este é o grande dia</p>
          <p className="text-sm text-white/70 mb-10">{weddingDate}</p>
          <div className="w-full max-w-xs">
            <button className="btn-primary mb-3 py-4 text-base" onClick={() => setStep(1)}>
              Abrir nossa historia
            </button>
            <button className="btn-secondary" onClick={() => navigate('/')}>Voltar ao inicio</button>
          </div>
        </div>
      )}

      {/* Step 1 — Galeria imersiva */}
      {step === 1 && (
        <div className="flex-1 flex flex-col">

          <div className="px-4 pt-8 pb-3 text-center">
            <p className="text-xs text-white/50 uppercase tracking-widest mb-1">Nossa jornada ate aqui</p>
            <h2 className="text-xl font-bold text-white">
              {moments.length > 0 ? `${moments.length} momentos especiais` : 'Nossa historia'}
            </h2>
          </div>

          {moments.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
              <div className="text-5xl mb-4">📖</div>
              <p className="text-sm text-white/50">Nenhum momento registrado ainda</p>
              <p className="text-xs text-white/40 mt-2">Mas a historia de voces esta apenas comecando</p>
              <button className="btn-primary mt-8 max-w-xs w-full" onClick={() => setStep(2)}>Ver cartas</button>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">

              {/* Foto principal */}
              <div
                className="relative mx-4 rounded-3xl overflow-hidden"
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  minHeight: '240px',
                  opacity: isTransitioning ? 0 : 1,
                  transition: 'opacity 0.25s ease',
                }}
              >
                {moment?.photo_url ? (
                  <img
                    src={moment.photo_url}
                    className="w-full object-cover cursor-pointer"
                    style={{ maxHeight: '280px', minHeight: '200px' }}
                    onClick={() => setLightbox(moment.photo_url)}
                  />
                ) : (
                  <div className="flex items-center justify-center" style={{ minHeight: '200px' }}>
                    <span style={{ fontSize: '56px' }}>📸</span>
                  </div>
                )}

                <div
                  className="absolute top-3 right-3 text-xs font-semibold px-2 py-1 rounded-lg"
                  style={{ background: 'rgba(0,0,0,0.55)', color: 'rgba(255,255,255,0.8)' }}
                >
                  {currentMoment + 1} / {moments.length}
                </div>

                {moment?.photo_url && (
                  <div
                    className="absolute bottom-3 right-3 text-xs px-2 py-1 rounded-lg"
                    style={{ background: 'rgba(0,0,0,0.45)', color: 'rgba(255,255,255,0.55)' }}
                  >
                    toque para ampliar
                  </div>
                )}
              </div>

              {/* Info do momento */}
              <div
                className="px-4 pt-3 pb-2"
                style={{
                  opacity: isTransitioning ? 0 : 1,
                  transition: 'opacity 0.25s ease',
                }}
              >
                <p className="text-xs text-white/40 mb-1">
                  {moment?.moment_date ? formatDate(moment.moment_date) : ''}
                </p>
                <h3 className="text-lg font-bold text-white leading-tight mb-1">
                  {moment?.title}
                </h3>
                {moment?.description && (
                  <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>
                    {moment.description}
                  </p>
                )}

                {/* MusicPlayer integrado automaticamente */}
                {moment?.music_name && (
                  <MusicPlayer musicName={moment.music_name} />
                )}
              </div>

              {/* Miniaturas */}
              <div className="px-4 mt-3">
                <div
                  ref={thumbsRef}
                  className="flex gap-2 overflow-x-auto pb-2"
                  style={{ scrollbarWidth: 'none' }}
                >
                  {moments.map((m, i) => (
                    <button
                      key={i}
                      onClick={() => goToMoment(i)}
                      className="flex-shrink-0 rounded-xl overflow-hidden"
                      style={{
                        width: '56px',
                        height: '56px',
                        border: i === currentMoment
                          ? '2px solid #7c3aed'
                          : '2px solid rgba(255,255,255,0.1)',
                        background: 'rgba(255,255,255,0.06)',
                        opacity: i === currentMoment ? 1 : 0.55,
                        transform: i === currentMoment ? 'scale(1.08)' : 'scale(1)',
                        transition: 'all 0.2s ease',
                      }}
                    >
                      {m.photo_url ? (
                        <img src={m.photo_url} className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center" style={{ fontSize: '20px' }}>📸</div>
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Navegação */}
              <div className="flex items-center justify-between px-4 mt-3 mb-4">
                <button
                  onClick={() => goToMoment(currentMoment - 1)}
                  disabled={currentMoment === 0}
                  className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-20"
                  style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
                >
                  Anterior
                </button>

                {currentMoment < moments.length - 1 ? (
                  <button
                    onClick={() => goToMoment(currentMoment + 1)}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
                  >
                    Proximo
                  </button>
                ) : (
                  <button
                    onClick={() => setStep(2)}
                    className="px-5 py-2.5 rounded-xl text-sm font-semibold"
                    style={{ background: 'linear-gradient(135deg,#7c3aed,#be185d)', color: 'white' }}
                  >
                    Cartas
                  </button>
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
            <div className="w-full rounded-2xl p-5 mb-4 border border-violet-500/30" style={{ background: 'rgba(124,58,237,0.2)' }}>
              <p className="text-xs font-bold text-violet-300 mb-3">Sua carta para hoje</p>
              <p className="text-sm text-purple-100 leading-relaxed">{myLetter}</p>
            </div>
          ) : (
            <div className="w-full rounded-2xl p-5 mb-4 border border-white/10 text-center" style={{ background: 'rgba(255,255,255,0.05)' }}>
              <p className="text-sm text-white/60">Voce nao escreveu uma carta para hoje</p>
            </div>
          )}
          <div className="w-full rounded-2xl p-5 mb-6 border border-pink-500/30" style={{ background: 'rgba(190,24,93,0.2)' }}>
            <p className="text-xs font-bold text-pink-300 mb-3">Carta de {partnerName}</p>
            {!partnerLetter ? (
              <div className="text-center py-2">
                <p className="text-sm text-white/50">{partnerName} nao escreveu uma carta para hoje</p>
              </div>
            ) : !revealedLetter ? (
              <div className="text-center cursor-pointer py-2" onClick={() => setRevealedLetter(true)}>
                <p className="text-sm text-purple-100 leading-relaxed" style={{ filter: 'blur(6px)' }}>
                  {partnerLetter}
                </p>
                <p className="text-xs text-white/70 mt-3">toque para revelar</p>
              </div>
            ) : (
              <p className="text-sm text-purple-100 leading-relaxed">{partnerLetter}</p>
            )}
          </div>
          <button className="btn-primary w-full" onClick={() => setStep(3)}>Continuar</button>
        </div>
      )}

      {/* Step 3 — Celebracao */}
      {step === 3 && (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="text-6xl mb-6">🎊</div>
          <h1 className="text-2xl font-extrabold text-white mb-3">Feliz casamento!</h1>
          <p className="text-sm text-white/60 leading-relaxed max-w-xs mb-2">A historia de voces esta apenas comecando.</p>
          <p className="text-sm text-white/60 leading-relaxed max-w-xs mb-10">Continue registrando cada momento especial</p>
          <button className="btn-primary max-w-xs w-full mb-3" onClick={() => navigate('/novo-momento')}>
            Registrar primeiro momento de casados
          </button>
          <button className="btn-secondary max-w-xs w-full" onClick={() => navigate('/')}>Ir para o inicio</button>
        </div>
      )}

    </div>
  )
}
