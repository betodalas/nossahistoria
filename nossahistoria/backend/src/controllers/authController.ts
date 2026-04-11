import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { v4 as uuidv4 } from 'uuid'
import { pool } from '../utils/db'
import { sendVerificationEmail, sendPasswordResetEmail } from '../utils/email'
import { OAuth2Client } from 'google-auth-library'

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID)

export const register = async (req: Request, res: Response) => {
  const { name, email, password } = req.body
  if (!name || !email || !password)
    return res.status(400).json({ error: 'Nome, email e senha são obrigatórios' })

  try {
    const exists = await pool.query('SELECT id FROM users WHERE email = $1', [email])
    if (exists.rows.length > 0)
      return res.status(409).json({ error: 'E-mail já cadastrado' })

    const hash = await bcrypt.hash(password, 12)
    const verifyToken = uuidv4()

    const result = await pool.query(
      `INSERT INTO users (name, email, password_hash, email_verified, email_verify_token)
       VALUES ($1, $2, $3, FALSE, $4)
       RETURNING id, name, email`,
      [name, email, hash, verifyToken]
    )
    const user = result.rows[0]

    const baseUrl = process.env.API_URL || 'http://localhost:3001/api'
    const verifyLink = `${baseUrl}/auth/verify-email?token=${verifyToken}`
    sendVerificationEmail({ toEmail: email, name, verifyLink })
      .catch((err: any) => console.error('[VERIFY EMAIL] Falhou:', err?.message))

    res.status(201).json({ requiresVerification: true, email: user.email })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao criar conta' })
  }
}

export const login = async (req: Request, res: Response) => {
  const { email, password } = req.body
  try {
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email])
    const user = result.rows[0]
    if (!user) return res.status(401).json({ error: 'E-mail ou senha inválidos' })

    const valid = await bcrypt.compare(password, user.password_hash)
    if (!valid) return res.status(401).json({ error: 'E-mail ou senha inválidos' })

    if (user.email_verified === false) {
      return res.status(403).json({
        error: 'Confirme seu e-mail antes de entrar. Verifique sua caixa de entrada.',
        requiresVerification: true,
      })
    }

    const coupleResult = await pool.query(
      'SELECT * FROM couples WHERE user1_id = $1 OR user2_id = $1',
      [user.id]
    )
    const couple = coupleResult.rows[0]

    const token = jwt.sign(
      { userId: user.id, coupleId: couple?.id },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    )

    res.json({
      user: { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url },
      couple: couple || null,
      token,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao fazer login' })
  }
}

export const googleLogin = async (req: Request, res: Response) => {
  const { credential } = req.body
  if (!credential) return res.status(400).json({ error: 'Credencial do Google não fornecida' })

  try {
    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID,
    })
    const payload = ticket.getPayload()
    if (!payload) return res.status(401).json({ error: 'Token do Google inválido' })

    const { email, name, picture } = payload

    let userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email])
    let user = userResult.rows[0]

    if (!user) {
      const insertResult = await pool.query(
        'INSERT INTO users (name, email, password_hash, avatar_url) VALUES ($1, $2, $3, $4) RETURNING *',
        [name, email, '', picture || null]
      )
      user = insertResult.rows[0]
    } else if (picture && !user.avatar_url) {
      await pool.query('UPDATE users SET avatar_url = $1 WHERE id = $2', [picture, user.id])
      user.avatar_url = picture
    }

    const coupleResult = await pool.query(
      'SELECT * FROM couples WHERE user1_id = $1 OR user2_id = $1',
      [user.id]
    )
    const couple = coupleResult.rows[0] || null

    const token = jwt.sign(
      { userId: user.id, coupleId: couple?.id },
      process.env.JWT_SECRET!,
      { expiresIn: '30d' }
    )

    res.json({
      user: { id: user.id, name: user.name, email: user.email, avatar_url: user.avatar_url },
      couple,
      token,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao autenticar com Google' })
  }
}

