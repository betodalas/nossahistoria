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

export const sendVerificationEmail = async ({
  toEmail,
  name,
  verifyLink,
}: {
  toEmail: string
  name: string
  verifyLink: string
}) => {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Nossa História <onboarding@resend.dev>',
      to: toEmail,
      subject: `Confirme seu e-mail — Nossa História 💌`,
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0f0a1a;color:#fff;border-radius:16px">
          <h2 style="color:#c084fc;margin-bottom:8px">💍 Nossa História</h2>
          <p style="color:#d1d5db;font-size:16px;margin-bottom:8px">Olá, <strong>${name}</strong>! 👋</p>
          <p style="color:#9ca3af;font-size:14px;margin-bottom:24px">
            Falta só um passo para começar a registrar a história de vocês.<br>
            Clique no botão abaixo para confirmar seu e-mail.
          </p>
          <div style="text-align:center;margin-bottom:24px">
            <a href="${verifyLink}"
              style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#be185d);color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:bold">
              ✅ Confirmar e-mail
            </a>
          </div>
          <p style="color:#6b7280;font-size:11px;text-align:center;word-break:break-all">${verifyLink}</p>
          <p style="color:#6b7280;font-size:11px;text-align:center;margin-top:16px">Nossa História — cada momento importa 💜</p>
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

export const sendPasswordResetEmail = async ({
  toEmail,
  name,
  resetLink,
}: {
  toEmail: string
  name: string
  resetLink: string
}) => {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'Nossa História <onboarding@resend.dev>',
      to: toEmail,
      subject: 'Recuperar senha — Nossa História 🔐',
      html: `
        <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#FFF0F3;border-radius:16px">
          <h2 style="color:#7C4D6B;margin-bottom:8px">💍 Nossa História</h2>
          <p style="color:#3D1A2A;font-size:16px;margin-bottom:8px">Olá, <strong>${name}</strong>!</p>
          <p style="color:#9B6B7A;font-size:14px;margin-bottom:24px">
            Recebemos uma solicitação para redefinir sua senha.<br>
            Clique no botão abaixo — o link expira em <strong>1 hora</strong>.
          </p>
          <div style="text-align:center;margin-bottom:24px">
            <a href="${resetLink}"
              style="display:inline-block;background:linear-gradient(135deg,#C9A0B0,#7C4D6B);color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-size:15px;font-weight:bold">
              🔐 Criar nova senha
            </a>
          </div>
          <p style="color:#9B6B7A;font-size:11px;text-align:center;word-break:break-all">${resetLink}</p>
          <p style="color:#C9A0B0;font-size:11px;text-align:center;margin-top:16px">
            Se você não solicitou isso, ignore este e-mail — sua senha não será alterada.<br>
            Nossa História — cada momento importa 💜
          </p>
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
