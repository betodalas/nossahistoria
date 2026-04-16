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
    <div className="min-h-screen flex flex-col" style={{background:'#FFF0F3'}}>
      <div className="flex items-center gap-3 px-4 py-4 border-b" style={{borderColor:'#E8C4CE'}}>
        <button onClick={() => navigate(-1)} className="px-3 py-1.5 rounded-lg text-sm font-semibold"
          style={{background:'#FADADD', color:'#7C4D6B', border:'1px solid #E8C4CE'}}>←</button>
        <h2 className="text-base font-semibold" style={{color:'#3D1A2A'}}>Convidar parceiro(a)</h2>
      </div>

      <div className="flex-1 p-4">
        {hasPartner ? (
          <div className="text-center py-8">
            <div className="text-5xl mb-4">💑</div>
            <p className="text-base font-bold mb-2" style={{color:'#3D1A2A'}}>Parceiro(a) já vinculado!</p>
            <p className="text-sm mt-1" style={{color:'#9B6B7A'}}>
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
              <h2 className="text-lg font-bold mb-2" style={{color:'#3D1A2A'}}>Chame o(a) parceiro(a)</h2>
              <p className="text-sm leading-relaxed" style={{color:'#9B6B7A'}}>
                Vocês dois compartilham momentos, perguntas e cartas — tudo sincronizado
              </p>
            </div>

            {/* Como funciona */}
            <div className="rounded-2xl p-4 mb-5" style={{background:'#FADADD', border:'1px solid #E8C4CE'}}>
              <p className="text-xs font-bold mb-2" style={{color:'#7C4D6B'}}>💡 Como funciona</p>
              <p className="text-xs leading-relaxed" style={{color:'#9B6B7A'}}>
                1. Digite o email → 2. Clique em enviar → 3. Ele(a) recebe o link → 4. Baixa o app e clica no link → vocês ficam vinculados
              </p>
            </div>

            {error && (
              <div className="mb-4 px-3 py-2 rounded-xl text-sm text-center"
                style={{background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', color:'#b91c1c'}}>
                {error}
              </div>
            )}

            {/* Campo de email */}
            <div className="mb-3">
              <label className="text-sm font-medium block mb-2" style={{color:'#3D1A2A'}}>
                E-mail do(a) parceiro(a)
              </label>
              <input className="input-field" type="email" placeholder="parceiro@email.com"
                value={partnerEmail} onChange={e => setPartnerEmail(e.target.value)} />
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
              <div className="rounded-2xl p-4 mb-4" style={{background:'rgba(16,185,129,0.08)', border:'1px solid rgba(16,185,129,0.3)'}}>
                <p className="text-sm font-bold mb-1" style={{color:'#065f46'}}>✅ Email enviado para {partnerEmail}!</p>
                <p className="text-xs mb-3" style={{color:'#9B6B7A'}}>
                  Compartilhe também o link diretamente:
                </p>

                {/* Link visível */}
                <div className="rounded-xl p-3 mb-3 break-all" style={{background:'white', border:'1px solid #E8C4CE'}}>
                  <p className="text-xs" style={{color:'#9B6B7A'}}>Link do convite:</p>
                  <p className="text-xs mt-1" style={{color:'#7C4D6B'}}>{inviteLink}</p>
                </div>

                <div className="flex gap-2">
                  <button onClick={handleCopyLink}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style={{
                      background: copied ? 'rgba(16,185,129,0.1)' : '#FADADD',
                      border: `1px solid ${copied ? 'rgba(16,185,129,0.4)' : '#E8C4CE'}`,
                      color: copied ? '#065f46' : '#7C4D6B'
                    }}>
                    {copied ? '✅ Copiado!' : '📋 Copiar link'}
                  </button>
                  <button onClick={handleWhatsApp}
                    className="flex-1 py-2.5 rounded-xl text-sm font-semibold"
                    style={{background:'rgba(37,211,102,0.1)', border:'1px solid rgba(37,211,102,0.35)', color:'#16a34a'}}>
                    💬 WhatsApp
                  </button>
                </div>
              </div>
            )}

            {/* Divisor */}
            {!sent && (
              <>
                <div className="flex items-center gap-3 my-4">
                  <div className="flex-1 h-px" style={{background:'#E8C4CE'}}></div>
                  <span className="text-xs" style={{color:'#9B6B7A'}}>ou compartilhe diretamente</span>
                  <div className="flex-1 h-px" style={{background:'#E8C4CE'}}></div>
                </div>

                <button onClick={handleWhatsApp}
                  className="w-full py-3 rounded-2xl font-semibold text-sm flex items-center justify-center gap-3"
                  style={{background:'rgba(37,211,102,0.1)', border:'2px solid rgba(37,211,102,0.35)', color:'#16a34a'}}>
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