export const createCouple = async (req: Request & { userId?: string }, res: Response) => {
  const { partnerEmail, weddingDate, coupleName } = req.body
  const userId = req.userId!

  try {
    const partnerResult = await pool.query('SELECT id FROM users WHERE email = $1', [partnerEmail])
    if (!partnerResult.rows[0])
      return res.status(404).json({ error: 'Parceiro(a) não encontrado. Peça para ele(a) criar uma conta primeiro.' })

    const partnerId = partnerResult.rows[0].id
    const inviteToken = uuidv4()

    const result = await pool.query(
      `INSERT INTO couples (user1_id, user2_id, wedding_date, couple_name, invite_token)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, partnerId, weddingDate || null, coupleName || null, inviteToken]
    )

    if (weddingDate) {
      const coupleId = result.rows[0].id
      const unlocks = [
        { label: 'Dia do casamento', years: 0 },
        { label: '1 ano de casados', years: 1 },
        { label: '5 anos de casados', years: 5 },
        { label: '10 anos de casados', years: 10 },
      ]
      for (const u of unlocks) {
        const date = new Date(weddingDate)
        date.setFullYear(date.getFullYear() + u.years)
        await pool.query(
          'INSERT INTO unlock_dates (couple_id, label, unlock_date) VALUES ($1, $2, $3)',
          [coupleId, u.label, date.toISOString().split('T')[0]]
        )
      }
    }

    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao criar casal' })
  }
}

// ─── Recuperação de senha ────────────────────────────────────────────────────

export const forgotPassword = async (req: Request, res: Response) => {
  const { email } = req.body
  if (!email) return res.status(400).json({ error: 'E-mail obrigatório' })

  try {
    const result = await pool.query('SELECT id, name FROM users WHERE email = $1', [email])
    const user = result.rows[0]

    if (user) {
      // Invalida tokens anteriores do usuário
      await pool.query(
        'UPDATE password_reset_tokens SET used = TRUE WHERE user_id = $1 AND used = FALSE',
        [user.id]
      )

      const token = uuidv4()
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000) // 1 hora

      await pool.query(
        'INSERT INTO password_reset_tokens (user_id, token, expires_at) VALUES ($1, $2, $3)',
        [user.id, token, expiresAt]
      )

      const frontendUrl = process.env.FRONTEND_URL || 'https://nossahistoria.vercel.app'
      const resetLink = `${frontendUrl}/redefinir-senha?token=${token}`

      console.log('[RESET EMAIL] Tentando enviar para:', email)
      try {
        await sendPasswordResetEmail({ toEmail: email, name: user.name, resetLink })
        console.log('[RESET EMAIL] Enviado com sucesso para:', email)
      } catch (emailErr: any) {
        console.error('[RESET EMAIL] Falhou ao chamar Resend:', emailErr?.message)
      }
    } else {
      console.log('[FORGOT PASSWORD] E-mail não encontrado na base:', email)
    }
  } catch (err) {
    console.error('[FORGOT PASSWORD] Erro interno:', err)
  }

  // Sempre responde com sucesso para não vazar se o e-mail existe
  res.json({ success: true, message: 'Se este e-mail estiver cadastrado, você receberá as instruções em breve.' })
}

export const resetPassword = async (req: Request, res: Response) => {
  const { token, password } = req.body
  if (!token || !password) return res.status(400).json({ error: 'Token e senha obrigatórios' })
  if (password.length < 6) return res.status(400).json({ error: 'A senha deve ter pelo menos 6 caracteres' })

  try {
    const result = await pool.query(
      `SELECT prt.*, u.id as uid FROM password_reset_tokens prt
       JOIN users u ON u.id = prt.user_id
       WHERE prt.token = $1 AND prt.used = FALSE AND prt.expires_at > NOW()`,
      [token]
    )
    const row = result.rows[0]
    if (!row) return res.status(400).json({ error: 'Link expirado ou inválido. Solicite um novo.' })

    const hash = await bcrypt.hash(password, 12)
    await pool.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hash, row.uid])
    await pool.query('UPDATE password_reset_tokens SET used = TRUE WHERE id = $1', [row.id])

    res.json({ success: true, message: 'Senha atualizada com sucesso.' })
  } catch (err) {
    console.error('[RESET PASSWORD]', err)
    res.status(500).json({ error: 'Erro ao redefinir senha. Tente novamente.' })
  }
}

// ─── Funções extraídas das rotas inline ──────────────────────────────────────

export const getMe = async (req: any, res: Response) => {
  try {
    const userResult = await pool.query(
      'SELECT id, name, email, avatar_url FROM users WHERE id = $1',
      [req.userId]
    )
    const coupleResult = await pool.query(
      `SELECT c.*,
        COALESCE(
          CASE WHEN c.user1_id = $1 THEN u2.name ELSE u1.name END,
          c.partner_name_manual
        ) AS partner_name,
        CASE WHEN c.user1_id = $1 THEN u2.email ELSE u1.email END AS partner_email
       FROM couples c
       LEFT JOIN users u1 ON u1.id = c.user1_id
       LEFT JOIN users u2 ON u2.id = c.user2_id
       WHERE c.user1_id = $1 OR c.user2_id = $1
       LIMIT 1`,
      [req.userId]
    )
    res.json({ user: userResult.rows[0], couple: coupleResult.rows[0] || null })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar dados do usuário' })
  }
}

export const updateCouple = async (req: any, res: Response) => {
  const { weddingDate, coupleName, partnerName } = req.body
  const userId = req.userId
  try {
    let coupleResult = await pool.query(
      'SELECT * FROM couples WHERE user1_id = $1 OR user2_id = $1',
      [userId]
    )
    if (!coupleResult.rows[0]) {
      const inviteToken = uuidv4()
      coupleResult = await pool.query(
        `INSERT INTO couples (user1_id, wedding_date, couple_name, invite_token)
         VALUES ($1, $2, $3, $4) RETURNING *`,
        [userId, weddingDate || null, coupleName || null, inviteToken]
      )
      return res.json(coupleResult.rows[0])
    }
    const couple = coupleResult.rows[0]
    const updated = await pool.query(
      `UPDATE couples SET
        wedding_date = CASE WHEN $1::text IS NOT NULL THEN $1::date ELSE wedding_date END,
        couple_name  = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE couple_name END,
        partner_name_manual = CASE WHEN $4::text IS NOT NULL THEN $4 ELSE partner_name_manual END
       WHERE id = $3 RETURNING *`,
      [weddingDate || null, coupleName || null, couple.id, partnerName || null]
    )
    if (partnerName) {
      const partnerId = couple.user1_id === userId ? couple.user2_id : couple.user1_id
      if (partnerId) {
        await pool.query('UPDATE users SET name = $1 WHERE id = $2', [partnerName, partnerId])
      }
    }
    res.json(updated.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao atualizar casal' })
  }
}

export const sendInvite = async (req: any, res: Response) => {
  const { sendInviteEmail } = await import('../utils/email')
  const { partnerEmail } = req.body
  if (!partnerEmail) return res.status(400).json({ error: 'Email do parceiro obrigatório' })
  try {
    const userResult = await pool.query('SELECT name FROM users WHERE id = $1', [req.userId])
    const fromName = userResult.rows[0]?.name || 'Seu amor'

    let coupleResult = await pool.query(
      'SELECT * FROM couples WHERE user1_id = $1 OR user2_id = $1 LIMIT 1',
      [req.userId]
    )
    if (!coupleResult.rows[0]) {
      const token = uuidv4()
      coupleResult = await pool.query(
        'INSERT INTO couples (user1_id, invite_token) VALUES ($1, $2) RETURNING *',
        [req.userId, token]
      )
    }
    const couple = coupleResult.rows[0]
    const frontendUrl = process.env.FRONTEND_URL || 'https://nossahistoria.vercel.app'
    const inviteLink = `${frontendUrl}/convite/${couple.invite_token}`

    res.json({ success: true, inviteLink, emailSent: true })

    sendInviteEmail({ toEmail: partnerEmail, fromName, coupleName: couple.couple_name || '', inviteLink })
      .then(() => console.log(`[INVITE] Email enviado para ${partnerEmail}`))
      .catch((err: any) => console.error('[INVITE] Email falhou:', err?.message))
  } catch (err: any) {
    console.error('Erro no convite:', err)
    res.status(500).json({ error: 'Erro ao processar convite.' })
  }
}

export const acceptInvite = async (req: any, res: Response) => {
  const { token } = req.body
  if (!token) return res.status(400).json({ error: 'Token obrigatório' })
  try {
    const coupleResult = await pool.query('SELECT * FROM couples WHERE invite_token = $1', [token])
    if (!coupleResult.rows[0]) return res.status(404).json({ error: 'Convite inválido ou expirado' })
    const couple = coupleResult.rows[0]
    if (couple.user1_id === req.userId || couple.user2_id === req.userId) {
      return res.status(400).json({ error: 'Você já faz parte deste casal' })
    }
    const updated = await pool.query(
      'UPDATE couples SET user2_id = $1 WHERE id = $2 AND user2_id IS NULL RETURNING *',
      [req.userId, couple.id]
    )
    if (!updated.rows[0]) return res.status(400).json({ error: 'Este convite já foi usado' })
    res.json(updated.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erro ao aceitar convite' })
  }
}

export const verifyEmail = async (req: any, res: Response) => {
  const { token } = req.query
  if (!token) return res.status(400).send('Token inválido.')
  try {
    const result = await pool.query(
      `UPDATE users SET email_verified = TRUE, email_verify_token = NULL
       WHERE email_verify_token = $1 AND email_verified = FALSE
       RETURNING name, email`,
      [token]
    )
    const frontendUrl = process.env.FRONTEND_URL || 'https://nossahistoria.vercel.app'
    if (!result.rows[0]) {
      return res.send(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Nossa História</title>
        <style>body{background:#FFF0F3;color:#3D1A2A;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px}h1{color:#e53e3e}p{color:#9B6B7A;margin-top:8px}</style></head>
        <body><div><div style="font-size:48px">⚠️</div><h1>Link inválido ou já utilizado</h1><p>Este link de confirmação não é mais válido.</p></div></body></html>`)
    }
    const { name } = result.rows[0]
    res.send(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Nossa História</title>
      <style>body{background:#FFF0F3;color:#3D1A2A;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px}h1{color:#7C4D6B}p{color:#9B6B7A;margin-top:8px}.btn{display:inline-block;margin-top:24px;background:linear-gradient(135deg,#C9A0B0,#7C4D6B);color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:bold}</style></head>
      <body><div><div style="font-size:48px">✅</div><h1>E-mail confirmado!</h1><p>Olá, ${name}! Sua conta está ativa.</p><a class="btn" href="${frontendUrl}/login">Abrir o app</a></div></body></html>`)
  } catch (err) {
    console.error(err)
    res.status(500).send('Erro ao confirmar e-mail.')
  }
}

export const deleteAccount = async (req: any, res: Response) => {
  const userId = req.userId
  try {
    const coupleRow = await pool.query(
      'SELECT * FROM couples WHERE user1_id = $1 OR user2_id = $1 LIMIT 1',
      [userId]
    )
    const couple = coupleRow.rows[0]
    if (couple) {
      if (couple.user1_id === userId) {
        await pool.query('DELETE FROM couples WHERE id = $1', [couple.id])
      } else {
        await pool.query('UPDATE couples SET user2_id = NULL WHERE id = $1', [couple.id])
        await pool.query('UPDATE moments SET created_by = NULL WHERE created_by = $1', [userId])
      }
    }
    await pool.query('DELETE FROM users WHERE id = $1', [userId])
    res.json({ success: true })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao cancelar conta.' })
  }
}
