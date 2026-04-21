import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import { guestService } from '../services/api'

export default function PublicAlbum() {
  const { token } = useParams<{ token: string }>()
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  // Form state
  const [name, setName] = useState('')
  const [message, setMessage] = useState('')
  const [media, setMedia] = useState<string | null>(null)
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)

  useEffect(() => {
    if (!token) return
    // Apenas valida se o token existe, sem expor os posts
    guestService.getPublicPosts(token)
      .then(() => setLoading(false))
      .catch(() => { setNotFound(true); setLoading(false) })
  }, [token])

  const handleMedia = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const isVideo = file.type.startsWith('video/')
    setMediaType(isVideo ? 'video' : 'image')
    const reader = new FileReader()
    reader.onload = ev => setMedia(ev.target?.result as string)
    reader.readAsDataURL(file)
  }

  const handleSend = async () => {
    if (!name.trim() || !message.trim() || !token) return
    setSending(true)
    try {
      await guestService.createPublicPost(token, { name, message, photo: media, media_type: mediaType })
      setName(''); setMessage(''); setMedia(null)
      setSent(true)
    } catch {}
    setSending(false)
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{background:'#FFF0F3'}}>
        <p className="text-sm" style={{color:'#9B6B7A'}}>Carregando...</p>
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

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center px-6 text-center" style={{background:'#FFF0F3'}}>
        <div className="text-6xl mb-4">💜</div>
        <h2 className="text-lg font-bold mb-2" style={{color:'#3D1A2A'}}>Mensagem enviada!</h2>
        <p className="text-sm leading-relaxed" style={{color:'#9B6B7A'}}>
          O casal vai adorar receber sua mensagem especial 💍
        </p>
      </div>
    )
  }

  return (
    <div className="min-h-screen" style={{background:'#FFF0F3'}}>

      {/* Header */}
      <div className="rounded-b-3xl px-4 pt-8 pb-6 mb-6 text-center"
        style={{background:'linear-gradient(135deg,#C9A0B0,#7C4D6B)'}}>
        <div className="text-4xl mb-2">💍</div>
        <h1 className="text-lg font-bold text-white">Álbum dos noivos</h1>
        <p className="text-xs text-white/70 mt-1">Deixe uma mensagem especial para o casal 💜</p>
      </div>

      <div className="px-4 pb-10">
        <div className="rounded-2xl p-4" style={{background:'white', border:'1px solid #E8C4CE'}}>
          <p className="text-sm font-semibold mb-4" style={{color:'#3D1A2A'}}>Sua mensagem</p>

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
              style={{height:'120px'}}
              placeholder="Escreva uma mensagem especial..."
              value={message}
              onChange={e => setMessage(e.target.value)}
            />
          </div>

          <div className="mb-5">
            <label className="text-xs block mb-2" style={{color:'#9B6B7A'}}>Foto ou vídeo (opcional)</label>
            {media ? (
              <div className="relative">
                {mediaType === 'video' ? (
                  <video src={media} controls className="w-full rounded-xl" style={{maxHeight:'180px'}} />
                ) : (
                  <img src={media} className="w-full rounded-xl object-contain" style={{maxHeight:'180px'}} />
                )}
                <button onClick={() => setMedia(null)}
                  className="absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center text-sm"
                  style={{background:'rgba(61,26,42,0.7)', color:'white'}}>×</button>
              </div>
            ) : (
              <label className="flex items-center justify-center gap-2 w-full py-4 rounded-xl cursor-pointer text-sm"
                style={{background:'#FADADD', border:'2px dashed #E8C4CE', color:'#9B6B7A'}}>
                📷 Adicionar foto ou vídeo
                <input type="file" accept="image/*,video/*" className="hidden" onChange={handleMedia} />
              </label>
            )}
          </div>

          <button
            onClick={handleSend}
            disabled={!name.trim() || !message.trim() || sending}
            className="btn-primary disabled:opacity-40">
            {sending ? 'Enviando...' : 'Enviar mensagem'}
          </button>
        </div>
      </div>
    </div>
  )
}
