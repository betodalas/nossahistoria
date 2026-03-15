import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authService } from '../services/api'

export default function Invite() {
  const { user, couple, refreshCouple } = useAuth()
  const navigate = useNavigate()
  const [partnerEmail, setPartnerEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [inviteLink, setInviteLink] = useState('')
  const [error, setError] = useState('')

  const handleWhatsApp = () => {
    const link = inviteLink || `https://nossahistoria.app/convite`
    const msg = `💍 Oi! Quero te convidar para o *Nossa História* — o app onde vamos registrar nossa história antes do casamento!\n\nAcesse o link abaixo:\n${link}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handleSendEmail = async () => {
    if (!partnerEmail) return
    setSending(true)
    setError('')
    try {
      const res = await authService.sendInvite(partnerEmail)
      setInviteLink(res.data.inviteLink)
      setSent(true)
      await refreshCouple()
    } catch (err: any) {
      const msg = err?.response?.data?.error || ''
      setError(msg || 'Erro ao enviar email. Tente pelo WhatsApp.')
    } finally {
      setSending(false)
    }
  }

  const hasPartner = !!(couple?.user2_id || couple?.partner_name)

  return (
    <div className="min-h-screen flex flex-col" style={{background:'#0f0a1a'}}>
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
        <button onClick={() => navigate(-1)} className="text-violet-300 px-3 py-1.5 rounded-lg text-sm" style={{background:'#1e1035'}}>←</button>
        <h2 className="text-base font-semibold text-white">Convidar parceiro(a)</h2>
      </div>
      <div className="flex-1 p-4">

        {hasPartner ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">💑</div>
            <p className="text-base font-bold text-white mb-1">Parceiro(a) já vinculado!</p>
            <p className="text-sm text-white/50">{couple?.partner_name || 'Seu amor'} já faz parte do casal</p>
            <button className="btn-primary mt-6 max-w-xs mx-auto" onClick={() => navigate('/dashboard')}>
              Voltar para o início
            </button>
          </div>
        ) : (
          <>
            <div className="text-center py-6">
              <div className="text-5xl mb-4">💌</div>
              <h2 className="text-lg font-bold text-white mb-2">Chame o(a) parceiro(a)</h2>
              <p className="text-sm text-white/50 leading-relaxed">Vocês dois usam o app juntos — compartilham momentos, perguntas e cartas</p>
            </div>

            {sent ? (
              <div className="rounded-2xl p-5 mb-4 text-center" style={{background:'rgba(52,211,153,0.1)', border:'1px solid rgba(52,211,153,0.3)'}}>
                <p className="text-2xl mb-2">✅</p>
                <p className="text-sm font-bold text-emerald-400">Email enviado para {partnerEmail}!</p>
                <p className="text-xs text-white/40 mt-1">Quando ele(a) aceitar, vocês ficarão vinculados</p>
                {inviteLink && (
                  <button onClick={() => { navigator.clipboard.writeText(inviteLink); }} className="text-xs text-violet-300 underline mt-3 block mx-auto">
                    📋 Copiar link do convite
                  </button>
                )}
              </div>
            ) : (
              <>
                <button onClick={handleWhatsApp} className="w-full py-4 rounded-2xl font-bold text-sm mb-3 flex items-center justify-center gap-3"
                  style={{background:'rgba(37,211,102,0.15)',border:'2px solid rgba(37,211,102,0.4)',color:'#25d366'}}>
                  <span className="text-2xl">💬</span>
                  <div className="text-left">
                    <p className="font-bold">Enviar pelo WhatsApp</p>
                    <p className="text-xs opacity-70">Recomendado</p>
                  </div>
                </button>

                <div className="border-t border-white/10 pt-4">
                  <p className="text-xs text-white/40 mb-3 text-center">Ou envie por e-mail</p>

                  {error && (
                    <div className="mb-3 px-3 py-2 rounded-xl text-xs text-center"
                      style={{background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5'}}>
                      {error}
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="text-xs text-white/40 block mb-1">E-mail do(a) parceiro(a)</label>
                    <input className="input-field" type="email" placeholder="parceiro@email.com"
                      value={partnerEmail} onChange={e => setPartnerEmail(e.target.value)} />
                  </div>
                  <button onClick={handleSendEmail} disabled={!partnerEmail || sending} className="btn-primary disabled:opacity-40">
                    {sending ? '📧 Enviando...' : '📧 Enviar convite por e-mail'}
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
