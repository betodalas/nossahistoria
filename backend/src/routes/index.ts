import { Router } from 'express'
import {
  register,
  login,
  googleLogin,
  createCouple,
  forgotPassword,
  resetPassword,
} from '../controllers/authController'
import { getMoments, createMoment, addPerspective, deleteMoment, updateMoment } from '../controllers/momentsController'
import { getWeeklyQuestion, answerQuestion, seedQuestions } from '../controllers/questionsController'
import { createOrder, captureOrder } from '../controllers/paymentController'
import { authMiddleware } from '../middleware/auth'
import multer from 'multer'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

// ─── Auth ─────────────────────────────────────────────────────────────────────
router.post('/auth/register', register)
router.post('/auth/login', login)
router.post('/auth/google', googleLogin)
router.post('/auth/forgot-password', forgotPassword)
router.post('/auth/reset-password', resetPassword)
router.post('/auth/couple', authMiddleware, createCouple)

router.put('/auth/couple', authMiddleware, async (req: any, res) => {
  const { pool } = await import('../utils/db')
  const { v4: uuidv4 } = await import('uuid')
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
})

router.get('/auth/me', authMiddleware, async (req: any, res) => {
  const { pool } = await import('../utils/db')
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
})

router.post('/auth/invite', authMiddleware, async (req: any, res) => {
  const { pool } = await import('../utils/db')
  const { v4: uuidv4 } = await import('uuid')
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
})

