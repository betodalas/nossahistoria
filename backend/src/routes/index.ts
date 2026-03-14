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
  const { weddingDate, coupleName, partnerName } = req.body
  const userId = req.userId
  try {
    const coupleResult = await pool.query(
      'SELECT * FROM couples WHERE user1_id = $1 OR user2_id = $1',
      [userId]
    )
    if (!coupleResult.rows[0]) {
      return res.status(404).json({ error: 'Casal não encontrado' })
    }
    const couple = coupleResult.rows[0]
    const updated = await pool.query(
      `UPDATE couples SET
        wedding_date = CASE WHEN $1::text IS NOT NULL THEN $1::date ELSE wedding_date END,
        couple_name  = CASE WHEN $2::text IS NOT NULL THEN $2 ELSE couple_name END
       WHERE id = $3 RETURNING *`,
      [weddingDate || null, coupleName || null, couple.id]
    )
    // Atualiza nome do parceiro na tabela users se fornecido
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
      'SELECT * FROM couples WHERE user1_id = $1 OR user2_id = $1',
      [req.userId]
    )
    res.json({ user: userResult.rows[0], couple: coupleResult.rows[0] || null })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar dados do usuário' })
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

export default router

// Armazenamento extra
import { getStorageInfo, createStorageOrder, captureStorageOrder } from '../controllers/storageController'
router.get('/storage', authMiddleware, getStorageInfo)
router.post('/storage/create-order', authMiddleware, createStorageOrder)
router.post('/storage/capture', authMiddleware, captureStorageOrder)
