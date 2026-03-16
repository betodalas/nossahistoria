import { Router } from 'express'
import { register, login, googleLogin, createCouple } from '../controllers/authController'
import { getMoments, createMoment, addPerspective, deleteMoment } from '../controllers/momentsController'
import { getWeeklyQuestion, answerQuestion, seedQuestions } from '../controllers/questionsController'
import { createOrder, captureOrder } from '../controllers/paymentController'
import { authMiddleware } from '../middleware/auth'
import multer from 'multer'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })

// Auth
router.post('/auth/register', register)
router.post('/auth/login', login)
router.post('/auth/google', googleLogin)
router.post('/auth/couple', authMiddleware, createCouple)

// Atualiza dados do casal existente (nome, data casamento)
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
    // Se não tem casal, cria um solo (sem parceiro) para salvar os dados
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
    // Se tem parceiro real, atualiza o nome dele também
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
    // Busca casal pelo userId — não depende do coupleId no token
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

// Envia convite por email para o parceiro
router.post('/auth/invite', authMiddleware, async (req: any, res) => {
  const { pool } = await import('../utils/db')
  const { v4: uuidv4 } = await import('uuid')
  const { sendInviteEmail } = await import('../utils/email')
  const { partnerEmail } = req.body
  if (!partnerEmail) return res.status(400).json({ error: 'Email do parceiro obrigatório' })
  try {
    const userResult = await pool.query('SELECT name FROM users WHERE id = $1', [req.userId])
    const fromName = userResult.rows[0]?.name || 'Seu amor'

    // Busca ou cria casal para pegar o invite_token
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
    const baseUrl = 'https://nossahistoria-xtjq.onrender.com/api'
    const inviteLink = `${baseUrl}/convite/${couple.invite_token}`

    // Retorna o link imediatamente
    res.json({ success: true, inviteLink, emailSent: true })

    // Envia email em background
    sendInviteEmail({ toEmail: partnerEmail, fromName, coupleName: couple.couple_name || '', inviteLink })
      .then(() => console.log(`[INVITE] Email enviado para ${partnerEmail}`))
      .catch((err: any) => console.error('[INVITE] Email falhou:', err?.message))
      .then(() => console.log(`[INVITE] Email enviado para ${partnerEmail}`))
      .catch((err: any) => console.error('[INVITE] Email falhou:', err?.message))
  } catch (err: any) {
    console.error('Erro no convite:', err)
    res.status(500).json({ error: 'Erro ao processar convite.' })
  }
})

// Aceitar convite pelo token
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
    // Vincula o segundo usuário ao casal
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

// Momentos — aceita foto e áudio
router.get('/moments', authMiddleware, getMoments)
router.post('/moments', authMiddleware, upload.fields([
  { name: 'photo', maxCount: 1 },
  { name: 'audio', maxCount: 1 }
]), createMoment)
router.post('/moments/:momentId/perspective', authMiddleware, addPerspective)
router.delete('/moments/:id', authMiddleware, deleteMoment)

// Perguntas
router.get('/questions/current', authMiddleware, getWeeklyQuestion)
router.post('/questions/answer', authMiddleware, answerQuestion)
router.post('/questions/seed', seedQuestions)

// Zera todas as respostas do casal (para recomeçar)
router.delete('/questions/reset', authMiddleware, async (req: any, res) => {
  const { pool } = await import('../utils/db')
  const { userId } = req
  let { coupleId } = req
  try {
    if (!coupleId) {
      const row = await pool.query('SELECT id FROM couples WHERE user1_id = $1 OR user2_id = $1 LIMIT 1', [userId])
      coupleId = row.rows[0]?.id
    }
    if (!coupleId) return res.status(404).json({ error: 'Casal não encontrado' })
    const result = await pool.query('DELETE FROM question_answers WHERE couple_id = $1', [coupleId])
    res.json({ success: true, deleted: result.rowCount })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao zerar respostas' })
  }
})

// Pagamento PayPal
router.post('/payment/create-order', authMiddleware, createOrder)
router.post('/payment/capture', authMiddleware, captureOrder)

// Unlock dates
router.get('/unlock-dates', authMiddleware, async (req: any, res) => {
  const { pool } = await import('../utils/db')
  const result = await pool.query(
    'SELECT * FROM unlock_dates WHERE couple_id = $1 ORDER BY unlock_date ASC',
    [req.coupleId]
  )
  res.json(result.rows)
})

// Compartilhar com família
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
  const shareUrl = `${process.env.FRONTEND_URL}/familia/${token}`
  res.json({ shareUrl, token })
})

// Página de redirecionamento do convite — abre o app via deep link
router.get('/convite/:token', (req, res) => {
  const { token } = req.params
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
    body { background: #0f0a1a; color: white; font-family: sans-serif; min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 24px; text-align: center; }
    .icon { font-size: 64px; margin-bottom: 16px; }
    h1 { font-size: 24px; margin-bottom: 8px; color: #c084fc; }
    p { color: rgba(255,255,255,0.6); font-size: 14px; margin-bottom: 32px; line-height: 1.6; }
    .btn { display: block; background: linear-gradient(135deg,#7c3aed,#be185d); color: white; padding: 16px 32px; border-radius: 16px; text-decoration: none; font-weight: bold; font-size: 16px; margin-bottom: 16px; }
    .btn-secondary { display: block; color: rgba(255,255,255,0.5); font-size: 13px; text-decoration: underline; }
  </style>
</head>
<body>
  <div class="icon">💍</div>
  <h1>Nossa História</h1>
  <p>Você foi convidado(a) para compartilhar momentos especiais.<br>Abra o app para aceitar o convite.</p>
  <a class="btn" href="${deepLink}" id="openApp">💌 Abrir no app</a>
  <a class="btn-secondary" href="${playstoreLink}">Não tem o app? Baixar na Play Store</a>
  <script>
    // Tenta abrir o app automaticamente
    window.location.href = "${deepLink}";
    // Se não abrir em 2s, mostra o botão
    setTimeout(() => {
      document.getElementById('openApp').style.display = 'block';
    }, 2000);
  </script>
</body>
</html>`)
})

export default router

// Armazenamento extra
import { getStorageInfo, createStorageOrder, captureStorageOrder } from '../controllers/storageController'
router.get('/storage', authMiddleware, getStorageInfo)
router.post('/storage/create-order', authMiddleware, createStorageOrder)
router.post('/storage/capture', authMiddleware, captureStorageOrder)
