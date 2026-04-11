import { Router } from 'express'
import {
  register,
  login,
  googleLogin,
  createCouple,
  forgotPassword,
  resetPassword,
  getMe,
  updateCouple,
  sendInvite,
  acceptInvite,
  verifyEmail,
  deleteAccount,
} from '../controllers/authController'
import { getMoments, createMoment, addPerspective, deleteMoment, updateMoment } from '../controllers/momentsController'
import { getWeeklyQuestion, answerQuestion, seedQuestions, getAnswerCount } from '../controllers/questionsController'
import { createOrder, captureOrder } from '../controllers/paymentController'
import { getStorageInfo, createStorageOrder, captureStorageOrder } from '../controllers/storageController'
import { getLetters, saveLetter } from '../controllers/lettersController'
import { getGuestPosts, createGuestPost } from '../controllers/guestPostsController'
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
router.get('/auth/verify-email', verifyEmail)

router.get('/auth/me', authMiddleware, getMe)
router.post('/auth/couple', authMiddleware, createCouple)
router.put('/auth/couple', authMiddleware, updateCouple)
router.post('/auth/invite', authMiddleware, sendInvite)
router.post('/auth/invite/accept', authMiddleware, acceptInvite)
router.delete('/auth/account', authMiddleware, deleteAccount)

// APENAS em development — remove em produção para evitar abuso
if (process.env.NODE_ENV !== 'production') {
  router.delete('/auth/couple/unlink', authMiddleware, async (req: any, res) => {
    const { pool } = await import('../utils/db')
    const { v4: uuidv4 } = await import('uuid')
    const { userId } = req
    try {
      const row = await pool.query('SELECT * FROM couples WHERE user1_id = $1 OR user2_id = $1 LIMIT 1', [userId])
      if (!row.rows[0]) return res.status(404).json({ error: 'Casal não encontrado' })
      const couple = row.rows[0]
      await pool.query('UPDATE couples SET user2_id = NULL, invite_token = $1 WHERE id = $2', [uuidv4(), couple.id])
      res.json({ success: true, message: 'Parceiro desvinculado (apenas dev)' })
    } catch (err) {
      res.status(500).json({ error: 'Erro ao desvincular' })
    }
  })
}

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
  <script>window.location.href = "${deepLink}";</script>
</body>
</html>`)
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
router.get('/questions/answer-count', authMiddleware, getAnswerCount)
router.get('/questions/current', authMiddleware, getWeeklyQuestion)
router.post('/questions/answer', authMiddleware, answerQuestion)
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

// ─── Cartas ───────────────────────────────────────────────────────────────────
router.get('/letters', authMiddleware, getLetters)
router.post('/letters', authMiddleware, saveLetter)

// ─── Álbum de convidados ──────────────────────────────────────────────────────
router.get('/guest-posts', authMiddleware, getGuestPosts)
router.post('/guest-posts', authMiddleware, upload.fields([{ name: 'photo', maxCount: 1 }]), createGuestPost)

// ─── Armazenamento ────────────────────────────────────────────────────────────
router.get('/storage', authMiddleware, getStorageInfo)
router.post('/storage/create-order', authMiddleware, createStorageOrder)
router.post('/storage/capture', authMiddleware, captureStorageOrder)

export default router
