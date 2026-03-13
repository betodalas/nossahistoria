import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Invite() {
  const { user, couple, saveCouple } = useAuth()
  const navigate = useNavigate()
  const [partnerEmail, setPartnerEmail] = useState(couple?.partner_email || '')
  const [sent, setSent] = useState(false)

  const inviteLink = `https://nossahistoria.app/convite?de=${encodeURIComponent(user?.name || '')}&casal=${encodeURIComponent(couple?.couple_name || '')}`

  const handleWhatsApp = () => {
    const msg = `💍 Oi! Quero te convidar para o *Nossa História* — o app onde vamos registrar nossa história antes do casamento!\n\nAcesse o link abaixo para criar sua conta:\n${inviteLink}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handleCopyLink = () => { navigator.clipboard.writeText(inviteLink); alert('Link copiado!') }

  const handleSend = () => { saveCouple({ ...couple, partner_email: partnerEmail }); setSent(true) }

  return (
    <div className="min-h-screen flex flex-col" style={{background:'#0f0a1a'}}>
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
        <button onClick={() => navigate(-1)} className="text-violet-300 px-3 py-1.5 rounded-lg text-sm" style={{background:'#1e1035'}}>←</button>
        <h2 className="text-base font-semibold text-white">Convidar parceiro(a)</h2>
      </div>
      <div className="flex-1 p-4">
        <div className="text-center py-6">
          <div className="text-5xl mb-4">💌</div>
          <h2 className="text-lg font-bold text-white mb-2">Chame o(a) {couple?.partner_name || 'parceiro(a)'}</h2>
          <p className="text-sm text-white/50 leading-relaxed">Envie o convite para vocês dois usarem o app juntos</p>
        </div>
        <button onClick={handleWhatsApp} className="w-full py-4 rounded-2xl font-bold text-sm mb-3 flex items-center justify-center gap-3"
          style={{background:'rgba(37,211,102,0.15)',border:'2px solid rgba(37,211,102,0.4)',color:'#25d366'}}>
          <span className="text-2xl">💬</span>
          <div className="text-left"><p className="font-bold">Enviar pelo WhatsApp</p><p className="text-xs opacity-70">Recomendado</p></div>
        </button>
        <button onClick={handleCopyLink} className="w-full py-3 rounded-2xl font-semibold text-sm mb-4 flex items-center justify-center gap-2"
          style={{background:'rgba(255,255,255,0.06)',border:'1px solid rgba(255,255,255,0.1)',color:'white'}}>
          🔗 Copiar link de convite
        </button>
        <div className="border-t border-white/10 pt-4">
          <p className="text-xs text-white/40 mb-3 text-center">Ou envie por e-mail</p>
          <div className="mb-3">
            <label className="text-xs text-white/40 block mb-1">E-mail do(a) parceiro(a)</label>
            <input className="input-field" type="email" placeholder="parceiro@email.com"
              value={partnerEmail} onChange={e => setPartnerEmail(e.target.value)} />
          </div>
          <button onClick={handleSend} disabled={!partnerEmail || sent} className="btn-primary disabled:opacity-40">
            {sent ? '✅ Convite enviado!' : '📧 Enviar convite por e-mail'}
          </button>
          {sent && <p className="text-xs text-white/40 text-center mt-2">Quando o backend estiver ativo o e-mail será enviado automaticamente</p>}
        </div>
      </div>
    </div>
  )
}
