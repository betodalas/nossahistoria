import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNow } from '../hooks/useNow'
import { momentsService, lettersService } from '../services/api'
import Layout from '../components/Layout'

export default function Book() {
  const { isPremium, couple } = useAuth()
  const navigate = useNavigate()
  const [openCapsule, setOpenCapsule] = useState<any>(null)
  const [writingLetter, setWritingLetter] = useState<any>(null)
  const [letterText, setLetterText] = useState('')
  const [letterSaved, setLetterSaved] = useState(false)

  // Parse robusto — evita problema de fuso horário (ex: '2026-04-09' virando dia anterior)
  const wedding = couple?.wedding_date
    ? (() => { const [y,m,d] = couple.wedding_date.split('T')[0].split('-').map(Number); return new Date(y, m-1, d) })()
    : null
  const now = useNow()
  const daysUntil = (d: Date) => Math.ceil((d.getTime() - now) / 86400000)
  const fmt = (d: Date) => d.toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

  const [moments, setMoments] = useState<any[]>([])
  const [answers, setAnswers] = useState<any[]>([])
  const [letters, setLetters] = useState<Record<string,any>>({})

  useEffect(() => {
    lettersService.getAll().then(res => {
      const map: Record<string,any> = {}
      res.data.forEach((l: any) => { map[l.capsule_key] = { text: l.text } })
      setLetters(map)
    }).catch(() => {})
  }, [])

  // Busca momentos reais da API
  useEffect(() => {
    momentsService.getAll().then(res => setMoments(res.data)).catch(() => {})
  }, [])

  const saveLetter = async () => {
    if (!letterText.trim()) return
    setLetterSaved(true)
    const key = writingLetter.key
    const text = letterText
    try {
      await lettersService.save(key, text)
      setLetters(prev => ({ ...prev, [key]: { text } }))
    } catch {}
    setTimeout(() => {
      setLetterSaved(false)
      setWritingLetter(null)
      setLetterText('')
    }, 1500)
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
          <div className="w-full max-w-md rounded-t-3xl p-6" style={{background:'#F5E6EA'}}>
            <div className="text-center mb-4">
              <div className="text-3xl mb-2">{writingLetter.icon}</div>
              <h2 className="text-base font-bold text-gray-800">Carta para {writingLetter.label}</h2>
              <p className="text-xs text-gray-600 mt-1">Só abre em {fmt(writingLetter.date)}</p>
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
          <div className="w-full max-w-md rounded-t-3xl p-6 overflow-y-auto" style={{background:'#F5E6EA', maxHeight:'85vh'}}>
            <div className="text-center mb-5">
              <div className="text-4xl mb-2">{openCapsule.icon}</div>
              <h2 className="text-lg font-bold text-gray-800">{openCapsule.label}</h2>
              <p className="text-xs text-gray-600 mt-1">{fmt(openCapsule.date)}</p>
            </div>

            {/* Botão escrever carta se ainda não escreveu */}
            {!myLetter(openCapsule.key) && !isOpen(openCapsule) && (
              <button
                className="w-full py-3 rounded-2xl text-sm font-semibold mb-4"
                style={{background:'rgba(124,58,237,0.15)', color:'#7c3aed', border:'1px solid rgba(124,58,237,0.3)'}}
                onClick={() => { setOpenCapsule(null); setWritingLetter(openCapsule); setLetterText('') }}
              >
                💌 Escrever minha carta secreta
              </button>
            )}
            {myLetter(openCapsule.key) && !isOpen(openCapsule) && (
              <button
                className="w-full py-2 rounded-2xl text-xs font-semibold mb-3"
                style={{background:'rgba(52,211,153,0.15)', color:'#059669', border:'1px solid rgba(52,211,153,0.3)'}}
                onClick={() => { setOpenCapsule(null); setWritingLetter(openCapsule); setLetterText(myLetter(openCapsule.key) || '') }}
              >
                ✅ Carta escrita · toque para editar
              </button>
            )}

            {/* Carta de quem está lendo */}
            {myLetter(openCapsule.key) && isOpen(openCapsule) && (
              <div className="rounded-2xl p-4 mb-3" style={{background:'rgba(124,58,237,0.2)',border:'1px solid rgba(124,58,237,0.3)'}}>
                <p className="text-xs font-bold text-violet-700 mb-2">💌 Sua carta</p>
                <p className="text-sm text-gray-700 leading-relaxed">{myLetter(openCapsule.key)}</p>
              </div>
            )}

            {/* Carta do parceiro */}
            {(() => {
              const partnerLetter = letters[`partner_${openCapsule.key}`]?.text
              return partnerLetter ? (
                <div className="rounded-2xl p-4 mb-4" style={{background:'rgba(190,24,93,0.2)',border:'1px solid rgba(190,24,93,0.3)'}}>
                  <p className="text-xs font-bold text-pink-600 mb-2">💌 Carta do(a) {couple?.partner_name || 'parceiro(a)'}</p>
                  <p className="text-sm text-gray-700 leading-relaxed"
                    style={{filter:'blur(5px)', cursor:'pointer', transition:'filter 0.4s'}}
                    onClick={e => (e.currentTarget.style.filter='none')}>
                    {partnerLetter}
                  </p>
                  <p className="text-xs text-gray-600 text-center mt-2">toque para revelar</p>
                </div>
              ) : (
                <div className="rounded-2xl p-4 mb-4 text-center" style={{background:'rgba(255,255,255,0.04)',border:'1px dashed rgba(255,255,255,0.1)'}}>
                  <p className="text-xs text-gray-600">💌 {couple?.partner_name || 'Parceiro(a)'} ainda não escreveu a carta para este momento</p>
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
                  <p className="text-xs font-bold text-violet-700 tracking-widest uppercase mb-3">
                    📖 Momentos {openCapsule.prevDate ? 'deste ano' : 'de vocês'}
                  </p>
                  {periodMoments.map((m: any, i: number) => (
                    <div key={i} className="mb-3 pb-3 border-b border-gray-200">
                      <p className="text-xs text-gray-600">{new Date(m.moment_date).toLocaleDateString('pt-BR')}</p>
                      <p className="text-sm font-semibold text-gray-700 mt-0.5">{m.title}</p>
                      {m.description && <p className="text-xs text-gray-500 mt-1">{m.description}</p>}
                      {m.photo_url && <img src={m.photo_url} className="w-full rounded-xl mt-2 object-contain" style={{maxHeight:'160px'}} />}
                      {m.music_name && <p className="text-xs text-violet-700 mt-1">♪ {m.music_name}</p>}
                    </div>
                  ))}
                </>
              ) : (
                <p className="text-xs text-gray-600 text-center py-4">Nenhum momento registrado neste período</p>
              )
            })()}

            <button onClick={() => setOpenCapsule(null)} className="btn-primary mt-4">Fechar</button>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="rounded-b-3xl px-4 pt-5 pb-5 mb-4" style={{background:'linear-gradient(135deg,#2d1060,#6b21a8)'}}>
        <h2 className="text-base font-bold text-white text-center">Nosso livro</h2>
        <p className="text-xs text-purple-200 text-center mt-1">sua história para sempre</p>
      </div>

      <div className="px-4 pb-6">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 mb-5">
          {[
            { n: moments.length, l: 'momentos' },
            { n: answers.length, l: 'perguntas' },
            { n: wedding ? Math.max(0, daysUntil(wedding)) : '?', l: 'dias' }
          ].map(s => (
            <div key={s.l} className="border border-gray-200 rounded-xl p-3 text-center" style={{background:'#F5E6EA'}}>
              <div className="text-xl font-bold text-violet-700">{s.n}</div>
              <div className="text-xs text-gray-600 mt-1">{s.l}</div>
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
              <p className="text-sm font-bold text-violet-700 mb-1">👑 4º ao 10º aniversário</p>
              <p className="text-xs text-gray-600 mb-3">Cartas + momentos de cada ano · disponível no premium</p>
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
          background: open ? 'rgba(52,211,153,0.08)' : '#F0E6EF',
          borderColor: open ? 'rgba(52,211,153,0.35)' : '#D8B4C8'
        }}>
        <div className="flex items-center gap-3 p-3 cursor-pointer"
          onClick={() => {
            if (open) setOpenCapsule(d)
            else if (write) { setWritingLetter(d); setLetterText(myLetter(d.key) || '') }
          }}>
          <span className="text-2xl">{d.icon}</span>
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-700">{d.label}</p>
            <p className="text-xs mt-0.5" style={{color:'#9B6B7A'}}>
              {fmt(d.date)}{daysUntil(d.date) > 0 ? ` · em ${daysUntil(d.date)} dias` : ' · hoje!'}
            </p>
            <p className="text-xs mt-0.5" style={{color:'#B08898'}}>{d.description}</p>
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
              style={{background:'rgba(0,0,0,0.04)', border:'1px solid rgba(0,0,0,0.08)'}}>
              <p className="text-xs" style={{color:'#9B6B7A'}}>{writeHint(d)}</p>
            </div>
          )}
        </div>
      </div>
    )
  }
}
