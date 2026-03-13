import { Router } from 'express'
import { register, login, createCouple } from '../controllers/authController'
import { getMoments, createMoment, addPerspective, deleteMoment } from '../controllers/momentsController'
import { getWeeklyQuestion, answerQuestion, seedQuestions } from '../controllers/questionsController'
import { createOrder, captureOrder } from '../controllers/paymentController'
import { authMiddleware } from '../middleware/auth'

const router = Router()

// Auth
router.post('/auth/register', register)
router.post('/auth/login', login)
router.post('/auth/couple', authMiddleware, createCouple)

// Momentos (gratuito com limite)
router.get('/moments', authMiddleware, getMoments)
router.post('/moments', authMiddleware, createMoment)
router.post('/moments/:momentId/perspective', authMiddleware, addPerspective)
router.delete('/moments/:id', authMiddleware, deleteMoment)

// Perguntas (gratuito com limite semanal)
router.get('/questions/current', authMiddleware, getWeeklyQuestion)
router.post('/questions/answer', authMiddleware, answerQuestion)
router.post('/questions/seed', seedQuestions) // apenas para dev

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

// Compartilhar com família (premium)
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
