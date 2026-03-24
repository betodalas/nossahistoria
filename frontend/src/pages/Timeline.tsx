import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { momentsService } from '../services/api'
import Layout from '../components/Layout'
import MusicPlayer from '../components/MusicPlayer'

export default function Timeline() {
  const [moments, setMoments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const { isPremium } = useAuth()
  const navigate = useNavigate()
  const FREE_LIMIT = 5

  const loadMoments = () => {
    setLoading(true)
    setError('')
    momentsService.getAll()
      .then(res => setMoments(res.data))
      .catch((err) => {
        const msg = err?.response?.data?.error || ''
        setError(msg || 'Erro ao carregar momentos.')
        setMoments([])
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { loadMoments() }, [])

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

  const handleDelete = async (id: string) => {
    if (!confirm('Apagar este momento? Esta ação não pode ser desfeita.')) return
    setDeleting(id)
    setMenuOpen(null)
    try {
      await momentsService.delete(id)
      setMoments(prev => prev.filter(m => m.id !== id))
    } catch {
      alert('Erro ao apagar momento.')
    } finally {
      setDeleting(null)
    }
  }

  const handleEdit = (m: any) => {
    setMenuOpen(null)
    navigate('/novo-momento', { state: { moment: m } })
  }

  return (
    <Layout>
      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{background:'rgba(61,26,42,0.85)'}} onClick={() => setLightbox(null)}>
          <img src={lightbox} className="max-w-full max-h-full rounded-2xl object-contain" />
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-xl"
            style={{background:'rgba(255,255,255,0.2)', color:'#3D1A2A'}} onClick={() => setLightbox(null)}>×</button>
        </div>
      )}

      {/* Menu overlay */}
      {menuOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(null)} />
      )}

      <div className="flex items-center justify-between px-4 py-4" style={{borderBottom:'1px solid #E8C4CE'}}>
        <h2 className="text-base font-semibold" style={{color:'#3D1A2A'}}>Linha do tempo</h2>
        {!isPremium && <span className="pill-purple">{moments.length}/{FREE_LIMIT} grátis</span>}
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <div className="text-center py-12 text-sm" style={{color:'#9B6B7A'}}>Carregando...</div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-sm mb-3" style={{color:'#9B6B7A'}}>{error}</p>
            <button onClick={loadMoments} className="btn-primary max-w-xs mx-auto text-sm">Tentar novamente</button>
          </div>
        ) : moments.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">📖</div>
            <p className="text-sm" style={{color:'#9B6B7A'}}>Nenhum momento ainda</p>
            <p className="text-xs mt-1" style={{color:'#9B6B7A'}}>Adicione o primeiro momento de vocês!</p>
          </div>
        ) : (
          <div className="relative pl-7">
            <div className="absolute left-[6px] top-0 bottom-0 w-0.5"
              style={{background:'linear-gradient(to bottom, #E8C4CE, #C9A0B0)'}} />

            {moments.map((m) => (
              <div key={m.id} className="relative mb-4">
                <div className="absolute -left-7 top-2 w-4 h-4 rounded-full"
                  style={{background:'linear-gradient(135deg,#E8C4CE,#C9A0B0)', border:'2px solid #FFF0F3'}} />
                <div className="rounded-2xl p-4" style={{background:'white', border:'1px solid #E8C4CE',
                  opacity: deleting === m.id ? 0.4 : 1}}>

                  {/* Header com menu */}
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs" style={{color:'#9B6B7A'}}>{formatDate(m.moment_date)}</p>
                      <p className="text-sm font-semibold mt-1" style={{color:'#3D1A2A'}}>{m.title}</p>
                    </div>
                    <div className="relative">
                      <button
                        onClick={() => setMenuOpen(menuOpen === m.id ? null : m.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-full text-lg"
                        style={{color:'#C9A0B0'}}>⋯</button>
                      {menuOpen === m.id && (
                        <div className="absolute right-0 top-9 z-50 rounded-xl shadow-lg overflow-hidden"
                          style={{background:'white', border:'1px solid #E8C4CE', minWidth:'140px'}}>
                          <button onClick={() => handleEdit(m)}
                            className="w-full px-4 py-3 text-left text-sm flex items-center gap-2"
                            style={{color:'#3D1A2A', borderBottom:'1px solid #F5E6EA'}}>
                            ✏️ Editar
                          </button>
                          <button onClick={() => handleDelete(m.id)}
                            className="w-full px-4 py-3 text-left text-sm flex items-center gap-2"
                            style={{color:'#e53e3e'}}>
                            🗑️ Apagar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {m.description && <p className="text-xs mt-1" style={{color:'#9B6B7A'}}>{m.description}</p>}

                  {m.photo_url && (
                    <div className="mt-3 rounded-xl overflow-hidden cursor-pointer" onClick={() => setLightbox(m.photo_url)}>
                      <img src={m.photo_url} className="w-full object-contain rounded-xl" style={{maxHeight:'300px', background:'#FFF0F3'}} />
                    </div>
                  )}

                  {m.voice_url && (
                    <div className="mt-3 flex items-center gap-3 rounded-xl px-3 py-2.5"
                      style={{background:'#FADADD', border:'1px solid #E8C4CE'}}>
                      <button onClick={() => playVoice(m.id, m.voice_url)}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0"
                        style={{background:'linear-gradient(135deg,#C9A0B0,#7C4D6B)', color:'#3D1A2A'}}>
                        {playingVoice === m.id ? '⏸' : '🎙️'}
                      </button>
                      <div className="flex-1">
                        <p className="text-xs font-semibold" style={{color:'#7C4D6B'}}>Mensagem de voz</p>
                        {m.voice_duration > 0 && <span className="text-xs" style={{color:'#9B6B7A'}}>{fmtTime(m.voice_duration)}</span>}
                      </div>
                    </div>
                  )}

                  {m.music_name && <MusicPlayer musicName={m.music_name} />}
                </div>
              </div>
            ))}

            {!isPremium && moments.length >= FREE_LIMIT && (
              <div className="relative mb-4">
                <div className="absolute -left-7 top-2 w-4 h-4 rounded-full" style={{background:'#E8C4CE', border:'2px solid #FFF0F3'}} />
                <div className="rounded-2xl p-4 text-center cursor-pointer"
                  style={{background:'white', border:'1.5px dashed #C9A0B0'}}
                  onClick={() => navigate('/premium')}>
                  <p className="text-sm" style={{color:'#7C4D6B'}}>+ Limite atingido · upgrade para continuar</p>
                </div>
              </div>
            )}
          </div>
        )}
        <button className="btn-primary mt-2" onClick={() => navigate('/novo-momento')}>+ Adicionar momento</button>
      </div>
    </Layout>
  )
}
