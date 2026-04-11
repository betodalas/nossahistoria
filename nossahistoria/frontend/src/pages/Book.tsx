import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { useNow } from '../hooks/useNow'
import { momentsService, lettersService, questionsService } from '../services/api'
import Layout from '../components/Layout'

type Section = 'main' | 'cartas'

export default function Book() {
  const { isPremium, couple } = useAuth()
  const navigate = useNavigate()
  const [section, setSection] = useState<Section>('main')
  const [openCapsule, setOpenCapsule] = useState<any>(null)
  const [writingLetter, setWritingLetter] = useState<any>(null)
  const [letterText, setLetterText] = useState('')
  const [letterSaved, setLetterSaved] = useState(false)
  const [saveError, setSaveError] = useState('')

  const wedding = couple?.wedding_date
    ? (() => { const [y,m,d] = couple.wedding_date.split('T')[0].split('-').map(Number); return new Date(y, m-1, d) })()
    : null
  const now = useNow()
  const daysUntil = (d: Date) => {
    const today = new Date()
    const todayMidnight = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
    const targetMidnight = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
    return Math.round((targetMidnight - todayMidnight) / 86400000)
  }
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

  useEffect(() => {
    momentsService.getAll().then(res => setMoments(res.data)).catch(() => {})
    questionsService.getAnswerCount().then(res => setAnswers(Array(res.data.count).fill(null))).catch(() => {})
  }, [])

  const saveLetter = async () => {
    if (!letterText.trim()) return
    setSaveError('')
    setLetterSaved(false)
    const key = writingLetter.key
    const text = letterText
    try {
      await lettersService.save(key, text)
      setLetters(prev => ({ ...prev, [key]: { text } }))
      setLetterSaved(true)
      setTimeout(() => {
        setLetterSaved(false)
        setWritingLetter(null)
        setLetterText('')
      }, 1500)
    } catch (err: any) {
      setSaveError('Erro ao salvar. Verifique sua conexão.')
    }
  }

  const myLetter = (key: string) => letters[key]?.text

  // Momentos antes do casamento (para cápsula do dia do casamento)
  const momentsBeforeWedding = () => {
    if (!wedding) return moments
    return moments.filter((m: any) => {
      const [y,mo,d] = m.moment_date.split('T')[0].split('-').map(Number)
      return new Date(y, mo-1, d).getTime() < wedding.getTime()
    })
  }

  // Momentos entre duas datas (para cápsulas anuais)
  const momentsBetween = (fromDate: Date, toDate: Date) =>
    moments.filter((m: any) => {
      const [y,mo,d] = m.moment_date.split('T')[0].split('-').map(Number)
      const t = new Date(y, mo-1, d).getTime()
      return t >= fromDate.getTime() && t < toDate.getTime()
    })

  const buildDates = () => {
    if (!wedding) return []
    const all = []
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
    if (daysUntil(d.date) <= 0) return false
    const prevPassed = d.prevDate ? daysUntil(d.prevDate) <= 0 : true
    if (!prevPassed) return false
    const hasEarlierFuture = dates.some(x =>
      x.key !== 'wedding' &&
      x.key !== d.key &&
      daysUntil(x.date) > 0 &&
      x.date.getTime() < d.date.getTime()
    )
    return !hasEarlierFuture
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
    return `🔒 Aguardando data`
  }

  const freeItems = dates.filter(d => !d.premium)
  const premiumItems = dates.filter(d => d.premium)
  const weddingPassed = wedding ? daysUntil(wedding) <= 0 : false

  const availableLetters = dates.filter(d => isOpen(d))
  const writableLetters = dates.filter(d => canWrite(d))

  // ─── SEÇÃO CARTAS ──────────────────────────────────────────────────────────
  if (section === 'cartas') return (
    <Layout>
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
            {saveError && <p className="text-xs text-red-400 text-center mb-2">{saveError}</p>}
            <button onClick={saveLetter} disabled={!letterText.trim()} className="btn-primary mb-3 disabled:opacity-40">
              {letterSaved ? '✅ Carta salva!' : '💌 Salvar carta secreta'}
            </button>
            <button onClick={() => { setWritingLetter(null); setLetterText(''); setSaveError('') }} className="btn-secondary">Cancelar</button>
          </div>
        </div>
      )}

      <div className="rounded-b-3xl px-4 pt-5 pb-5 mb-4" style={{background:'linear-gradient(135deg,#2d1060,#6b21a8)'}}>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setSection('main')}
            className="w-9 h-9 rounded-xl flex items-center justify-center"
            style={{background:'rgba(255,255,255,0.15)'}}
          >
            <span className="text-white text-lg">‹</span>
          </button>
          <div>
            <h2 className="text-base font-bold text-white">Cartas</h2>
            <p className="text-xs text-purple-200">mensagens para momentos especiais</p>
          </div>
          <span className="ml-auto text-2xl">💌</span>
        </div>
      </div>

      <div className="px-4 pb-6">

        {/* Cartas para escrever */}
        {writableLetters.length > 0 && (
          <>
            <p className="section-label">Para escrever</p>
            {writableLetters.map(d => (
              <div key={d.key} className="rounded-2xl mb-2 border overflow-hidden"
                style={{background:'#F0E6EF', borderColor:'#D8B4C8'}}>
                <div className="flex items-center gap-3 p-3 cursor-pointer"
                  onClick={() => { setWritingLetter(d); setLetterText(myLetter(d.key) || '') }}>
                  <span className="text-2xl">{d.icon}</span>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-700">{d.label}</p>
                    <p className="text-xs mt-0.5" style={{color:'#9B6B7A'}}>Abre em {fmt(d.date)}</p>
                  </div>
                  {myLetter(d.key)
                    ? <span className="pill-green">✅ escrita</span>
                    : <span className="pill-purple">escrever ✏️</span>}
                </div>
              </div>
            ))}
          </>
        )}

        {/* Cartas para ler */}
        {availableLetters.length > 0 && (
          <>
            <p className="section-label mt-4">Para ler</p>
            {availableLetters.map(d => (
              <div key={d.key} className="rounded-2xl mb-3 overflow-hidden"
                style={{background:'#F0E6EF', border:'1px solid #D8B4C8'}}>
                <div className="flex items-center gap-3 p-3 border-b" style={{borderColor:'rgba(0,0,0,0.06)'}}>
                  <span className="text-2xl">{d.icon}</span>
                  <div>
                    <p className="text-sm font-medium text-gray-700">{d.label}</p>
                    <p className="text-xs" style={{color:'#9B6B7A'}}>{fmt(d.date)}</p>
                  </div>
                </div>
                {myLetter(d.key) && (
                  <div className="p-4" style={{background:'rgba(124,58,237,0.08)', borderBottom:'1px solid rgba(124,58,237,0.12)'}}>
                    <p className="text-xs font-bold mb-2" style={{color:'#7c3aed'}}>💌 Sua carta</p>
                    <p className="text-sm leading-relaxed text-gray-700">{myLetter(d.key)}</p>
                  </div>
                )}
                {(() => {
                  const partnerLetter = letters[`partner_${d.key}`]?.text
                  return partnerLetter ? (
                    <div className="p-4">
                      <p className="text-xs font-bold mb-2" style={{color:'#be185d'}}>💌 Carta de {couple?.partner_name || 'parceiro(a)'}</p>
                      <p className="text-sm leading-relaxed text-gray-700"
                        style={{filter:'blur(5px)', cursor:'pointer', transition:'filter 0.4s'}}
                        onClick={e => (e.currentTarget.style.filter='none')}>
                        {partnerLetter}
                      </p>
                      <p className="text-xs text-center mt-2" style={{color:'#9B6B7A'}}>toque para revelar</p>
                    </div>
                  ) : (
                    <div className="p-4 text-center">
                      <p className="text-xs" style={{color:'#9B6B7A'}}>💌 {couple?.partner_name || 'Parceiro(a)'} ainda não escreveu</p>
                    </div>
                  )
                })()}
              </div>
            ))}
          </>
        )}

        {writableLetters.length === 0 && availableLetters.length === 0 && (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">💌</div>
            <p className="text-sm" style={{color:'#9B6B7A'}}>As cartas ficam disponíveis conforme as datas se aproximam</p>
          </div>
        )}
      </div>
    </Layout>
  )

  // ─── SEÇÃO PRINCIPAL ───────────────────────────────────────────────────────
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
            </div>
            <textarea
              className="input-field resize-none mb-4"
              style={{height:'160px'}}
              placeholder={`Escreva para o seu parceiro(a) abrir em ${writingLetter.label.toLowerCase()}...`}
              value={letterText}
              onChange={e => setLetterText(e.target.value)}
            />
            {saveError && <p className="text-xs text-red-400 text-center mb-2">{saveError}</p>}
            <button onClick={saveLetter} disabled={!letterText.trim()} className="btn-primary mb-3 disabled:opacity-40">
              {letterSaved ? '✅ Carta salva!' : '💌 Salvar carta secreta'}
            </button>
            <button onClick={() => { setWritingLetter(null); setLetterText(''); setSaveError('') }} className="btn-secondary">Cancelar</button>
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

            {myLetter(openCapsule.key) && (
              <div className="rounded-2xl p-4 mb-3" style={{background:'rgba(124,58,237,0.2)',border:'1px solid rgba(124,58,237,0.3)'}}>
                <p className="text-xs font-bold text-violet-700 mb-2">💌 Sua carta</p>
                <p className="text-sm text-gray-700 leading-relaxed">{myLetter(openCapsule.key)}</p>
              </div>
            )}

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
                <div className="rounded-2xl p-4 mb-4 text-center" style={{background:'rgba(255,255,255,0.5)',border:'1px dashed #D8B4C8'}}>
                  <p className="text-xs text-gray-600">💌 {couple?.partner_name || 'Parceiro(a)'} ainda não escreveu a carta</p>
                </div>
              )
            })()}

            {/* Momentos do período correto */}
            {(() => {
              const periodMoments = openCapsule.key === 'wedding'
                ? momentsBeforeWedding()
                : momentsBetween(openCapsule.prevDate, openCapsule.date)
              return periodMoments.length > 0 ? (
                <>
                  <p className="text-xs font-bold text-violet-700 tracking-widest uppercase mb-3">
                    📖 {openCapsule.key === 'wedding' ? 'Momentos antes do casamento' : 'Momentos deste ano'}
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

        {/* Botão Cartas */}
        <div className="rounded-2xl mb-4 cursor-pointer"
          style={{background:'#F0E6EF', border:'1px solid #D8B4C8'}}
          onClick={() => setSection('cartas')}>
          <div className="flex items-center gap-3 p-4">
            <span className="text-2xl">💌</span>
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-700">Cartas</p>
              <p className="text-xs mt-0.5" style={{color:'#9B6B7A'}}>
                {availableLetters.length > 0
                  ? `${availableLetters.length} carta${availableLetters.length > 1 ? 's' : ''} para ler · ${writableLetters.length} para escrever`
                  : writableLetters.length > 0
                    ? `${writableLetters.length} carta${writableLetters.length > 1 ? 's' : ''} para escrever`
                    : 'Mensagens para momentos especiais'}
              </p>
            </div>
            <span className="text-gray-400 text-lg">›</span>
          </div>
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
