import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { questionsService } from '../services/api'
import Layout from '../components/Layout'

const ALL_QUESTIONS = [
  "Qual foi o momento em que você soube que queria ficar com essa pessoa?",
  "Qual é a sua memória favorita dos primeiros meses juntos?",
  "O que você mais admira no seu parceiro(a)?",
  "Qual foi a primeira coisa que você notou nele(a)?",
  "Qual viagem dos sonhos vocês fariam juntos?",
  "O que te faz sentir mais amado(a) por ele(a)?",
  "Qual é o hábito dele(a) que você acha mais fofo?",
  "Como você se sentiu no primeiro beijo de vocês?",
  "Qual música te lembra automaticamente dele(a)?",
  "O que você quer que ele(a) saiba mas nunca disse?",
  "Qual é o seu momento favorito do dia com ele(a)?",
  "Como você descreveria nosso relacionamento em 3 palavras?",
  "Qual foi o dia mais especial que vocês viveram juntos?",
  "O que você imagina para vocês daqui 10 anos?",
  "Qual é o maior sonho que vocês têm juntos?",
  "O que ele(a) faz que te deixa com borboletas no estômago?",
  "Qual é a coisa mais engraçada que já aconteceu com vocês?",
  "O que você aprendeu com esse relacionamento?",
  "Como era sua vida antes dele(a) entrar?",
  "Qual é o seu lugar favorito para estar com ele(a)?",
  "O que você faria diferente se pudesse voltar ao início?",
  "Qual é o melhor presente que ele(a) já te deu (não precisa ser material)?",
  "Como ele(a) te surpreendeu de um jeito que você não esperava?",
  "Qual é a coisa que mais te emociona no nosso relacionamento?",
  "Se você pudesse descrever nosso amor em uma cena de filme, qual seria?",
  "O que você mais quer compartilhar com ele(a) no futuro?",
  "Qual é o jeito favorito que ele(a) demonstra amor por você?",
  "O que você contaria para os seus filhos sobre como vocês se apaixonaram?",
  "Qual é o cheiro, som ou imagem que te faz lembrar imediatamente dele(a)?",
  "O que você diria para ele(a) se soubesse que é a última vez?",
]

const getTodayQuestion = () => {
  const today = new Date()
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000)
  return ALL_QUESTIONS[dayOfYear % ALL_QUESTIONS.length]
}

const mapResponse = (data: any, myUserId: string | undefined) => {
  const q = data?.question
  const answers = data?.answers || []
  const myAnswerObj = myUserId
    ? answers.find((a: any) => String(a.user_id) === String(myUserId))
    : answers[0]
  const partnerAnswerObj = myUserId
    ? answers.find((a: any) => String(a.user_id) !== String(myUserId))
    : answers[1]
  return {
    id: q?.id,
    question: q?.text || q?.question,
    myAnswer: myAnswerObj?.answer || null,
    partnerAnswer: partnerAnswerObj?.answer || null,
    history: data?.history || [],
  }
}

