import { useState, useEffect, useRef } from 'react'
import { momentsService, lettersService } from '../services/api'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import MusicPlayer from '../components/MusicPlayer'

type Section = 'menu' | 'cartas' | 'galeria' | 'musicas'

export default function WeddingDay() {
  const { user, couple } = useAuth()
  const navigate = useNavigate()

  const [section, setSection] = useState<Section>('menu')
  const [revealedLetter, setRevealedLetter] = useState(false)
  const [currentMoment, setCurrentMoment] = useState(0)
  const [moments, setMoments] = useState<any[]>([])
  const [myLetter, setMyLetter] = useState<string | null>(null)
  const [partnerLetter, setPartnerLetter] = useState<string | null>(null)
  const [partnerName, setPartnerName] = useState<string>('parceiro(a)')
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [isTransitioning, setIsTransitioning] = useState(false)
  const [introVisible, setIntroVisible] = useState(false)
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
    setTimeout(() => setIntroVisible(true), 80)
  }, [])

  const coupleName = couple?.couple_name || 'Vocês dois'
  const weddingDate = couple?.wedding_date
    ? (() => {
        const [y, m, d] = couple.wedding_date.split('T')[0].split('-').map(Number)
        return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
      })()
    : null

  const formatDate = (dateStr: string) => {
    try {
      const [y, m, d] = dateStr.split('T')[0].split('-').map(Number)
      return new Date(y, m - 1, d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })
    } catch { return dateStr }
  }

  const goToMoment = (index: number) => {
    if (index === currentMoment || isTransitioning) return
    setIsTransitioning(true)
    setTimeout(() => { setCurrentMoment(index); setIsTransitioning(false) }, 250)
    setTimeout(() => {
      const container = thumbsRef.current
      if (!container) return
      const thumb = container.children[index] as HTMLElement
      if (thumb) thumb.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' })
    }, 50)
  }

  const moment = moments[currentMoment]
  const musicMoments = moments.filter(m => m.music_name)
  const hasLetters = myLetter || partnerLetter
  const bg = { background: 'linear-gradient(160deg,#0f0a1a,#1a0535,#2d1060)' }

  // ─── LIGHTBOX ───────────────────────────────────────────────────────────────
  if (lightbox) return (
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
  )

  // ─── MENU PRINCIPAL ──────────────────────────────────────────────────────────
  if (section === 'menu') return (
    <div className="min-h-screen flex flex-col" style={bg}>
      <div
        className="flex-1 flex flex-col px-5 pt-12 pb-8"
        style={{
          opacity: introVisible ? 1 : 0,
          transform: introVisible ? 'translateY(0)' : 'translateY(16px)',
          transition: 'opacity 0.6s ease, transform 0.6s ease',
        }}
      >
        <div className="text-center mb-10">
          <div className="text-5xl mb-5">💍</div>
          <h1 className="text-2xl font-extrabold text-white mb-1">{coupleName}</h1>
          {weddingDate && (
            <p className="text-sm mb-1" style={{ color: 'rgba(255,255,255,0.5)' }}>{weddingDate}</p>
          )}
          <p className="text-xs font-medium tracking-widest uppercase" style={{ color: 'rgba(200,170,255,0.6)' }}>
            Este é o grande dia
          </p>
        </div>

        <div className="flex flex-col gap-3 w-full max-w-sm mx-auto flex-1">
          {/* Cartas — destaque */}
          <button
            onClick={() => setSection('cartas')}
            className="w-full rounded-2xl p-5 text-left"
            style={{
              background: 'linear-gradient(135deg, rgba(124,58,237,0.35), rgba(190,24,93,0.25))',
              border: '1px solid rgba(124,58,237,0.4)',
            }}
          >
            <div className="flex items-center gap-3">
              <span className="text-3xl">💌</span>
              <div>
                <p className="text-base font-bold text-white">Cartas para hoje</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.55)' }}>
                  {hasLetters ? 'Escritas antes deste dia · toque para ler' : 'Mensagens reservadas para hoje'}
                </p>
              </div>
              <span className="ml-auto text-white/40 text-lg">›</span>
            </div>
          </button>

          {/* Galeria */}
          <button
            onClick={() => setSection('galeria')}
            className="w-full rounded-2xl p-4 text-left"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">📸</span>
              <div>
                <p className="text-sm font-bold text-white">Nossa jornada</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                  {moments.length > 0 ? `${moments.length} momentos especiais` : 'Momentos registrados juntos'}
                </p>
              </div>
              <span className="ml-auto text-white/30 text-lg">›</span>
            </div>
          </button>

          {/* Músicas — só aparece se tiver */}
          {musicMoments.length > 0 && (
            <button
              onClick={() => setSection('musicas')}
              className="w-full rounded-2xl p-4 text-left"
              style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <div className="flex items-center gap-3">
                <span className="text-2xl">🎵</span>
                <div>
                  <p className="text-sm font-bold text-white">Playlist do amor</p>
                  <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.45)' }}>
                    {musicMoments.length} músicas dos nossos momentos
                  </p>
                </div>
                <span className="ml-auto text-white/30 text-lg">›</span>
              </div>
            </button>
          )}

          {/* Registrar novo momento */}
          <button
            onClick={() => navigate('/novo-momento')}
            className="w-full rounded-2xl p-4 text-left"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px dashed rgba(255,255,255,0.12)' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-2xl">✨</span>
              <div>
                <p className="text-sm font-bold text-white">Registrar este momento</p>
                <p className="text-xs mt-0.5" style={{ color: 'rgba(255,255,255,0.35)' }}>
                  Primeiro dia de casados
                </p>
              </div>
              <span className="ml-auto text-white/25 text-lg">›</span>
            </div>
          </button>
        </div>

        <div className="mt-8 text-center">
          <button
            onClick={() => navigate('/')}
            className="text-xs px-4 py-2 rounded-xl"
            style={{ color: 'rgba(255,255,255,0.3)', background: 'rgba(255,255,255,0.06)' }}
          >
            Voltar ao início
          </button>
        </div>
      </div>
    </div>
  )

  // ─── CARTAS ──────────────────────────────────────────────────────────────────
  if (section === 'cartas') return (
    <div className="min-h-screen flex flex-col" style={bg}>
      <div className="flex items-center gap-3 px-4 pt-8 pb-4">
        <button
          onClick={() => setSection('menu')}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        >
          <span className="text-white text-lg">‹</span>
        </button>
        <div>
          <h2 className="text-lg font-bold text-white">Cartas para hoje</h2>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>Escritas antes deste dia</p>
        </div>
        <span className="ml-auto text-3xl">💌</span>
      </div>

      <div className="flex-1 px-4 pb-8 flex flex-col gap-4 overflow-y-auto">
        {myLetter ? (
          <div className="rounded-2xl p-5" style={{ background: 'rgba(124,58,237,0.18)', border: '1px solid rgba(124,58,237,0.3)' }}>
            <p className="text-xs font-bold mb-3" style={{ color: 'rgba(196,181,253,0.9)' }}>Sua carta para hoje</p>
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(237,233,254,0.9)' }}>{myLetter}</p>
          </div>
        ) : (
          <div className="rounded-2xl p-5 text-center" style={{ background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.08)' }}>
            <p className="text-sm" style={{ color: 'rgba(255,255,255,0.4)' }}>Você não escreveu uma carta para hoje</p>
          </div>
        )}

        <div className="rounded-2xl p-5" style={{ background: 'rgba(190,24,93,0.18)', border: '1px solid rgba(190,24,93,0.3)' }}>
          <p className="text-xs font-bold mb-3" style={{ color: 'rgba(249,168,212,0.9)' }}>Carta de {partnerName}</p>
          {!partnerLetter ? (
            <p className="text-sm text-center" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {partnerName} não escreveu uma carta para hoje
            </p>
          ) : !revealedLetter ? (
            <div className="cursor-pointer" onClick={() => setRevealedLetter(true)}>
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(252,231,243,0.85)', filter: 'blur(6px)', userSelect: 'none' }}>
                {partnerLetter}
              </p>
              <p className="text-xs text-center mt-3" style={{ color: 'rgba(255,255,255,0.5)' }}>toque para revelar</p>
            </div>
          ) : (
            <p className="text-sm leading-relaxed" style={{ color: 'rgba(252,231,243,0.9)' }}>{partnerLetter}</p>
          )}
        </div>
      </div>
    </div>
  )

  // ─── GALERIA ─────────────────────────────────────────────────────────────────
  if (section === 'galeria') return (
    <div className="min-h-screen flex flex-col" style={bg}>
      <div className="flex items-center gap-3 px-4 pt-8 pb-3">
        <button
          onClick={() => setSection('menu')}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        >
          <span className="text-white text-lg">‹</span>
        </button>
        <div>
          <h2 className="text-lg font-bold text-white">Nossa jornada</h2>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {moments.length > 0 ? `${moments.length} momentos especiais` : 'Momentos juntos'}
          </p>
        </div>
        <span className="ml-auto text-3xl">📸</span>
      </div>

      {moments.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center p-8 text-center">
          <div className="text-5xl mb-4">📖</div>
          <p className="text-sm" style={{ color: 'rgba(255,255,255,0.5)' }}>Nenhum momento registrado ainda</p>
          <p className="text-xs mt-2" style={{ color: 'rgba(255,255,255,0.35)' }}>Mas a história de vocês está apenas começando</p>
          <button
            className="mt-8 px-6 py-3 rounded-xl text-sm font-bold text-white"
            style={{ background: 'linear-gradient(135deg,#7c3aed,#be185d)' }}
            onClick={() => navigate('/novo-momento')}
          >Registrar primeiro momento</button>
        </div>
      ) : (
        <div className="flex-1 flex flex-col">
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

          <div className="px-4 pt-3 pb-2" style={{ opacity: isTransitioning ? 0 : 1, transition: 'opacity 0.25s ease' }}>
            <p className="text-xs mb-1" style={{ color: 'rgba(255,255,255,0.4)' }}>
              {moment?.moment_date ? formatDate(moment.moment_date) : ''}
            </p>
            <h3 className="text-lg font-bold text-white leading-tight mb-1">{moment?.title}</h3>
            {moment?.description && (
              <p className="text-sm leading-relaxed" style={{ color: 'rgba(255,255,255,0.55)' }}>{moment.description}</p>
            )}
            {moment?.music_name && <MusicPlayer musicName={moment.music_name} />}
          </div>

          <div className="px-4 mt-3">
            <div ref={thumbsRef} className="flex gap-2 overflow-x-auto pb-2" style={{ scrollbarWidth: 'none' }}>
              {moments.map((m, i) => (
                <button
                  key={i}
                  onClick={() => goToMoment(i)}
                  className="flex-shrink-0 rounded-xl overflow-hidden"
                  style={{
                    width: '56px', height: '56px',
                    border: i === currentMoment ? '2px solid #7c3aed' : '2px solid rgba(255,255,255,0.1)',
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

          <div className="flex items-center justify-between px-4 mt-3 mb-4">
            <button
              onClick={() => goToMoment(currentMoment - 1)}
              disabled={currentMoment === 0}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-20"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
            >Anterior</button>
            <button
              onClick={() => goToMoment(currentMoment + 1)}
              disabled={currentMoment === moments.length - 1}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold disabled:opacity-20"
              style={{ background: 'rgba(255,255,255,0.1)', color: 'white' }}
            >Próximo</button>
          </div>
        </div>
      )}
    </div>
  )

  // ─── MÚSICAS ─────────────────────────────────────────────────────────────────
  if (section === 'musicas') return (
    <div className="min-h-screen flex flex-col" style={bg}>
      <div className="flex items-center gap-3 px-4 pt-8 pb-4">
        <button
          onClick={() => setSection('menu')}
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{ background: 'rgba(255,255,255,0.1)' }}
        >
          <span className="text-white text-lg">‹</span>
        </button>
        <div>
          <h2 className="text-lg font-bold text-white">Playlist do amor</h2>
          <p className="text-xs" style={{ color: 'rgba(255,255,255,0.45)' }}>
            {musicMoments.length} músicas dos nossos momentos
          </p>
        </div>
        <span className="ml-auto text-3xl">🎵</span>
      </div>

      <div className="flex-1 px-4 pb-8 flex flex-col gap-3 overflow-y-auto">
        {musicMoments.map((m, i) => (
          <div
            key={i}
            className="rounded-2xl p-4"
            style={{ background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.1)' }}
          >
            <p className="text-xs font-semibold mb-1" style={{ color: 'rgba(255,255,255,0.45)' }}>
              {m.title}{m.moment_date ? ` · ${formatDate(m.moment_date)}` : ''}
            </p>
            <MusicPlayer musicName={m.music_name} />
          </div>
        ))}
      </div>
    </div>
  )

  return null
}
