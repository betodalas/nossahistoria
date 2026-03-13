import { useState } from 'react'
interface Props { moment: any; onClose: () => void }
export default function ShareMoment({ moment, onClose }: Props) {
  const [copied, setCopied] = useState(false)
  const shareText = `💍 ${moment.title}\n📅 ${new Date(moment.moment_date).toLocaleDateString('pt-BR')}\n\n${moment.description || ''}\n\n${moment.music_name ? `♪ ${moment.music_name}` : ''}\n\nCompartilhado com amor pelo Nossa História 💜`
  const handleCopy = () => { navigator.clipboard.writeText(shareText); setCopied(true); setTimeout(() => setCopied(false), 2000) }
  const handleWhatsApp = () => window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, '_blank')
  const handleNativeShare = async () => { if (navigator.share) { await navigator.share({ title: moment.title, text: shareText }) } else { handleCopy() } }
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" style={{background:'rgba(0,0,0,0.85)'}}>
      <div className="w-full max-w-md rounded-t-3xl p-6" style={{background:'#1a1030'}}>
        <div className="text-center mb-5">
          <div className="text-3xl mb-2">💌</div>
          <h2 className="text-base font-bold text-white">Compartilhar momento</h2>
          <p className="text-xs text-white/40 mt-1">Mostre este momento para a família</p>
        </div>
        <div className="rounded-2xl p-4 mb-5 border border-white/10" style={{background:'rgba(255,255,255,0.05)'}}>
          <p className="text-sm font-semibold text-white mb-1">{moment.title}</p>
          <p className="text-xs text-white/40 mb-2">{new Date(moment.moment_date).toLocaleDateString('pt-BR', {day:'numeric',month:'long',year:'numeric'})}</p>
          {moment.description && <p className="text-xs text-white/60 line-clamp-2">{moment.description}</p>}
          {moment.music_name && <p className="text-xs text-violet-300 mt-1">♪ {moment.music_name}</p>}
        </div>
        <button onClick={handleNativeShare} className="w-full py-3 rounded-xl font-semibold text-sm mb-3" style={{background:'linear-gradient(135deg,#7c3aed,#be185d)',color:'white'}}>
          📤 Compartilhar
        </button>
        <button onClick={handleWhatsApp} className="w-full py-3 rounded-xl font-semibold text-sm mb-3" style={{background:'rgba(37,211,102,0.2)',border:'1px solid rgba(37,211,102,0.4)',color:'#25d366'}}>
          💬 Enviar pelo WhatsApp
        </button>
        <button onClick={handleCopy} className="w-full py-3 rounded-xl font-semibold text-sm mb-3" style={{background:'rgba(255,255,255,0.08)',border:'1px solid rgba(255,255,255,0.1)',color:'white'}}>
          {copied ? '✅ Copiado!' : '📋 Copiar texto'}
        </button>
        <button onClick={onClose} className="btn-secondary">Cancelar</button>
      </div>
    </div>
  )
}
