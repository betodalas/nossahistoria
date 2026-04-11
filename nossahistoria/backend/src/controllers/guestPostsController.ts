import { Response } from 'express'
import { pool } from '../utils/db'
import { AuthRequest } from '../middleware/auth'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const uploadToCloudinary = (buffer: Buffer, options: object): Promise<any> =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) =>
      err ? reject(err) : resolve(result)
    )
    stream.end(buffer)
  })

export const getGuestPosts = async (req: AuthRequest, res: Response) => {
  try {
    const row = await pool.query(
      'SELECT id FROM couples WHERE user1_id = $1 OR user2_id = $1 LIMIT 1',
      [req.userId]
    )
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
}

export const createGuestPost = async (req: AuthRequest, res: Response) => {
  const { name, message } = req.body
  if (!name || !message) return res.status(400).json({ error: 'Nome e mensagem obrigatórios' })
  try {
    const row = await pool.query(
      'SELECT id FROM couples WHERE user1_id = $1 OR user2_id = $1 LIMIT 1',
      [req.userId]
    )
    const coupleId = row.rows[0]?.id
    if (!coupleId) return res.status(403).json({ error: 'Casal não encontrado' })

    let photo_url: string | null = null
    const files = (req as any).files || {}
    // Agora recebe via multipart/form-data (não mais base64 em JSON)
    if (files.photo?.[0]) {
      const file = files.photo[0]
      if (file.size > 5 * 1024 * 1024) {
        return res.status(400).json({ error: 'Foto muito grande. Máximo 5 MB.' })
      }
      try {
        const uploaded = await uploadToCloudinary(file.buffer, {
          folder: 'nossa-historia/guest',
          resource_type: 'image',
        })
        photo_url = uploaded.secure_url
      } catch (uploadErr) {
        console.error('[GUEST POST] Upload falhou:', uploadErr)
      }
    }

    const result = await pool.query(
      'INSERT INTO guest_posts (couple_id, name, message, photo_url) VALUES ($1, $2, $3, $4) RETURNING *',
      [coupleId, name, message, photo_url]
    )
    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar mensagem' })
  }
}
