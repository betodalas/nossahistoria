import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { questionsService } from '../services/api'
import Layout from '../components/Layout'

const mapResponse = (data: any, userId: string | undefined) => {
  if (data?.answeredToday !== undefined) {
    return {
      id: data.question?.id,
      question: data.question?.text,
      myAnswer: data.myAnswer || null,
      partnerAnswer: data.partnerAnswer || null,
      answeredToday: data.answeredToday,
      history: data.history || [],
    }
  }
  const q = data?.question
  const answers = data?.answers || []
  const myAnswerObj = userId
    ? answers.find((a: any) => String(a.user_id) === String(userId))
    : answers[0]
  const partnerAnswerObj = userId
    ? answers.find((a: any) => String(a.user_id) !== String(userId))
    : answers[1]
  return {
    id: q?.id,
    question: q?.text || q?.question,
    myAnswer: myAnswerObj?.answer || null,
    partnerAnswer: partnerAnswerObj?.answer || null,
    answeredToday: !!myAnswerObj,
    history: data?.history || [],
  }
}

export default function Questions() {
  const { couple, user } = useAuth()
  const [answer, setAnswer] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [tab, setTab] = useState<'hoje' | 'historico'>('hoje')
  const [currentQuestion, setCurrentQuestion] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  const alreadyAnswered = saved || !!currentQuestion?.myAnswer || currentQuestion?.answeredToday
  const partnerAnswer = currentQuestion?.partnerAnswer || null
  const todayQuestion = currentQuestion?.question || ''

  useEffect(() => { loadQuestion() }, [])

  const loadQuestion = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await questionsService.getCurrent()
      const data = res.data
      if (data?.done) { setLoading(false); return }
      if (!data?.question) {
        // Seed silencioso só se não há perguntas - protegido pelo backend via autenticação
        const res2 = await questionsService.getCurrent()
        const mapped2 = mapResponse(res2.data, user?.id)
        setCurrentQuestion(mapped2)
        if (mapped2.myAnswer) setAnswer(mapped2.myAnswer)
        setHistory(mapped2.history || [])
        return
      }
      const mapped = mapResponse(data, user?.id)
      setCurrentQuestion(mapped)
      if (mapped.myAnswer) setAnswer(mapped.myAnswer)
      setHistory(mapped.history || [])
    } catch {
      setError('Erro ao carregar pergunta. Verifique sua conexão.')
    } finally {
      setLoading(false)
    }
  }

  const saveAnswer = async () => {
    if (!answer.trim()) return
    if (!currentQuestion?.id) { setError('Pergunta não carregada. Tente recarregar.'); return }
    setSaving(true)
    setError('')
    try {
      await questionsService.answer(currentQuestion.id, answer)
      setSaved(true)
      const res = await questionsService.getCurrent()
      const mapped = mapResponse(res.data, user?.id)
      setCurrentQuestion(mapped)
      setHistory(mapped.history || [])
    } catch (err: any) {
      const msg = err?.response?.data?.error || ''
      setError(msg || 'Erro ao salvar resposta. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="rounded-b-3xl px-4 pt-5 pb-5 mb-4"
        style={{ background: 'linear-gradient(135deg,#FADADD,#E8C4CE)' }}>
        <h2 className="text-base font-bold text-center" style={{ color: '#3D1A2A' }}>Perguntas do casal</h2>
        <p className="text-xs text-center mt-1" style={{ color: '#9B6B7A' }}>uma pergunta nova todo dia 💜</p>
      </div>

      <div className="flex px-4 mb-4 gap-2">
        {(['hoje', 'historico'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: tab === t ? 'linear-gradient(135deg,#C9A0B0,#7C4D6B)' : '#F5E6EA',
              color: tab === t ? 'white' : '#7C4D6B',
              border: tab === t ? 'none' : '1px solid #E8C4CE',
            }}>
            {t === 'hoje' ? '✨ Hoje' : `📖 Histórico (${history.length})`}
          </button>
        ))}
      </div>

      <div className="px-4 pb-6">
        {error && (
          <div className="mb-4 px-3 py-2 rounded-xl text-sm text-center"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#b91c1c' }}>
            {error}
            <button onClick={loadQuestion} className="block mx-auto mt-2 text-xs underline" style={{ color: '#9B6B7A' }}>
              Tentar novamente
            </button>
          </div>
        )}

        {tab === 'hoje' && (
          <>
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔥</span>
                <div>
                  <p className="text-sm font-bold" style={{ color: '#3D1A2A' }}>{history.length} dias respondidos</p>
                  <p className="text-xs" style={{ color: '#9B6B7A' }}>continue respondendo!</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs" style={{ color: '#9B6B7A' }}>
                  {new Date().toLocaleDateString('pt-BR', { weekday: 'long' })}
                </p>
                <p className="text-xs" style={{ color: '#C9A0B0' }}>{new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-sm" style={{ color: '#9B6B7A' }}>Carregando pergunta...</div>
            ) : !currentQuestion?.question ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-sm" style={{ color: '#9B6B7A' }}>Carregando perguntas...</p>
              </div>
            ) : (
              <>
                <div className="rounded-2xl p-5 mb-4"
                  style={{ background: '#FADADD', border: '1px solid #E8C4CE' }}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">💬</span>
                    <span className="pill-purple text-xs uppercase tracking-widest">Pergunta de hoje</span>
                  </div>
                  <p className="text-base font-medium leading-relaxed" style={{ color: '#3D1A2A' }}>{todayQuestion}</p>
                </div>

                {alreadyAnswered ? (
                  <>
                    <div className="rounded-xl p-4 mb-4" style={{ background: '#F5E6EA', border: '1px solid #E8C4CE' }}>
                      <p className="text-xs font-bold mb-1" style={{ color: '#7C4D6B' }}>💜 Sua resposta</p>
                      <p className="text-sm" style={{ color: '#3D1A2A' }}>{currentQuestion.myAnswer || answer}</p>
                    </div>

                    {partnerAnswer ? (
                      <div className="rounded-2xl p-4" style={{ background: '#FADADD', border: '1px solid #E8C4CE' }}>
                        <p className="text-xs font-bold mb-2" style={{ color: '#C9A0B0' }}>
                          💜 {couple?.partner_name || 'Parceiro(a)'} respondeu
                        </p>
                        {!revealed ? (
                          <div className="cursor-pointer py-1" onClick={() => setRevealed(true)}>
                            <p className="text-sm leading-relaxed select-none" style={{ filter: 'blur(6px)', color: '#3D1A2A' }}>
                              {partnerAnswer}
                            </p>
                            <p className="text-xs mt-2 text-center" style={{ color: '#9B6B7A' }}>👆 toque para revelar</p>
                          </div>
                        ) : (
                          <p className="text-sm leading-relaxed" style={{ color: '#3D1A2A' }}>{partnerAnswer}</p>
                        )}
                      </div>
                    ) : (
                      <div className="rounded-2xl p-4 text-center" style={{ background: 'white', border: '1px solid #E8C4CE' }}>
                        <span className="text-2xl block mb-2">⏳</span>
                        <p className="text-xs" style={{ color: '#9B6B7A' }}>
                          {couple?.partner_name || 'Parceiro(a)'} ainda não respondeu hoje
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#C9A0B0' }}>Volte mais tarde para ver 💜</p>
                      </div>
                    )}

                    <div className="mt-4 text-center">
                      <p className="text-xs" style={{ color: '#9B6B7A' }}>Nova pergunta amanhã 🌙</p>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="mb-4">
                      <label className="text-xs block mb-2" style={{ color: '#9B6B7A' }}>Sua resposta</label>
                      <textarea
                        className="input-field resize-none"
                        style={{ height: '120px' }}
                        placeholder="Escreva o que sente de verdade..."
                        value={answer}
                        onChange={e => setAnswer(e.target.value)}
                      />
                    </div>
                    <button onClick={saveAnswer} disabled={!answer.trim() || saving}
                      className="btn-primary disabled:opacity-40 mb-4">
                      {saving ? '💌 Salvando...' : '💌 Salvar resposta'}
                    </button>
                    <p className="text-xs text-center" style={{ color: '#9B6B7A' }}>
                      Responda primeiro para ver o que {couple?.partner_name || 'o(a) parceiro(a)'} disse 💜
                    </p>
                  </>
                )}
              </>
            )}
          </>
        )}

        {tab === 'historico' && (
          <>
            {history.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📖</div>
                <p className="text-sm" style={{ color: '#9B6B7A' }}>Nenhuma resposta ainda</p>
                <button className="btn-primary mt-6 max-w-xs mx-auto" onClick={() => setTab('hoje')}>
                  Responder agora ✨
                </button>
              </div>
            ) : (
              history.map((item: any, i: number) => (
                <div key={i} className="rounded-2xl p-4 mb-3" style={{ background: '#F5E6EA', border: '1px solid #E8C4CE' }}>
                  <span className="text-xs" style={{ color: '#9B6B7A' }}>
                    {new Date(item.date).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })}
                  </span>
                  <p className="text-xs italic my-2" style={{ color: '#7C4D6B' }}>"{item.question}"</p>
                  <div className="rounded-xl p-3 mb-2" style={{ background: 'white' }}>
                    <p className="text-xs mb-1" style={{ color: '#9B6B7A' }}>Você</p>
                    <p className="text-sm" style={{ color: '#3D1A2A' }}>{item.answer || item.myAnswer}</p>
                  </div>
                  {item.partnerAnswer && (
                    <div className="rounded-xl p-3" style={{ background: '#FADADD' }}>
                      <p className="text-xs mb-1" style={{ color: '#9B6B7A' }}>{couple?.partner_name || 'Parceiro(a)'}</p>
                      <p className="text-sm" style={{ color: '#3D1A2A' }}>{item.partnerAnswer}</p>
                    </div>
                  )}
                </div>
              ))
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
