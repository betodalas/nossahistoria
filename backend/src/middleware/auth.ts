import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'

export interface AuthRequest extends Request {
  userId?: string
  coupleId?: string
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(' ')[1]
  if (!token) return res.status(401).json({ error: 'Token não fornecido' })

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { userId: string; coupleId?: string }
    req.userId = decoded.userId
    req.coupleId = decoded.coupleId
    next()
  } catch {
    return res.status(401).json({ error: 'Token inválido ou expirado' })
  }
}

export const premiumMiddleware = async (req: AuthRequest, res: Response, next: NextFunction) => {
  if (!req.coupleId) return res.status(403).json({ error: 'Casal não encontrado' })

  const { pool } = await import('../utils/db')
  const result = await pool.query('SELECT is_premium FROM couples WHERE id = $1', [req.coupleId])
  if (!result.rows[0]?.is_premium) {
    return res.status(403).json({ error: 'Funcionalidade exclusiva para plano premium', isPremium: false })
  }
  next()
}