router.post('/auth/invite/accept', authMiddleware, async (req: any, res) => {
  const { pool } = await import('../utils/db')
  const { token } = req.body
  if (!token) return res.status(400).json({ error: 'Token obrigatório' })
  try {
    const coupleResult = await pool.query(
      'SELECT * FROM couples WHERE invite_token = $1',
      [token]
    )
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
})

router.get('/auth/verify-email', async (req, res) => {
  const { pool } = await import('../utils/db')
  const { token } = req.query
  if (!token) return res.status(400).send('Token inválido.')
  try {
    const result = await pool.query(
      `UPDATE users SET email_verified = TRUE, email_verify_token = NULL
       WHERE email_verify_token = $1 AND email_verified = FALSE
       RETURNING name, email`,
      [token]
    )
    if (!result.rows[0]) {
      return res.send(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Nossa História</title>
        <style>body{background:#FFF0F3;color:#3D1A2A;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px}h1{color:#e53e3e}p{color:#9B6B7A;margin-top:8px}</style></head>
        <body><div><div style="font-size:48px">⚠️</div><h1>Link inválido ou já utilizado</h1><p>Este link de confirmação não é mais válido.</p></div></body></html>`)
    }
    const { name } = result.rows[0]
    const frontendUrl = process.env.FRONTEND_URL || 'https://nossahistoria.vercel.app'
    res.send(`<!DOCTYPE html><html lang="pt-BR"><head><meta charset="UTF-8"><title>Nossa História</title>
      <style>body{background:#FFF0F3;color:#3D1A2A;font-family:sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;text-align:center;padding:24px}h1{color:#7C4D6B}p{color:#9B6B7A;margin-top:8px}.btn{display:inline-block;margin-top:24px;background:linear-gradient(135deg,#C9A0B0,#7C4D6B);color:#fff;padding:14px 32px;border-radius:12px;text-decoration:none;font-weight:bold}</style></head>
      <body><div><div style="font-size:48px">✅</div><h1>E-mail confirmado!</h1><p>Olá, ${name}! Sua conta está ativa.<br>Agora é só entrar no app e começar a sua história.</p><a class="btn" href="${frontendUrl}/login">Abrir o app</a></div></body></html>`)
  } catch (err) {
    console.error(err)
    res.status(500).send('Erro ao confirmar e-mail.')
  }
})

router.delete('/auth/account', authMiddleware, async (req: any, res) => {
  const { pool } = await import('../utils/db')
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
})

router.delete('/auth/couple/unlink', authMiddleware, async (req: any, res) => {
  const { pool } = await import('../utils/db')
  const { userId } = req
  try {
    const row = await pool.query('SELECT * FROM couples WHERE user1_id = $1 OR user2_id = $1 LIMIT 1', [userId])
    if (!row.rows[0]) return res.status(404).json({ error: 'Casal não encontrado' })
    const couple = row.rows[0]
    const { v4: uuidv4 } = await import('uuid')
    await pool.query(
      'UPDATE couples SET user2_id = NULL, invite_token = $1 WHERE id = $2',
      [uuidv4(), couple.id]
    )
    res.json({ success: true, message: 'Parceiro desvinculado' })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao desvincular' })
  }
})

// ─── Momentos ─────────────────────────────────────────────────────────────────
router.get('/moments', authMiddleware, getMoments)
router.post('/moments', authMiddleware, upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
]), createMoment)
router.post('/moments/:momentId/perspective', authMiddleware, addPerspective)
router.put('/moments/:id', authMiddleware, upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'audio', maxCount: 1 },
]), updateMoment)
router.delete('/moments/:id', authMiddleware, deleteMoment)

// ─── Perguntas ────────────────────────────────────────────────────────────────
router.get('/questions/answer-count', authMiddleware, async (req: any, res) => {
  const { pool } = await import('../utils/db')
  try {
    const row = await pool.query('SELECT id FROM couples WHERE user1_id = $1 OR user2_id = $1 LIMIT 1', [req.userId])
    const coupleId = row.rows[0]?.id
    if (!coupleId) return res.json({ count: 0 })
    const result = await pool.query(
      'SELECT COUNT(*) FROM question_answers WHERE couple_id = $1 AND user_id = $2',
      [coupleId, req.userId]
    )
    res.json({ count: parseInt(result.rows[0].count) })
  } catch (err) {
    res.status(500).json({ count: 0 })
  }
})

router.get('/questions/current', authMiddleware, getWeeklyQuestion)
router.post('/questions/answer', authMiddleware, answerQuestion)

// Seed protegido — apenas admins via ADMIN_SECRET no header
router.post('/questions/seed', async (req, res) => {
  const secret = req.headers['x-admin-secret']
  if (!secret || secret !== process.env.ADMIN_SECRET) {
    return res.status(403).json({ error: 'Acesso negado' })
  }
  return seedQuestions(req as any, res)
})

// ─── Pagamento ────────────────────────────────────────────────────────────────
router.post('/payment/create-order', authMiddleware, createOrder)
router.post('/payment/capture', authMiddleware, captureOrder)

// ─── Unlock dates ─────────────────────────────────────────────────────────────
router.get('/unlock-dates', authMiddleware, async (req: any, res) => {
  const { pool } = await import('../utils/db')
  const result = await pool.query(
    'SELECT * FROM unlock_dates WHERE couple_id = $1 ORDER BY unlock_date ASC',
    [req.coupleId]
  )
  res.json(result.rows)
})

// ─── Família ──────────────────────────────────────────────────────────────────
router.post('/family/share', authMiddleware, async (req: any, res) => {
  const { pool } = await import('../utils/db')
  const { v4: uuidv4 } = await import('uuid')
  const { email } = req.body
  const token = uuidv4()
  const expires = new Date()
  expires.setDate(expires.getDate() + 30)
  await pool.query(
    'INSERT INTO family_shares (couple_id, email, token, expires_at) VALUES ($1, $2, $3, $4)',
    [req.coupleId, email, token, expires]
  )
  const frontendUrl = process.env.FRONTEND_URL || 'https://nossahistoria.vercel.app'
  const shareUrl = `${frontendUrl}/familia/${token}`
  res.json({ shareUrl, token })
})

// ─── Deep link convite ────────────────────────────────────────────────────────
router.get('/convite/:token', (req, res) => {
  const { token } = req.params
  const frontendUrl = process.env.FRONTEND_URL || 'https://nossahistoria.vercel.app'
  const deepLink = `nossahistoria://convite/${token}`
  const playstoreLink = 'https://play.google.com/store/apps/details?id=com.nossahistoria.app'

  res.send(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nossa História — Aceitar convite</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #FFF0F3; color: #3D1A2A; font-family: sans-serif; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; }
    .icon { font-size: 64px; margin-bottom: 16px; }
    h1 { font-size: 24px; margin-bottom: 8px; color: #7C4D6B; }
    p { color: #9B6B7A; font-size: 14px; margin-bottom: 32px; line-height: 1.6; }
    .btn { display: block; background: linear-gradient(135deg,#C9A0B0,#7C4D6B); color: white; padding: 16px 32px; border-radius: 16px; text-decoration: none; font-weight: bold; font-size: 16px; margin-bottom: 16px; }
    .btn-secondary { display: block; color: #9B6B7A; font-size: 13px; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="icon">💍</div>
  <h1>Nossa História</h1>
  <p>Você foi convidado(a) para compartilhar momentos especiais.<br>Abra o app para aceitar o convite.</p>
  <a class="btn" href="${deepLink}" id="openApp">💌 Abrir no app</a>
  <a class="btn-secondary" href="${playstoreLink}">Não tem o app? Baixar na Play Store</a>
  <script>
    window.location.href = "${deepLink}";
  </script>
</body>
</html>`)
})

// ─── Cartas ───────────────────────────────────────────────────────────────────
router.get('/letters', authMiddleware, async (req: any, res) => {
  const { pool } = await import('../utils/db')
  try {
    const row = await pool.query('SELECT id FROM couples WHERE user1_id = $1 OR user2_id = $1 LIMIT 1', [req.userId])
    const coupleId = row.rows[0]?.id
    if (!coupleId) return res.json([])
    const result = await pool.query('SELECT * FROM letters WHERE couple_id = $1', [coupleId])
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar cartas' })
  }
})

router.post('/letters', authMiddleware, async (req: any, res) => {
  const { pool } = await import('../utils/db')
  const { capsule_key, text } = req.body
  if (!capsule_key || !text) return res.status(400).json({ error: 'Dados obrigatórios' })
  try {
    const row = await pool.query('SELECT id FROM couples WHERE user1_id = $1 OR user2_id = $1 LIMIT 1', [req.userId])
    const coupleId = row.rows[0]?.id
    if (!coupleId) return res.status(403).json({ error: 'Casal não encontrado' })
    const result = await pool.query(
      `INSERT INTO letters (couple_id, user_id, capsule_key, text, updated_at)
       VALUES ($1, $2, $3, $4, NOW())
       ON CONFLICT (couple_id, user_id, capsule_key)
       DO UPDATE SET text = $4, updated_at = NOW()
       RETURNING *`,
      [coupleId, req.userId, capsule_key, text]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar carta' })
  }
})

// ─── Álbum de convidados ──────────────────────────────────────────────────────
router.get('/album-token', authMiddleware, async (req: any, res) => {
  const { pool } = await import('../utils/db')
  const { v4: uuidv4 } = await import('uuid')
  try {
    const row = await pool.query(
      'SELECT id, album_token FROM couples WHERE user1_id = $1 OR user2_id = $1 LIMIT 1',
      [req.userId]
    )
    const couple = row.rows[0]
    if (!couple) return res.status(404).json({ error: 'Casal não encontrado' })

    // Garante que o token existe (para casais criados antes da migration)
    if (!couple.album_token) {
      const token = uuidv4()
      await pool.query('UPDATE couples SET album_token = $1 WHERE id = $2', [token, couple.id])
      return res.json({ album_token: token })
    }

    res.json({ album_token: couple.album_token })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar token do álbum' })
  }
})

router.get('/guest-posts/public/:token', async (req, res) => {
  const { pool } = await import('../utils/db')
  const { token } = req.params
  try {
    const coupleRow = await pool.query(
      'SELECT id FROM couples WHERE album_token = $1',
      [token]
    )
    if (!coupleRow.rows[0]) return res.status(404).json({ error: 'Álbum não encontrado' })
    const coupleId = coupleRow.rows[0].id
    const result = await pool.query(
      'SELECT id, name, message, photo_url, created_at FROM guest_posts WHERE couple_id = $1 ORDER BY created_at DESC',
      [coupleId]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar posts' })
  }
})

router.post('/guest-posts/public/:token', async (req, res) => {
  const { pool } = await import('../utils/db')
  const { v2: cloudinary } = await import('cloudinary')
  const { token } = req.params
  const { name, message, photo } = req.body
  if (!name || !message) return res.status(400).json({ error: 'Nome e mensagem obrigatórios' })
  try {
    const coupleRow = await pool.query(
      'SELECT id FROM couples WHERE album_token = $1',
      [token]
    )
    if (!coupleRow.rows[0]) return res.status(404).json({ error: 'Álbum não encontrado' })
    const coupleId = coupleRow.rows[0].id
    let photo_url = null
    if (photo) {
      try {
        const result = await cloudinary.uploader.upload(photo, { folder: 'nossa-historia/guest' })
        photo_url = result.secure_url
      } catch {}
    }
    const result = await pool.query(
      'INSERT INTO guest_posts (couple_id, name, message, photo_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [coupleId, name, message, photo_url]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar mensagem' })
  }
})

router.get('/guest-posts', authMiddleware, async (req: any, res) => {
  const { pool } = await import('../utils/db')
  try {
    const row = await pool.query('SELECT id FROM couples WHERE user1_id = $1 OR user2_id = $1 LIMIT 1', [req.userId])
    const coupleId = row.rows[0]?.id
    if (!coupleId) return res.json([])
    const result = await pool.query(
      'SELECT * FROM guest_posts WHERE couple_id = $1 ORDER BY created_at DESC',
      [coupleId]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar posts' })
  }
})

router.post('/guest-posts', authMiddleware, async (req: any, res) => {
  const { pool } = await import('../utils/db')
  const { v2: cloudinary } = await import('cloudinary')
  const { name, message, photo } = req.body
  if (!name || !message) return res.status(400).json({ error: 'Nome e mensagem obrigatórios' })
  try {
    const row = await pool.query('SELECT id FROM couples WHERE user1_id = $1 OR user2_id = $1 LIMIT 1', [req.userId])
    const coupleId = row.rows[0]?.id
    if (!coupleId) return res.status(403).json({ error: 'Casal não encontrado' })
    let photo_url = null
    if (photo) {
      try {
        const result = await cloudinary.uploader.upload(photo, { folder: 'nossa-historia/guest' })
        photo_url = result.secure_url
      } catch {}
    }
    const result = await pool.query(
      'INSERT INTO guest_posts (couple_id, name, message, photo_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [coupleId, name, message, photo_url]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar mensagem' })
  }
})

// ─── Armazenamento ────────────────────────────────────────────────────────────
import { getStorageInfo, createStorageOrder, captureStorageOrder } from '../controllers/storageController'
router.get('/storage', authMiddleware, getStorageInfo)
router.post('/storage/create-order', authMiddleware, createStorageOrder)
router.post('/storage/capture', authMiddleware, captureStorageOrder)

export default router
