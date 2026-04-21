import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { momentsService } from '../services/api'
import { formatDateBR } from '../utils/dateUtils'
import { FREE_MOMENTS_LIMIT } from '../constants'
import Layout from '../components/Layout'
import MusicPlayer from '../components/MusicPlayer'
import ConfirmModal from '../components/ConfirmModal'

export default function Timeline() {
  const [moments, setMoments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [playingVoice, setPlayingVoice] = useState<string | null>(null)
  const [menuOpen, setMenuOpen] = useState<string | null>(null)
  const [deleting, setDeleting] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const { isPremium } = useAuth()
  const navigate = useNavigate()

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

  const fmtTime = (s: number) =>
    `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`

  const playVoice = (id: string, url: string) => {
    if (playingVoice === id) { setPlayingVoice(null); return }
    setPlayingVoice(id)
    const audio = new Audio(url)
    audio.play()
    audio.onended = () => setPlayingVoice(null)
  }

  const handleDelete = async () => {
    if (!confirmDeleteId) return
    setDeleting(confirmDeleteId)
    try {
      await momentsService.delete(confirmDeleteId)
      setMoments(prev => prev.filter(m => m.id !== confirmDeleteId))
    } catch {
      // silently fail — could add a toast here later
    } finally {
      setDeleting(null)
      setConfirmDeleteId(null)
      setMenuOpen(null)
    }
  }

  const openEdit = (m: any) => {
    setMenuOpen(null)
    navigate('/novo-momento', { state: { moment: m } })
  }

  return (
    <Layout>
      {/* Modal de confirmação de exclusão */}
      {confirmDeleteId && (
        <ConfirmModal
          icon="🗑️"
          title="Apagar momento?"
          description="Esta ação não pode ser desfeita."
          confirmLabel="Sim, apagar"
          loadingLabel="Apagando..."
          danger
          loading={deleting === confirmDeleteId}
          onConfirm={handleDelete}
          onCancel={() => { setConfirmDeleteId(null); setMenuOpen(null) }}
        />
      )}

      {/* Lightbox */}
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(61,26,42,0.85)' }} onClick={() => setLightbox(null)}>
          <img src={lightbox} className="max-w-full max-h-full rounded-2xl object-contain" alt="Foto do momento" />
          <button className="absolute top-4 right-4 w-10 h-10 rounded-full flex items-center justify-center text-xl"
            style={{ background: 'rgba(255,255,255,0.2)', color: '#3D1A2A' }}
            onClick={() => setLightbox(null)}>×</button>
        </div>
      )}

      {/* Overlay fechar menu */}
      {menuOpen && <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(null)} />}

      <div className="flex items-center justify-between px-4 py-4" style={{ borderBottom: '1px solid #E8C4CE' }}>
        <h2 className="text-base font-semibold" style={{ color: '#3D1A2A' }}>Linha do tempo</h2>
        {!isPremium && (
          <span className="pill-purple">{moments.length}/{FREE_MOMENTS_LIMIT} grátis</span>
        )}
      </div>

      <div className="px-4 py-4">
        {loading ? (
          <div className="text-center py-12 text-sm" style={{ color: '#9B6B7A' }}>Carregando...</div>
        ) : error ? (
          <div className="text-center py-12">
            <div className="text-4xl mb-3">⚠️</div>
            <p className="text-sm mb-3" style={{ color: '#9B6B7A' }}>{error}</p>
            <button onClick={loadMoments} className="btn-primary max-w-xs mx-auto text-sm">
              Tentar novamente
            </button>
          </div>
        ) : moments.length === 0 ? (
          <div className="flex flex-col items-center text-center pt-8 pb-6 px-2">

            {/* Ilustração SVG */}
            <svg width="180" height="140" viewBox="0 0 180 140" fill="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" style={{ marginBottom: '24px' }}>
              {/* Linha do tempo vertical */}
              <line x1="48" y1="18" x2="48" y2="122" stroke="#E8C4CE" strokeWidth="2.5" strokeLinecap="round" strokeDasharray="5 4" />
              {/* Ponto do topo */}
              <circle cx="48" cy="18" r="7" fill="url(#dot1)" />
              {/* Card 1 */}
              <rect x="64" y="8" width="96" height="36" rx="10" fill="white" stroke="#E8C4CE" strokeWidth="1.5" />
              <rect x="74" y="18" width="38" height="6" rx="3" fill="#FADADD" />
              <rect x="74" y="28" width="56" height="5" rx="2.5" fill="#F5E6EA" />
              {/* Ponto do meio */}
              <circle cx="48" cy="70" r="7" fill="url(#dot2)" />
              {/* Card 2 */}
              <rect x="64" y="60" width="96" height="36" rx="10" fill="white" stroke="#E8C4CE" strokeWidth="1.5" />
              <rect x="74" y="70" width="50" height="6" rx="3" fill="#FADADD" />
              <rect x="74" y="80" width="40" height="5" rx="2.5" fill="#F5E6EA" />
              {/* Ponto "+" no final */}
              <circle cx="48" cy="122" r="11" fill="url(#addBtn)" />
              <line x1="48" y1="117" x2="48" y2="127" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              <line x1="43" y1="122" x2="53" y2="122" stroke="white" strokeWidth="2.5" strokeLinecap="round" />
              {/* Coração flutuante */}
              <text x="148" y="118" fontSize="18" textAnchor="middle">💍</text>
              <defs>
                <linearGradient id="dot1" x1="41" y1="11" x2="55" y2="25" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#E8C4CE" /><stop offset="1" stopColor="#C9A0B0" />
                </linearGradient>
                <linearGradient id="dot2" x1="41" y1="63" x2="55" y2="77" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#E8C4CE" /><stop offset="1" stopColor="#C9A0B0" />
                </linearGradient>
                <linearGradient id="addBtn" x1="37" y1="111" x2="59" y2="133" gradientUnits="userSpaceOnUse">
                  <stop stopColor="#C9A0B0" /><stop offset="1" stopColor="#7C4D6B" />
                </linearGradient>
              </defs>
            </svg>

            <h3 className="text-base font-bold mb-2" style={{ color: '#3D1A2A' }}>
              A história de vocês começa aqui
            </h3>
            <p className="text-sm leading-relaxed mb-1" style={{ color: '#7C4D6B', maxWidth: '280px' }}>
              Registre o primeiro momento de vocês.
            </p>
            <p className="text-xs leading-relaxed mb-6" style={{ color: '#9B6B7A', maxWidth: '260px' }}>
              Pode ser uma viagem, um jantar especial, a primeira vez que se viram — qualquer memória que mereça ser guardada.
            </p>

            {/* Sugestões de exemplos */}
            <div className="flex flex-wrap justify-center gap-2 mb-6">
              {['✈️ Viagem', '🍽️ Jantar', '🎬 Primeiro encontro', '🏠 Nova casa', '🎉 Conquista'].map(tag => (
                <span key={tag} className="text-xs px-3 py-1.5 rounded-full"
                  style={{ background: '#FADADD', color: '#7C4D6B', border: '1px solid #E8C4CE' }}>
                  {tag}
                </span>
              ))}
            </div>

            <button
              onClick={() => navigate('/novo-momento')}
              className="btn-primary"
              style={{ maxWidth: '240px' }}>
              + Adicionar primeiro momento
            </button>
          </div>
        ) : (
          <div className="relative pl-7">
            <div className="absolute left-[6px] top-0 bottom-0 w-0.5"
              style={{ background: 'linear-gradient(to bottom, #E8C4CE, #C9A0B0)' }} />

            {moments.map((m) => (
              <div key={m.id} className="relative mb-4">
                <div className="absolute -left-7 top-2 w-4 h-4 rounded-full"
                  style={{ background: 'linear-gradient(135deg,#E8C4CE,#C9A0B0)', border: '2px solid #FFF0F3' }} />
                <div className="rounded-2xl p-4" style={{ background: 'white', border: '1px solid #E8C4CE' }}>

                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <p className="text-xs" style={{ color: '#9B6B7A' }}>{formatDateBR(new Date(m.moment_date))}</p>
                      <p className="text-sm font-semibold mt-1" style={{ color: '#3D1A2A' }}>{m.title}</p>
                    </div>
                    <div className="relative z-40">
                      <button
                        onClick={() => setMenuOpen(menuOpen === m.id ? null : m.id)}
                        className="w-8 h-8 flex items-center justify-center rounded-full ml-2"
                        style={{ color: '#C9A0B0', fontSize: '18px', lineHeight: 1 }}>
                        ⋯
                      </button>
                      {menuOpen === m.id && (
                        <div className="absolute right-0 top-9 rounded-xl shadow-lg overflow-hidden z-50"
                          style={{ background: 'white', border: '1px solid #E8C4CE', minWidth: '140px' }}>
                          <button onClick={() => openEdit(m)}
                            className="w-full text-left px-4 py-3 text-sm flex items-center gap-2"
                            style={{ color: '#3D1A2A' }}>
                            ✏️ Editar
                          </button>
                          <button onClick={() => { setMenuOpen(null); setConfirmDeleteId(m.id) }}
                            className="w-full text-left px-4 py-3 text-sm flex items-center gap-2 border-t"
                            style={{ color: '#e11d48', borderColor: '#E8C4CE' }}>
                            🗑️ Apagar
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {m.description && (
                    <p className="text-xs mt-1" style={{ color: '#9B6B7A' }}>{m.description}</p>
                  )}

                  {m.photo_url && (
                    <div className="mt-3 rounded-xl overflow-hidden cursor-pointer"
                      onClick={() => setLightbox(m.photo_url)}>
                      <img src={m.photo_url} className="w-full object-contain rounded-xl"
                        style={{ maxHeight: '300px', background: '#FFF0F3' }} alt="Foto" />
                    </div>
                  )}

                  {m.voice_url && (
                    <div className="mt-3 flex items-center gap-3 rounded-xl px-3 py-2.5"
                      style={{ background: '#FADADD', border: '1px solid #E8C4CE' }}>
                      <button onClick={() => playVoice(m.id, m.voice_url)}
                        className="w-9 h-9 rounded-full flex items-center justify-center text-base flex-shrink-0"
                        style={{ background: 'linear-gradient(135deg,#C9A0B0,#7C4D6B)', color: '#3D1A2A' }}>
                        {playingVoice === m.id ? '⏸' : '🎙️'}
                      </button>
                      <div className="flex-1">
                        <p className="text-xs font-semibold" style={{ color: '#7C4D6B' }}>Mensagem de voz</p>
                        {m.voice_duration > 0 && (
                          <span className="text-xs" style={{ color: '#9B6B7A' }}>{fmtTime(m.voice_duration)}</span>
                        )}
                      </div>
                    </div>
                  )}

                  {m.music_name && <MusicPlayer musicName={m.music_name} />}
                </div>
              </div>
            ))}

            {!isPremium && moments.length >= FREE_MOMENTS_LIMIT && (
              <div className="relative mb-4">
                <div className="absolute -left-7 top-2 w-4 h-4 rounded-full"
                  style={{ background: '#E8C4CE', border: '2px solid #FFF0F3' }} />
                <div className="rounded-2xl p-4 text-center cursor-pointer"
                  style={{ background: 'white', border: '1.5px dashed #C9A0B0' }}
                  onClick={() => navigate('/premium')}>
                  <p className="text-sm" style={{ color: '#7C4D6B' }}>
                    + Limite atingido · upgrade para continuar
                  </p>
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
