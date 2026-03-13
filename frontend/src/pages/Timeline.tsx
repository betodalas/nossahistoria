import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import MusicPlayer from '../components/MusicPlayer'
import ShareMoment from '../components/ShareMoment'
import VoiceRecorder from '../components/VoiceRecorder'

export default function Timeline() {
  const [moments, setMoments] = useState<any[]>([])
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [sharing, setSharing] = useState<any>(null)
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const { isPremium } = useAuth()
  const navigate = useNavigate()
  const FREE_LIMIT = 10

  useEffect(() => {
    setMoments(JSON.parse(localStorage.getItem('moments') || '[]'))
  }, [])

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('pt-BR', { day: 'numeric', month: 'long', year: 'numeric' })

  const fmtTime = (s: number) => `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`

  const playVoice = (id: string, url: string) => {
    if (playingVoice === id) { setPlayingVoice(null); return }
    setPlayingVoice(id)
    const audio = new Audio(url)
    audio.play()
    audio.onended = () => setPlayingVoice(null)
  }

  return (
    <Layout>
      {sharing && <ShareMoment moment={sharing} onClose={() => setSharing(null)} />}

      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{background:'rgba(0,0,0,0.9)'}} onClick={() => setLightbox(null)}>
          <img src={lightbox} className="max-w-full max-h-full rounded-2xl object-contain" />
          <button className="absolute top-4 right-4 text-white text-2xl w-10 h-10 rounded-full flex items-center justify-center"
            style={{background:'rgba(255,255,255,0.15)'}} onClick={() => setLightbox(null)}>×</button>
        </div>
      )}

      <div className="flex items-center justify-between px-4 py-4 border-b border-white/10">
        <h2 className="text-base font-semibold text-white">Linha do tempo</h2>
        {!isPremium && <span className="pill-purple">{moments.length}/{FREE_LIMIT} grátis</span>}
      </div>

      <div className="px-4 py-4">
        {moments.length === 0 ? (
          <div className="text-center text-white/30 py-12">
            <div className="text-4xl mb-3">📖</div>
            <p className="text-sm">Nenhum momento ainda</p>
            <p className="text-xs mt-1">Adicione o primeiro momento de vocês!</p>
          </div>
        ) : (
          <div className="relative pl-7">
            <div className="absolute left-[6px] top-0 bottom-0 w-0.5"
              style={{background:'linear-gradient(to bottom,#7c3aed,#be185d)'}} />

            {moments.map((m) => (
              <div key={m.id} className="relative mb-4">
                <div className="absolute -left-7 top-2 w-4 h-4 rounded-full border-2 border-violet-950"
                  style={{background:'linear-gradient(135deg,#7c3aed,#be185d)'}} />
                <div className="rounded-2xl p-4 border border-white/10" style={{background:'#1a1030'}}>
                  <p className="text-xs text-white/30">{formatDate(m.moment_date)}</p>
                  <p className="text-sm font-semibold text-purple-100 mt-1">{m.title}</p>
                  {m.description && <p className="text-xs text-white/50 mt-1">{m.description}</p>}

                  {m.photo_url && (
                    <div className="mt-3 rounded-xl overflow-hidden cursor-pointer"
                      onClick={() => setLightbox(m.photo_url)}>
                      <img src={m.photo_url} className="w-full object-contain rounded-xl"
                        style={{maxHeight:'300px', background:'#0f0a1a'}} />
                      <p className="text-xs text-white/30 text-center mt-1">toque para ampliar</p>
                    </div>
                  )}

                  {/* Player de voz */}
                  {m.voice_audio && (
                    <div className="mt-3 flex items-center gap-3 rounded-xl px-3 py-2.5"
                      style={{background:'rgba(124,58,237,0.15)', border:'1px solid rgba(124,58,237,0.25)'}}>
                      <button
                        onClick={() => playVoice(m.id, m.voice_audio)}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0"
                        style={{background:'linear-gradient(135deg,#7c3aed,#be185d)'}}>
                        {playingVoice === m.id ? '⏸' : '🎙️'}
                      </button>
                      <div className="flex-1">
                        <p className="text-xs text-violet-300 font-semibold">Mensagem de voz</p>
                        {playingVoice === m.id ? (
                          <div className="flex items-center gap-0.5 mt-1">
                            {[1,2,3,4,5,6].map(i => (
                              <div key={i} className="w-1 rounded-full animate-bounce"
                                style={{background:'#7c3aed', height:`${4+(i%3)*5}px`, animationDelay:`${i*0.08}s`}} />
                            ))}
                          </div>
                        ) : (
                          <div className="w-full h-1 rounded-full mt-1.5" style={{background:'rgba(255,255,255,0.1)'}}>
                            <div className="h-full w-full rounded-full" style={{background:'rgba(124,58,237,0.4)'}} />
                          </div>
                        )}
                      </div>
                      {m.voice_duration > 0 && (
                        <span className="text-xs text-white/30">{fmtTime(m.voice_duration)}</span>
                      )}
                    </div>
                  )}

                  {m.music_name && <MusicPlayer musicName={m.music_name} />}

                  <button onClick={() => setSharing(m)} className="w-full mt-3 py-2 rounded-xl text-xs font-semibold"
                    style={{background:'rgba(255,255,255,0.06)', color:'rgba(255,255,255,0.4)', border:'1px solid rgba(255,255,255,0.08)'}}>
                    📤 Compartilhar com família
                  </button>
                </div>
              </div>
            ))}

            {!isPremium && moments.length >= FREE_LIMIT && (
              <div className="relative mb-4">
                <div className="absolute -left-7 top-2 w-4 h-4 rounded-full border-2 border-white/10"
                  style={{background:'#1e1035'}} />
                <div className="border border-dashed border-violet-500/40 rounded-2xl p-4 text-center cursor-pointer"
                  style={{background:'#130922'}} onClick={() => navigate('/premium')}>
                  <p className="text-sm text-violet-300">+ Limite atingido · upgrade para continuar</p>
                </div>
              </div>
            )}
          </div>
        )}

        <button className="btn-primary mt-2" onClick={() => navigate('/novo-momento')}>
          + Adicionar momento
        </button>
      </div>
    </Layout>
  )
}
