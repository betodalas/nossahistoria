import { Response } from 'express'
import { pool } from '../utils/db'
import { AuthRequest } from '../middleware/auth'

export const getLetters = async (req: AuthRequest, res: Response) => {
  try {
    const row = await pool.query(
      'SELECT id FROM couples WHERE user1_id = $1 OR user2_id = $1 LIMIT 1',
      [req.userId]
    )
    const coupleId = row.rows[0]?.id
    if (!coupleId) return res.json([])
    const result = await pool.query('SELECT * FROM letters WHERE couple_id = $1', [coupleId])
    res.json(result.rows)
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar cartas' })
  }
}

export const saveLetter = async (req: AuthRequest, res: Response) => {
  const { capsule_key, text } = req.body
  if (!capsule_key || !text) return res.status(400).json({ error: 'Dados obrigatórios' })
  try {
    const row = await pool.query(
      'SELECT id FROM couples WHERE user1_id = $1 OR user2_id = $1 LIMIT 1',
      [req.userId]
    )
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
}
