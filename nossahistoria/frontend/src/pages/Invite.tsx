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
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const playstoreLink = 'https://play.google.com/store/apps/details?id=com.nossahistoria.app'

  const handleWhatsApp = () => {
    const link = inviteLink || ''
    if (!link) { setError('Envie o convite por email primeiro para gerar o link'); return }
    const msg = `💍 Oi! Quero te convidar para o *Nossa História* — o app onde vamos registrar nossa história juntos!\n\n` +
      `1️⃣ Baixe o app:\n${playstoreLink}\n\n` +
      `2️⃣ Acesse este link para nos vincular:\n${link}`
    window.open(`https://wa.me/?text=${encodeURIComponent(msg)}`, '_blank')
  }

  const handleCopyLink = async () => {
    const link = inviteLink
    if (!link) { setError('Envie o convite por email primeiro para gerar o link'); return }
    await navigator.clipboard.writeText(link)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
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
      if (err?.code === 'ECONNABORTED' || err?.message?.includes('timeout')) {
        setError('Tempo esgotado. Tente novamente.')
      } else if (msg) {
        setError(msg)
      } else {
        setError('Erro ao enviar email. Tente novamente.')
      }
    } finally {
      setSending(false)
    }
  }

  const hasPartner = !!couple?.user2_id

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
            <p className="text-base font-bold text-white mb-2">Parceiro(a) já vinculado!</p>
            <p className="text-sm mt-1" style={{color:'rgba(255,255,255,0.7)'}}>
              {couple?.partner_name || 'Seu amor'} já faz parte do casal 💍
            </p>
            <button className="btn-primary mt-6 max-w-xs mx-auto" onClick={() => navigate('/dashboard')}>
              Voltar para o início
            </button>
          </div>
        ) : (
          <>
            <div className="text-center py-6">
              <div className="text-5xl mb-4">💌</div>
              <h2 className="text-lg font-bold text-white mb-2">Chame o(a) parceiro(a)</h2>
              <p className="text-sm leading-relaxed" style={{color:'rgba(255,255,255,0.7)'}}>
                Vocês dois compartilham momentos, perguntas e cartas — tudo sincronizado
              </p>
            </div>

            {/* Como funciona */}
            <div className="rounded-2xl p-4 mb-5" style={{background:'rgba(124,58,237,0.15)', border:'1px solid rgba(124,58,237,0.3)'}}>
              <p className="text-xs font-bold text-violet-300 mb-2">💡 Como funciona</p>
              <p className="text-xs leading-relaxed" style={{color:'rgba(255,255,255,0.75)'}}>
                1. Digite o email → 2. Clique em enviar → 3. Ele(a) recebe o link → 4. Baixa o app e clica no link → vocês ficam vinculados
              </p>
            </div>

            {error && (
              <div className="mb-4 px-3 py-2 rounded-xl text-sm text-center"
                style={{background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5'}}>
                {error}
              </div>
            )}

            {/* Campo de email */}
            <div className="mb-3">
              <label className="text-sm font-medium block mb-2" style={{color:'rgba(255,255,255,0.85)'}}>
                E-mail do(a) parceiro(a)
              </label>
              <input className="input-field" type="email" placeholder="parceiro@email.com"
                value={partnerEmail} onChange={e => setPartnerEmail(e.target.value)}
                style={{background:'#1a1030', borderColor:'rgba(124,58,237,0.4)', color:'white'}} />
            </div>

            <button onClick={handleSendEmail} disabled={!partnerEmail || sending}
              className="btn-primary disabled:opacity-40 mb-4">
              {sending ? (
                <span className="flex items-center justify-center gap-2">
                  <span>⏳</span> Enviando...
                </span>
              ) : '📧 Enviar convite por e-mail'}
            </button>

            {/* Após enviar — mostra link e opções */}
            {sent && inviteLink && (
              <div className="rounded-2xl p-4 mb-4" style={{background:'rgba(52,211,153,0.1)', border:'1px solid rgba(52,211,153,0.3)'}}>
                <p className="text-sm font-bold text-emerald-400 mb-1">✅ Email enviado para {partnerEmail}!</p>
                <p className="text-xs mb-3" style={{color:'rgba(255,255,255,0.6)'}}>
                  Compartilhe também o link diretamente:
                </p>

                {/* Link visível */}
                <div className="rounded-xl p-3 mb-3 break-all" style={{background:'rgba(0,0,0,0.3)', border:'1px solid rgba(255,255,255,0.1)'}}>
                  <p className="text-xs" style={{color:'rgba(255,255,255,0.5)'}}>Link do convite:</p>
                  <p className="text-xs text-violet-300 mt-1">{inviteLink}</p>
                </div>

                <div className="flex gap-2">
                  <button onClick={handleCopyLink}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style={{background: copied ? 'rgba(52,211,153,0.2)' : 'rgba(124,58,237,0.3)', border:'1px solid rgba(124,58,237,0.4)', color: copied ? '#34d399' : 'white'}}>
                    {copied ? '✅ Copiado!' : '📋 Copiar link'}
                  </button>
                  <button onClick={handleWhatsApp}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style={{background:'rgba(37,211,102,0.15)', border:'1px solid rgba(37,211,102,0.4)', color:'#25d366'}}>
                    💬 WhatsApp
                  </button>
                </div>
              </div>
            )}

            {/* Divisor */}
            {!sent && (
              <>
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px" style={{background:'rgba(255,255,255,0.1)'}}></div>
                  <span className="text-xs" style={{color:'rgba(255,255,255,0.75)'}}>ou compartilhe diretamente</span>
                  <div className="flex-1 h-px" style={{background:'rgba(255,255,255,0.1)'}}></div>
                </div>

                <button onClick={handleWhatsApp}
                  className="w-full py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-3"
                  style={{background:'rgba(37,211,102,0.15)', border:'2px solid rgba(37,211,102,0.4)', color:'#25d366'}}>
                  <span className="text-xl">💬</span>
                  <div className="text-left">
                    <p className="font-bold">Enviar pelo WhatsApp</p>
                    <p className="text-xs opacity-70">Envie o email primeiro para gerar o link</p>
                  </div>
                </button>
              </>
            )}
          </>
        )}
      </div>
    </div>
  )
}
