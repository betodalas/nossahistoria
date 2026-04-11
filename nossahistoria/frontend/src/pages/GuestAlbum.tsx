import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import Layout from '../components/Layout'
import { guestService } from '../services/api'

export default function GuestAlbum() {
  const { couple } = useAuth()
  const navigate = useNavigate()
  const [tab, setTab] = useState<'album'|'convidar'>('album')
  const [posts, setPosts] = useState<any[]>([])
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)

  useEffect(() => {
    guestService.getAll().then(res => setPosts(res.data)).catch(() => {})
  }, [])

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setPhoto(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSend = async () => {
    if (!name.trim() || !message.trim()) return
    setSending(true)
    try {
      const res = await guestService.create({ name, message, photo })
      setPosts([res.data, ...posts])
      setName(''); setMessage(''); setPhoto(null)
      setSent(true)
      setTimeout(() => { setSent(false); setTab('album') }, 2000)
    } catch {}
    setSending(false)
  }

  const albumLink = `${window.location.origin}/album-convidados?casal=${encodeURIComponent(couple?.couple_name || '')}`

  const handleShareLink = () => {
    const msg = `💍 Olá! ${couple?.couple_name || 'O casal'} te convidou para deixar uma mensagem e foto no álbum especial deles!\n\nAcesse: ${albumLink}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handleCopyLink = () => {
    navigator.clipboard.writeText(albumLink)
    alert('Link copiado!')
  }

  return (
    <Layout>
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{background:'rgba(0,0,0,0.95)'}} onClick={() => setLightbox(null)}>
          <img src={lightbox} className="max-w-full max-h-full rounded-2xl object-contain" />
          <button className="absolute top-4 right-4 text-white text-2xl w-10 h-10 rounded-full flex items-center justify-center"
            style={{background:'rgba(255,255,255,0.15)'}} onClick={() => setLightbox(null)}>×</button>
        </div>
      )}

      <div className="rounded-b-3xl px-4 pt-5 pb-5 mb-4" style={{background:'linear-gradient(135deg,#2d1060,#6b21a8)'}}>
        <h2 className="text-base font-bold text-white text-center">Álbum dos convidados</h2>
        <p className="text-xs text-white/60 text-center mt-1">mensagens e fotos da família 💜</p>
      </div>

      <div className="flex px-4 mb-4 gap-2">
        {(['album','convidar'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className="flex-1 py-2 rounded-xl text-xs font-semibold transition-all"
            style={{
              background: tab === t ? 'linear-gradient(135deg,#7c3aed,#be185d)' : '#1a1030',
              color: tab === t ? 'white' : 'rgba(255,255,255,0.75)',
              border: tab === t ? 'none' : '1px solid rgba(255,255,255,0.08)'
            }}>
            {t === 'album' ? `📸 Álbum (${posts.length})` : '💌 Convidar família'}
          </button>
        ))}
      </div>

      <div className="px-4 pb-6">

        {/* TAB ÁLBUM */}
        {tab === 'album' && (
          <>
            {posts.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-4xl mb-3">📸</div>
                <p className="text-sm text-white/60">Nenhuma mensagem ainda</p>
                <p className="text-xs text-white/20 mt-1">Convide a família para deixar uma mensagem!</p>
                <button className="btn-primary mt-6 max-w-xs mx-auto" onClick={() => setTab('convidar')}>
                  Convidar agora 💌
                </button>
              </div>
            ) : (
              <>
                {/* Grid de fotos */}
                {posts.some(p => p.photo) && (
                  <>
                    <p className="section-label mb-3">Fotos enviadas</p>
                    <div className="grid grid-cols-3 gap-2 mb-5">
                      {posts.filter(p => p.photo).map(p => (
                        <div key={p.id} className="aspect-square rounded-xl overflow-hidden cursor-pointer"
                          onClick={() => setLightbox(p.photo)}>
                          <img src={p.photo} className="w-full h-full object-cover" />
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {/* Mensagens */}
                <p className="section-label mb-3">Mensagens</p>
                {posts.map(p => (
                  <div key={p.id} className="rounded-2xl p-4 mb-3 border border-white/8"
                    style={{background:'#1a1030'}}>
                    <div className="flex items-center gap-3 mb-2">
                      <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold"
                        style={{background:'linear-gradient(135deg,#7c3aed,#be185d)'}}>
                        {p.name[0].toUpperCase()}
                      </div>
                      <div>
                        <p className="text-sm font-semibold text-white">{p.name}</p>
                        <p className="text-xs text-white/60">
                          {new Date(p.date).toLocaleDateString('pt-BR', {day:'numeric',month:'long'})}
                        </p>
                      </div>
                    </div>
                    <p className="text-sm text-purple-100 leading-relaxed">{p.message}</p>
                    {p.photo && (
                      <img src={p.photo}
                        className="w-full rounded-xl mt-3 object-contain cursor-pointer"
                        style={{maxHeight:'200px', background:'#0f0a1a'}}
                        onClick={() => setLightbox(p.photo)} />
                    )}
                  </div>
                ))}
              </>
            )}
          </>
        )}

        {/* TAB CONVIDAR */}
        {tab === 'convidar' && (
          <>
            <div className="rounded-2xl p-4 mb-4 border border-violet-500/25"
              style={{background:'rgba(124,58,237,0.1)'}}>
              <p className="text-xs text-violet-300 font-bold mb-1">Como funciona?</p>
              <p className="text-xs text-white/50 leading-relaxed">
                Envie o link para família e amigos. Eles abrem no celular, escrevem uma mensagem, enviam uma foto — e aparece aqui no álbum de vocês 💜
              </p>
            </div>

            <button onClick={handleShareLink}
              className="w-full py-4 rounded-2xl font-bold text-sm mb-3 flex items-center justify-center gap-3"
              style={{background:'rgba(37,211,102,0.15)',border:'2px solid rgba(37,211,102,0.4)',color:'#25d366'}}>
              <span className="text-2xl">💬</span>
              <div className="text-left">
                <p className="font-bold">Compartilhar pelo WhatsApp</p>
                <p className="text-xs opacity-70">Envia o link direto para a família</p>
              </div>
            </button>

            <button onClick={handleCopyLink}
              className="w-full py-3 rounded-2xl font-semibold text-sm mb-5"
              style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'white'}}>
              🔗 Copiar link do álbum
            </button>

            <div className="border-t border-white/10 pt-5">
              <p className="text-xs text-white/70 text-center mb-4">Ou adicione uma mensagem agora</p>
              <div className="mb-3">
                <label className="text-xs text-white/70 block mb-1">Seu nome</label>
                <input className="input-field" placeholder="Ex: Vó Maria" value={name} onChange={e => setName(e.target.value)} />
              </div>
              <div className="mb-3">
                <label className="text-xs text-white/70 block mb-1">Mensagem para o casal</label>
                <textarea className="input-field resize-none" style={{height:'100px'}}
                  placeholder="Escreva uma mensagem especial..."
                  value={message} onChange={e => setMessage(e.target.value)} />
              </div>
              <div className="mb-4">
                <label className="text-xs text-white/70 block mb-2">Foto (opcional)</label>
                {photo ? (
                  <div className="relative">
                    <img src={photo} className="w-full rounded-xl object-contain" style={{maxHeight:'180px'}} />
                    <button onClick={() => setPhoto(null)}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-sm"
                      style={{background:'rgba(0,0,0,0.7)',color:'white'}}>×</button>
                  </div>
                ) : (
                  <label className="flex items-center justify-center gap-2 w-full py-4 rounded-xl cursor-pointer text-sm"
                    style={{background:'rgba(255,255,255,0.05)',border:'2px dashed rgba(255,255,255,0.1)',color:'rgba(255,255,255,0.65)'}}>
                    📷 Adicionar foto
                    <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
                  </label>
                )}
              </div>
              <button onClick={handleSend} disabled={!name.trim() || !message.trim() || sending || sent}
                className="btn-primary disabled:opacity-40">
                {sent ? '✅ Enviado!' : sending ? 'Enviando...' : '💌 Enviar mensagem'}
              </button>
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
