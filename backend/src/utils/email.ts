export const sendInviteEmail = async ({
  toEmail,
  fromName,
  coupleName,
  inviteLink,
}: {
  toEmail: string
  fromName: string
  coupleName: string
  inviteLink: string
}) => {
  const playstoreLink = 'https://play.google.com/store/apps/details?id=com.nossahistoria.app'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Nossa História <onboarding@resend.dev>',
      to: toEmail,
      subject: `${fromName} te convidou para o Nossa História 💌`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0f0a1a;color:#fff;border-radius:16px">
          <h2 style="color:#c084fc;margin-bottom:8px">💍 Nossa História</h2>
          <p style="color:#d1d5db;font-size:16px;margin-bottom:24px">
            <strong>${fromName}</strong> te convidou para registrar a história de vocês juntos${coupleName ? ` — <em>${coupleName}</em>` : ''}.
          </p>

          <p style="color:#9ca3af;font-size:14px;margin-bottom:16px">Siga os passos abaixo:</p>

          <div style="background:#1a1030;border-radius:12px;padding:16px;margin-bottom:16px">
            <p style="color:#a78bfa;font-size:13px;font-weight:bold;margin:0 0 8px 0">1️⃣ Baixe o app</p>
            <a href="${playstoreLink}" style="display:inline-block;background:#1a73e8;color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px">
              📲 Baixar na Play Store
            </a>
          </div>

          <div style="background:#1a1030;border-radius:12px;padding:16px;margin-bottom:24px">
            <p style="color:#a78bfa;font-size:13px;font-weight:bold;margin:0 0 8px 0">2️⃣ Crie sua conta e acesse o link de convite</p>
            <a href="${inviteLink}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#be185d);color:#fff;padding:10px 20px;border-radius:8px;text-decoration:none;font-size:13px">
              💌 Aceitar convite
            </a>
            <p style="color:#6b7280;font-size:11px;margin-top:8px;word-break:break-all">${inviteLink}</p>
          </div>

          <p style="color:#6b7280;font-size:11px;text-align:center">Nossa História — cada momento importa 💜</p>
        </div>
      `,
    }),
  })

  if (!res.ok) {
    const err = await res.text()
    throw new Error(`Resend error: ${err}`)
  }

  return res.json()
}
