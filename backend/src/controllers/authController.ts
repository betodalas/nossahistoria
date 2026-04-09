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

    const baseUrl = process.env.API_URL || 'https://nossahistoria-xtjq.onrender.com/api'
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
