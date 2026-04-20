import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { guestService } from '../services/api'

export default function PublicAlbum() {
  const { token } = useParams<{ token: string }>()
  const [posts, setPosts] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)
  const [lightbox, setLightbox] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [photo, setPhoto] = useState<string | null>(null)
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!token) return
    guestService.getPublicPosts(token)
      .then(res => setPosts(res.data))
      .catch(() => setNotFound(true))
      .finally(() => setLoading(false))
  }, [token])

  const handlePhoto = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setPhoto(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSend = async () => {
    if (!name.trim() || !message.trim() || !token) return
    setSending(true)
    try {
      const res = await guestService.createPublicPost(token, { name, message, photo })
      setPosts(prev => [res.data, ...prev])
      setName(''); setMessage(''); setPhoto(null)
      setSent(true)
      setTimeout(() => setSent(false), 3000)
    } catch {}
    setSending(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background:'#FFF0F3'}}>
        <p className="text-sm" style={{color:'#9B6B7A'}}>Carregando álbum...</p>
      </div>
    )
  }

  if (notFound) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{background:'#FFF0F3'}}>
        <div className="text-5xl mb-4">💔</div>
        <h2 className="text-lg font-bold mb-2" style={{color:'#3D1A2A'}}>Álbum não encontrado</h2>
        <p className="text-sm" style={{color:'#9B6B7A'}}>Este link pode ter expirado ou ser inválido.</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{background:'#FFF0F3'}}>
      {lightbox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{background:'rgba(61,26,42,0.92)'}} onClick={() => setLightbox(null)}>
          <img src={lightbox} className="max-w-full max-h-full rounded-2xl object-contain" />
          <button className="absolute top-4 right-4 text-white text-2xl w-10 h-10 rounded-full flex items-center justify-center"
            style={{background:'rgba(255,255,255,0.2)'}} onClick={() => setLightbox(null)}>×</button>
        </div>
      )}

      {/* Header */}
      <div className="rounded-b-3xl px-4 pt-8 pb-6 mb-4 text-center"
        style={{background:'linear-gradient(135deg,#C9A0B0,#7C4D6B)'}}>
        <div className="text-4xl mb-2">💍</div>
        <h1 className="text-lg font-bold text-white">Álbum dos convidados</h1>
        <p className="text-xs text-white/70 mt-1">Deixe uma mensagem especial para o casal 💜</p>
      </div>

      <div className="px-4 pb-10">

        {/* Formulário de envio */}
        <div className="rounded-2xl p-4 mb-6" style={{background:'white', border:'1px solid #E8C4CE'}}>
          <p className="text-sm font-semibold mb-3" style={{color:'#3D1A2A'}}>Enviar mensagem</p>

          {sent && (
            <div className="rounded-xl p-3 mb-3 text-center text-sm font-semibold"
              style={{background:'#d1fae5', color:'#065f46'}}>
              ✅ Mensagem enviada com sucesso!
            </div>
          )}

          <div className="mb-3">
            <label className="text-xs block mb-1" style={{color:'#9B6B7A'}}>Seu nome</label>
            <input
              className="input-field"
              placeholder="Ex: Vó Maria"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>

          <div className="mb-3">
            <label className="text-xs block mb-1" style={{color:'#9B6B7A'}}>Mensagem para o casal</label>
            <textarea
              className="input-field resize-none"
              style={{height:'100px'}}
              placeholder="Escreva uma mensagem especial..."
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label className="text-xs block mb-2" style={{color:'#9B6B7A'}}>Foto (opcional)</label>
            {photo ? (
              <div className="relative">
                <img src={photo} className="w-full rounded-xl object-contain" style={{maxHeight:'180px'}} />
                <button onClick={() => setPhoto(null)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-sm"
                  style={{background:'rgba(61,26,42,0.7)', color:'white'}}>×</button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 w-full py-4 rounded-xl cursor-pointer text-sm"
                style={{background:'#FADADD', border:'2px dashed #E8C4CE', color:'#9B6B7A'}}>
                📷 Adicionar foto
                <input type="file" accept="image/*" className="hidden" onChange={handlePhoto} />
              </label>
            )}
          </div>

          <button
            onClick={handleSend}
            disabled={!name.trim() || !message.trim() || sending || sent}
            className="btn-primary disabled:opacity-40">
            {sent ? '✅ Enviado!' : sending ? 'Enviando...' : '💌 Enviar mensagem'}
          </button>
        </div>

        {/* Posts existentes */}
        {posts.length > 0 && (
          <>
            {/* Grid de fotos */}
            {posts.some(p => p.photo_url) && (
              <>
                <p className="section-label mb-3">Fotos enviadas</p>
                <div className="grid grid-cols-3 gap-2 mb-5">
                  {posts.filter(p => p.photo_url).map(p => (
                    <div key={p.id} className="aspect-square rounded-xl overflow-hidden cursor-pointer"
                      onClick={() => setLightbox(p.photo_url)}>
                      <img src={p.photo_url} className="w-full h-full object-cover" />
                    </div>
                  ))}
                </div>
              </>
            )}

            {/* Mensagens */}
            <p className="section-label mb-3">Mensagens ({posts.length})</p>
            {posts.map(p => (
              <div key={p.id} className="rounded-2xl p-4 mb-3"
                style={{background:'white', border:'1px solid #E8C4CE'}}>
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold text-white"
                    style={{background:'linear-gradient(135deg,#C9A0B0,#7C4D6B)'}}>
                    {p.name[0].toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-semibold" style={{color:'#3D1A2A'}}>{p.name}</p>
                    <p className="text-xs" style={{color:'#9B6B7A'}}>
                      {new Date(p.created_at).toLocaleDateString('pt-BR', {day:'numeric', month:'long'})}
                    </p>
                  </div>
                </div>
                <p className="text-sm leading-relaxed" style={{color:'#3D1A2A'}}>{p.message}</p>
                {p.photo_url && (
                  <img src={p.photo_url}
                    className="w-full rounded-xl mt-3 object-contain cursor-pointer"
                    style={{maxHeight:'200px', background:'#FFF0F3'}}
                    onClick={() => setLightbox(p.photo_url)} />
                )}
              </div>
            ))}
          </>
        )}

        {posts.length === 0 && (
          <div className="text-center py-8">
            <div className="text-3xl mb-2">📸</div>
            <p className="text-sm" style={{color:'#9B6B7A'}}>Seja o primeiro a deixar uma mensagem!</p>
          </div>
        )}
      </div>
    </div>
  )
}
