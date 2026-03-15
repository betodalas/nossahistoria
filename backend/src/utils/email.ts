import nodemailer from 'nodemailer'

const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: 'nossahistoriaoficialapp@gmail.com',
    pass: 'gvcuyfapepplbcon',
  },
})

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
  await transporter.sendMail({
    from: '"Nossa História 💍" <nossahistoriaoficialapp@gmail.com>',
    to: toEmail,
    subject: `${fromName} te convidou para o Nossa História 💌`,
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;background:#0f0a1a;color:#fff;border-radius:16px">
        <h2 style="color:#c084fc;margin-bottom:8px">💍 Nossa História</h2>
        <p style="color:#d1d5db;font-size:16px;margin-bottom:24px">
          <strong>${fromName}</strong> te convidou para registrar a história de vocês juntos${coupleName ? ` — <em>${coupleName}</em>` : ''}.
        </p>
        <a href="${inviteLink}" style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#be185d);color:#fff;padding:14px 28px;border-radius:12px;text-decoration:none;font-weight:bold;font-size:15px">
          💌 Aceitar convite
        </a>
        <p style="color:#6b7280;font-size:12px;margin-top:24px">
          Ou cole este link no navegador:<br/>
          <a href="${inviteLink}" style="color:#a78bfa">${inviteLink}</a>
        </p>
      </div>
    `,
  })
}
