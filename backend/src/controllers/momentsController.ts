import { Response } from 'express'
import { pool } from '../utils/db'
import { AuthRequest } from '../middleware/auth'

const FREE_MOMENTS_LIMIT = 5

export const getMoments = async (req: AuthRequest, res: Response) => {
  const { coupleId } = req
  try {
    const result = await pool.query(
      `SELECT m.*, 
        json_agg(json_build_object('userId', p.user_id, 'text', p.text)) FILTER (WHERE p.id IS NOT NULL) as perspectives
       FROM moments m
       LEFT JOIN perspectives p ON p.moment_id = m.id
       WHERE m.couple_id = $1
       ORDER BY m.moment_date ASC`,
      [coupleId]
    )
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar momentos' })
  }
}

export const createMoment = async (req: AuthRequest, res: Response) => {
  const { coupleId, userId } = req
  const { title, description, moment_date, music_name } = req.body

  try {
    // Verificar limite gratuito
    const coupleResult = await pool.query('SELECT is_premium FROM couples WHERE id = $1', [coupleId])
    const isPremium = coupleResult.rows[0]?.is_premium

    if (!isPremium) {
      const count = await pool.query('SELECT COUNT(*) FROM moments WHERE couple_id = $1', [coupleId])
      if (parseInt(count.rows[0].count) >= FREE_MOMENTS_LIMIT) {
        return res.status(403).json({
          error: `Plano gratuito permite até ${FREE_MOMENTS_LIMIT} momentos. Faça upgrade para premium!`,
          isPremium: false
        })
      }
    }

    const photo_url = (req as any).file?.path || null

    const result = await pool.query(
      `INSERT INTO moments (couple_id, title, description, moment_date, music_name, photo_url, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
      [coupleId, title, description, moment_date, music_name, photo_url, userId]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao criar momento' })
  }
}

export const addPerspective = async (req: AuthRequest, res: Response) => {
  const { userId } = req
  const { momentId } = req.params
  const { text } = req.body

  try {
    const result = await pool.query(
      `INSERT INTO perspectives (moment_id, user_id, text)
       VALUES ($1, $2, $3)
       ON CONFLICT (moment_id, user_id) DO UPDATE SET text = $3
       RETURNING *`,
      [momentId, userId, text]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar perspectiva' })
  }
}

export const deleteMoment = async (req: AuthRequest, res: Response) => {
  const { coupleId } = req
  const { id } = req.params
  try {
    await pool.query('DELETE FROM moments WHERE id = $1 AND couple_id = $2', [id, coupleId])
    res.json({ success: true })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao deletar momento' })
  }
}
