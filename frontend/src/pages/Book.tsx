import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNow } from '../hooks/useNow'
import Layout from '../components/Layout'

export default function Book() {
  const { isPremium, couple } = useAuth()
  const navigate = useNavigate()
  const [openCapsule, setOpenCapsule] = useState<any>(null)
  const [writingLetter, setWritingLetter] = useState<any>(null)
  const [letterText, setLetterText] = useState('')
  const [letterSaved, setLetterSaved] = useState(false)

  const wedding = couple?.wedding_date ? new Date(couple.wedding_date) : null
  const now = useNow()
  const daysUntil = (d: Date) => Math.ceil((d.getTime() - now) / 86400000)
  const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

  const moments = JSON.parse(localStorage.getItem('moments') || '[]')
  const answers = JSON.parse(localStorage.getItem('answers') || '[]')
  const letters = JSON.parse(localStorage.getItem('letters') || '{}')

  const saveLetter = () => {
    if (!letterText.trim()) return
    const updated = { ...letters, [writingLetter.key]: { text: letterText, date: new Date().toISOString() } }
    localStorage.setItem('letters', JSON.stringify(updated))
    setLetterSaved(true)
    setTimeout(() => { setLetterSaved(false); setWritingLetter(null); setLetterText('') }, 1500)
  }

  const myLetter = (key: string) => letters[key]?.text

  // Filtra momentos de um determinado ano
  const momentsByYear = (fromDate: Date, toDate: Date) =>
    moments.filter((m: any) => {
      const d = new Date(m.moment_date).getTime()
      return d >= fromDate.getTime() && d < toDate.getTime()
    })

  // Gera todas as datas
  const buildDates = () => {
    if (!wedding) return []

    const all = []

    // Dia do casamento
    all.push({
      label: 'Dia do casamento',
      shortLabel: 'Casamento',
      icon: '💍',
      date: wedding,
      key: 'wedding',
      premium: false,
      description: 'Para ler no altar',
      prevDate: null,
    })

    // 1 a 10 anos
    for (let y = 1; y <= 10; y++) {
      const date = new Date(wedding.getFullYear()+y, wedding.getMonth(), wedding.getDate())
      const prevDate = y === 1 ? wedding : new Date(wedding.getFullYear()+(y-1), wedding.getMonth(), wedding.getDate())
      const icons: Record<number,string> = {1:'🎂',2:'🌹',3:'⭐',4:'🌟',5:'✨',6:'💫',7:'🎊',8:'🎉',9:'🏅',10:'🏆'}
      all.push({
        label: `${y} ${y === 1 ? 'ano' : 'anos'} de casados`,
        shortLabel: `${y}º aniversário`,
        icon: icons[y] || '💜',
        date,
        key: `year${y}`,
        premium: y >= 4,
        description: y === 1 ? 'Carta + primeiro ano juntos' : `Carta + momentos do ${y}º ano`,
        prevDate,
      })
    }

    return all
  }

  const dates = buildDates()

  const canWrite = (d: any) => {
    if (d.key === 'wedding') return daysUntil(d.date) > 0
    // Libera depois que o evento anterior aconteceu
    const prevPassed = d.prevDate ? daysUntil(d.prevDate) <= 0 : true
    // Fecha 6 meses antes do evento
    const sixMonthsBefore = new Date(d.date)
    sixMonthsBefore.setMonth(sixMonthsBefore.getMonth() - 6)
    const stillOpen = daysUntil(sixMonthsBefore) > 0
    return prevPassed && stillOpen && daysUntil(d.date) > 0
  }

  const isOpen = (d: any) => daysUntil(d.date) <= 0

  const deadline = (d: any) => {
    if (d.key === 'wedding') return null
    const sixMonthsBefore = new Date(d.date)
    sixMonthsBefore.setMonth(sixMonthsBefore.getMonth() - 6)
    const days = daysUntil(sixMonthsBefore)
    return days > 0 ? `${days} dias para escrever` : null
  }

  const prevUnlocked = (d: any) => {
    if (!d.prevDate) return true
    return daysUntil(d.prevDate) <= 0
  }

  const writeHint = (d: any) => {
    if (!prevUnlocked(d)) {
      const prevLabel = dates.find(x => {
        const pd = new Date(d.date); pd.setFullYear(pd.getFullYear()-1)
        return x.date.getTime() === pd.getTime()
      })?.shortLabel || 'evento anterior'
      return `🔒 Libera depois do ${prevLabel}`
    }
    return `🔒 Libera 6 meses antes`
  }

  // Separa casamento + anos free + anos premium
  const freeItems = dates.filter(d => !d.premium)
  const premiumItems = dates.filter(d => d.premium)

  return (
    <Layout>

      {/* Modal escrever carta */}
      {writingLetter && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{background:'rgba(0,0,0,0.85)'}}>
          <div className="w-full max-w-md rounded-t-3xl p-6" style={{background:'#1a1030'}}>
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">{writingLetter.icon}</div>
              <h2 className="text-base font-bold text-white">Carta para {writingLetter.label}</h2>
              <p className="text-xs text-white/40 mt-1">Só abre em {fmt(writingLetter.date)}</p>
              {deadline(writingLetter) && (
                <p className="text-xs text-amber-400 mt-1">⏳ {deadline(writingLetter)}</p>
              )}
            </div>
            <textarea
              className="input-field resize-none mb-4"
              style={{height:'160px'}}
              placeholder={`Escreva para o seu parceiro(a) abrir em ${writingLetter.label.toLowerCase()}...`}
              value={letterText}
              onChange={e => setLetterText(e.target.value)}
            />
            <button onClick={saveLetter} disabled={!letterText.trim()} className="btn-primary mb-3 disabled:opacity-40">
              {letterSaved ? '✅ Carta salva!' : '💌 Salvar carta secreta'}
            </button>
            <button onClick={() => { setWritingLetter(null); setLetterText('') }} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      )}

      {/* Modal abrir cápsula */}
      {openCapsule && (
        <div className="fixed inset-0 z-50 flex items-end justify-center" style={{background:'rgba(0,0,0,0.85)'}}>
          <div className="w-full max-w-md rounded-t-3xl p-6 overflow-y-auto" style={{background:'#1a1030', maxHeight:'85vh'}}>
            <div className="text-center mb-5">
              <div className="text-4xl mb-2">{openCapsule.icon}</div>
              <h2 className="text-lg font-bold text-white">{openCapsule.label}</h2>
              <p className="text-xs text-white/40 mt-1">{fmt(openCapsule.date)}</p>
            </div>

            {/* Carta de quem está lendo */}
            {myLetter(openCapsule.key) && (
              <div className="rounded-2xl p-4 mb-3" style={{background:'rgba(124,58,237,0.2)',border:'1px solid rgba(124,58,237,0.3)'}}>
                <p className="text-xs font-bold text-violet-300 mb-2">💌 Sua carta</p>
                <p className="text-sm text-purple-100 leading-relaxed">{myLetter(openCapsule.key)}</p>
              </div>
            )}

            {/* Carta do parceiro */}
            {(() => {
              const partnerLetter = letters[`partner_${openCapsule.key}`]?.text
              return partnerLetter ? (
                <div className="rounded-2xl p-4 mb-4" style={{background:'rgba(190,24,93,0.2)',border:'1px solid rgba(190,24,93,0.3)'}}>
                  <p className="text-xs font-bold text-pink-300 mb-2">💌 Carta do(a) {couple?.partner_name || 'parceiro(a)'}</p>
                  <p className="text-sm text-purple-100 leading-relaxed"
                    style={{filter:'blur(5px)', cursor:'pointer', transition:'filter 0.4s'}}
                    onClick={e => (e.currentTarget.style.filter='none')}>
                    {partnerLetter}
                  </p>
                  <p className="text-xs text-white/30 text-center mt-2">toque para revelar</p>
                </div>
              ) : (
                <div className="rounded-2xl p-4 mb-4 text-center" style={{background:'rgba(255,255,255,0.04)',border:'1px dashed rgba(255,255,255,0.1)'}}>
                  <p className="text-xs text-white/30">💌 {couple?.partner_name || 'Parceiro(a)'} ainda não escreveu a carta para este momento</p>
                </div>
              )
            })()}

            {/* Momentos do período */}
            {(() => {
              const periodMoments = openCapsule.prevDate
                ? momentsByYear(openCapsule.prevDate, openCapsule.date)
                : moments
              return periodMoments.length > 0 ? (
                <>
                  <p className="text-xs font-bold text-violet-300 tracking-widest uppercase mb-3">
                    📖 Momentos {openCapsule.prevDate ? 'deste ano' : 'de vocês'}
                  </p>
                  {periodMoments.map((m: any, i: number) => (
                    <div key={i} className="mb-3 pb-3 border-b border-white/10">
                      <p className="text-xs text-white/30">{new Date(m.moment_date).toLocaleDateString('pt-BR')}</p>
                      <p className="text-sm font-semibold text-purple-100 mt-0.5">{m.title}</p>
                      {m.description && <p className="text-xs text-white/50 mt-1">{m.description}</p>}
                      {m.photo_url && <img src={m.photo_url} className="w-full rounded-xl mt-2 object-contain" style={{maxHeight:'160px'}} />}
                      {m.music_name && <p className="text-xs text-violet-300 mt-1">♪ {m.music_name}</p>}
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-xs text-white/30 text-center py-4">Nenhum momento registrado neste período</p>
              )
            })()}

            <button onClick={() => setOpenCapsule(null)} className="btn-primary mt-4">Fechar</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="rounded-b-3xl px-4 pt-5 pb-5 mb-4" style={{background:'linear-gradient(135deg,#2d1060,#6b21a8)'}}>
        <h2 className="text-base font-bold text-white text-center">Nosso livro</h2>
        <p className="text-xs text-white/60 text-center mt-1">sua história para sempre</p>
      </div>

      <div className="px-4 pb-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { n: moments.length, l: 'momentos' },
            { n: answers.length, l: 'perguntas' },
            { n: wedding ? Math.max(0, daysUntil(wedding)) : '?', l: 'dias' }
          ].map(s => (
            <div key={s.l} className="border border-white/10 rounded-xl p-3 text-center" style={{background:'#1a1030'}}>
              <div className="text-xl font-bold text-violet-300">{s.n}</div>
              <div className="text-xs text-white/40 mt-1">{s.l}</div>
            </div>
          ))}
        </div>

        {/* Cápsulas grátis */}
        <p className="section-label">Cápsulas do tempo</p>
        {freeItems.map(d => renderCard(d))}

        {/* Cápsulas premium */}
        {!isPremium ? (
          <div className="rounded-2xl border border-violet-500/25 overflow-hidden mt-2" style={{background:'rgba(124,58,237,0.08)'}}>
            <div className="p-4 text-center">
              <p className="text-sm font-bold text-violet-300 mb-1">👑 4º ao 10º aniversário</p>
              <p className="text-xs text-white/40 mb-3">Cartas + momentos de cada ano · disponível no premium</p>
              <div className="flex flex-wrap gap-2 justify-center mb-4">
                {premiumItems.map(d => (
                  <span key={d.key} className="text-lg">{d.icon}</span>
                ))}
              </div>
              <button className="btn-secondary mb-2" onClick={() => navigate("/livro-pdf")}>📥 Exportar livro em PDF</button>
        <button className="btn-primary" onClick={() => navigate("/premium")}>
                👑 Desbloquear · R$49
              </button>
            </div>
          </div>
        ) : (
          <>
            <p className="section-label mt-4">Aniversários premium</p>
            {premiumItems.map(d => renderCard(d))}
          </>
        )}
      </div>
    </Layout>
  )

  function renderCard(d: any) {
    const locked = d.premium && !isPremium
    const open = isOpen(d)
    const write = canWrite(d)
    const hasLetter = !!myLetter(d.key)
    const dl = deadline(d)

    return (
      <div key={d.key} className="rounded-2xl mb-2 border overflow-hidden"
        style={{
          background: open ? 'rgba(52,211,153,0.08)' : '#1a1030',
          borderColor: open ? 'rgba(52,211,153,0.35)' : 'rgba(255,255,255,0.08)'
        }}>
        <div className="flex items-center gap-3 p-3 cursor-pointer"
          onClick={() => open ? setOpenCapsule(d) : null}>
          <span className="text-2xl">{d.icon}</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-purple-100">{d.label}</p>
            <p className="text-xs text-white/35 mt-0.5">
              {fmt(d.date)}{daysUntil(d.date) > 0 ? ` · em ${daysUntil(d.date)} dias` : ' · hoje!'}
            </p>
            <p className="text-xs text-white/25 mt-0.5">{d.description}</p>
          </div>
          {open ? <span className="pill-green">abrir 👆</span>
            : write ? <span className="pill-green">escrever ✏️</span>
            : <span className="pill-gray">bloqueado</span>}
        </div>

        <div className="px-3 pb-3">
          {write ? (
            <>
              <button
                onClick={() => { setWritingLetter(d); setLetterText(myLetter(d.key) || '') }}
                className="w-full py-2 rounded-xl text-xs font-semibold"
                style={{
                  background: hasLetter ? 'rgba(52,211,153,0.15)' : 'rgba(124,58,237,0.2)',
                  color: hasLetter ? '#6ee7b7' : '#c4b5fd',
                  border: `1px solid ${hasLetter ? 'rgba(52,211,153,0.3)' : 'rgba(124,58,237,0.3)'}`
                }}
              >
                {hasLetter ? '✅ Carta escrita · toque para editar' : '💌 Escrever carta secreta'}
              </button>
              {dl && !hasLetter && (
                <p className="text-xs text-amber-400 text-center mt-1.5">⏳ {dl}</p>
              )}
            </>
          ) : !open && (
            <div className="py-2 px-3 rounded-xl text-center"
              style={{background:'rgba(255,255,255,0.03)', border:'1px solid rgba(255,255,255,0.05)'}}>
              <p className="text-xs text-white/20">{writeHint(d)}</p>
            </div>
          )}
        </div>
      </div>
    )
  }
}