export default function Questions() {
  const { couple, user } = useAuth()
  const [answer, setAnswer] = useState('')
  const [revealed, setRevealed] = useState(false)
  const [tab, setTab] = useState<'hoje'|'historico'>('hoje')
  const [currentQuestion, setCurrentQuestion] = useState<any>(null)
  const [history, setHistory] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const todayQuestion = currentQuestion?.question || getTodayQuestion()
  const saved = !!currentQuestion?.myAnswer
  const partnerAnswer = currentQuestion?.partnerAnswer || null

  useEffect(() => {
    loadQuestion()
  }, [])

  const loadQuestion = async () => {
    setLoading(true)
    setError('')
    try {
      const res = await questionsService.getCurrent()
      const data = res.data
      // Se banco vazio, faz seed automático e tenta de novo
      if (data?.done || !data?.question) {
        await fetch(`${import.meta.env.VITE_API_URL || 'https://nossahistoria-xtjq.onrender.com/api'}/questions/seed`, { method: 'POST' }).catch(() => {})
        const res2 = await questionsService.getCurrent()
        const data2 = res2.data
        if (data2?.question) {
          const mapped = mapResponse(data2, user?.id)
          setCurrentQuestion(mapped)
          if (mapped.myAnswer) setAnswer(mapped.myAnswer)
          if (data2?.history) setHistory(data2.history)
        }
        return
      }
      const mapped = mapResponse(data, user?.id)
      setCurrentQuestion(mapped)
      if (mapped.myAnswer) setAnswer(mapped.myAnswer)
      if (data?.history) setHistory(data.history)
    } catch {
      setError('Erro ao carregar pergunta. Verifique sua conexão.')
    } finally {
      setLoading(false)
    }
  }

  const saveAnswer = async () => {
    if (!answer.trim()) return
    if (!currentQuestion?.id) {
      setError('Pergunta não carregada. Tente recarregar a página.')
      return
    }
    setSaving(true)
    setError('')
    try {
      await questionsService.answer(currentQuestion.id, answer)
      // Recarrega para pegar estado atualizado (inclui resposta do parceiro se já respondeu)
      const res = await questionsService.getCurrent()
      const mapped = mapResponse(res.data, user?.id)
      setCurrentQuestion(mapped)
      if (res.data?.history) setHistory(res.data.history)
    } catch (err: any) {
      const msg = err?.response?.data?.error || err?.response?.data?.message || ''
      setError(msg || 'Erro ao salvar resposta. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Layout>
      <div className="rounded-b-3xl px-4 pt-5 pb-5 mb-4" style={{background:'linear-gradient(135deg,#2d1060,#6b21a8)'}}>
        <h2 className="text-base font-bold text-white text-center">Perguntas do casal</h2>
        <p className="text-xs text-white/60 text-center mt-1">uma pergunta nova todo dia 💜</p>
      </div>

      <div className="flex px-4 mb-4 gap-2">
        {(['hoje','historico'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: tab === t ? 'linear-gradient(135deg,#7c3aed,#be185d)' : '#1a1030',
              color: tab === t ? 'white' : 'rgba(255,255,255,0.4)',
              border: tab === t ? 'none' : '1px solid rgba(255,255,255,0.08)'
            }}>
            {t === 'hoje' ? '✨ Hoje' : `📖 Histórico (${history.length})`}
          </button>
        ))}
      </div>

      <div className="px-4 pb-6">

        {error && (
          <div className="mb-4 px-3 py-2 rounded-xl text-sm text-center"
            style={{background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5'}}>
            {error}
            <button onClick={loadQuestion} className="block mx-auto mt-2 text-xs underline text-white/60">Tentar novamente</button>
          </div>
        )}

        {tab === 'hoje' && (
          <>
            <div className="flex items-center justify-between mb-4 px-1">
              <div className="flex items-center gap-2">
                <span className="text-2xl">🔥</span>
                <div>
                  <p className="text-sm font-bold text-white">{history.length} dias respondidos</p>
                  <p className="text-xs text-white/60">continue respondendo!</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-white/60">{new Date().toLocaleDateString('pt-BR', {weekday:'long'})}</p>
                <p className="text-xs text-white/50">{new Date().toLocaleDateString('pt-BR')}</p>
              </div>
            </div>

            {loading ? (
              <div className="text-center py-8 text-white/40 text-sm">Carregando pergunta...</div>
            ) : !currentQuestion ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">💬</div>
                <p className="text-sm text-white/50">Carregando perguntas...</p>
              </div>
            ) : (
              <>
                <div className="rounded-2xl p-5 mb-4 border border-violet-500/30"
                  style={{background:'rgba(124,58,237,0.15)'}}>
                  <div className="flex items-center gap-2 mb-3">
                    <span className="text-lg">💬</span>
                    <span className="text-xs font-bold text-violet-300 uppercase tracking-widest">Pergunta de hoje</span>
                  </div>
                  <p className="text-base text-white font-medium leading-relaxed">{todayQuestion}</p>
                </div>

                <div className="mb-4">
                  <label className="text-xs text-white/60 block mb-2">Sua resposta</label>
                  <textarea
                    className="input-field resize-none"
                    style={{height:'120px'}}
                    placeholder="Escreva o que sente de verdade..."
                    value={answer}
                    onChange={e => setAnswer(e.target.value)}
                    disabled={saved}
                  />
                </div>

                {!saved ? (
                  <button onClick={saveAnswer} disabled={!answer.trim() || saving} className="btn-primary disabled:opacity-40 mb-4">
                    {saving ? '💌 Salvando...' : '💌 Salvar resposta'}
                  </button>
                ) : (
                  <div className="rounded-xl p-3 mb-4 text-center"
                    style={{background:'rgba(52,211,153,0.15)', border:'1px solid rgba(52,211,153,0.3)'}}>
                    <p className="text-xs text-emerald-400">✅ Resposta salva!</p>
                  </div>
                )}

                {saved && partnerAnswer && (
                  <div className="rounded-2xl p-4 border border-pink-500/25"
                    style={{background:'rgba(190,24,93,0.15)'}}>
                    <div className="flex items-center gap-2 mb-3">
                      <span className="text-base">💜</span>
                      <p className="text-xs font-bold text-pink-300">
                        {couple?.partner_name || 'Parceiro(a)'} respondeu
                      </p>
                    </div>
                    {!revealed ? (
                      <div className="text-center cursor-pointer py-2" onClick={() => setRevealed(true)}>
                        <p className="text-sm text-purple-100 leading-relaxed select-none"
                          style={{filter:'blur(6px)'}}>
                          {partnerAnswer}
                        </p>
                        <p className="text-xs text-white/60 mt-3">👆 toque para revelar</p>
                      </div>
                    ) : (
                      <p className="text-sm text-purple-100 leading-relaxed">{partnerAnswer}</p>
                    )}
                  </div>
                )}

                {saved && !partnerAnswer && (
                  <div className="rounded-2xl p-4 border border-white/10 text-center"
                    style={{background:'rgba(255,255,255,0.05)'}}>
                    <span className="text-2xl block mb-2">⏳</span>
                    <p className="text-xs text-white/50">
                      {couple?.partner_name || 'Parceiro(a)'} ainda não respondeu hoje
                    </p>
                    <p className="text-xs text-white/50 mt-1">Volte mais tarde 💜</p>
                  </div>
                )}

                {!saved && (
                  <p className="text-xs text-white/50 text-center mt-2">
                    Responda primeiro para ver o que {couple?.partner_name || 'o(a) parceiro(a)'} disse 💜
                  </p>
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
                <p className="text-sm text-white/50">Nenhuma resposta ainda</p>
                <p className="text-xs text-white/60 mt-1">Responda a pergunta de hoje!</p>
                <button className="btn-primary mt-6 max-w-xs mx-auto" onClick={() => setTab('hoje')}>
                  Responder agora ✨
                </button>
              </div>
            ) : (
              history.map((item: any, i: number) => (
                <div key={i} className="rounded-2xl p-4 mb-3 border border-white/8"
                  style={{background:'#1a1030'}}>
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs text-white/50">
                      {new Date(item.date || item.created_at).toLocaleDateString('pt-BR', {day:'numeric',month:'long',year:'numeric'})}
                    </span>
                  </div>
                  <p className="text-xs text-violet-300 italic mb-2">"{item.question || item.question_text}"</p>
                  <div className="space-y-2">
                    <div className="rounded-xl p-3" style={{background:'rgba(124,58,237,0.15)'}}>
                      <p className="text-xs text-white/60 mb-1">Você</p>
                      <p className="text-sm text-purple-100">{item.myAnswer || item.answer}</p>
                    </div>
                    {item.partnerAnswer && (
                      <div className="rounded-xl p-3" style={{background:'rgba(190,24,93,0.15)'}}>
                        <p className="text-xs text-white/60 mb-1">{couple?.partner_name || 'Parceiro(a)'}</p>
                        <p className="text-sm text-purple-100">{item.partnerAnswer}</p>
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </>
        )}
      </div>
    </Layout>
  )
}
