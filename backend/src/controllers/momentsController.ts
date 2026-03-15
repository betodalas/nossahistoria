import { Response } from 'express'
import { pool } from '../utils/db'
import { AuthRequest } from '../middleware/auth'
import { v2 as cloudinary } from 'cloudinary'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const FREE_MOMENTS_LIMIT = 5
const PREMIUM_MOMENTS_LIMIT = 50
const MAX_PHOTO_BYTES = 5 * 1024 * 1024       // 5 MB
const MAX_AUDIO_BYTES = 10 * 1024 * 1024      // 10 MB (~2 min webm)
const MAX_AUDIO_DURATION = 120                 // 2 minutos em segundos
const MAX_STORAGE_BYTES = 500 * 1024 * 1024   // 500 MB por casal

const uploadToCloudinary = (buffer: Buffer, options: object): Promise<any> =>
  new Promise((resolve, reject) => {
    const stream = cloudinary.uploader.upload_stream(options, (err, result) =>
      err ? reject(err) : resolve(result)
    )
    stream.end(buffer)
  })

export const getMoments = async (req: AuthRequest, res: Response) => {
  const { userId } = req
  let { coupleId } = req
  if (!coupleId) {
    const row = await pool.query('SELECT id FROM couples WHERE user1_id = $1 OR user2_id = $1 LIMIT 1', [userId])
    coupleId = row.rows[0]?.id
  }
  if (!coupleId) return res.json([])
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
  const { userId } = req
  let { coupleId } = req
  const { title, description, moment_date, music_name, music_link, voice_duration } = req.body

  if (!coupleId) {
    const row = await pool.query('SELECT id FROM couples WHERE user1_id = $1 OR user2_id = $1 LIMIT 1', [userId])
    coupleId = row.rows[0]?.id
  }
  if (!coupleId) return res.status(400).json({ error: 'Configure seu perfil antes de adicionar momentos.' })

  try {
    const coupleResult = await pool.query('SELECT is_premium FROM couples WHERE id = $1', [coupleId])
    const isPremium = coupleResult.rows[0]?.is_premium

    // Limite de momentos
    const count = await pool.query('SELECT COUNT(*) FROM moments WHERE couple_id = $1', [coupleId])
    const momentCount = parseInt(count.rows[0].count)
    const limit = isPremium ? PREMIUM_MOMENTS_LIMIT : FREE_MOMENTS_LIMIT

    if (momentCount >= limit) {
      return res.status(403).json({
        error: isPremium
          ? `Limite de ${PREMIUM_MOMENTS_LIMIT} momentos atingido.`
          : `Plano gratuito permite até ${FREE_MOMENTS_LIMIT} momentos. Faça upgrade para premium!`,
        isPremium
      })
    }

    const files = (req as any).files || {}
    let photo_url = null
    let voice_url = null
    const audioDuration = parseInt(voice_duration || '0')

    // Validação de foto
    if (files.photo?.[0]) {
      if (!isPremium) {
        return res.status(403).json({ error: 'Upload de fotos é exclusivo do plano premium.', isPremium: false })
      }
      if (files.photo[0].size > MAX_PHOTO_BYTES) {
        return res.status(400).json({ error: 'Foto muito grande. Máximo permitido: 5 MB.' })
      }

      // Verifica armazenamento total do casal
      const storageUsed = await pool.query(
        'SELECT COALESCE(SUM(photo_size + audio_size), 0) as total FROM moments WHERE couple_id = $1',
        [coupleId]
      )
      const extraStorage = await pool.query(
        'SELECT COALESCE(SUM(extra_mb), 0) as extra FROM storage_purchases WHERE couple_id = $1',
        [coupleId]
      )
      const usedBytes = parseInt(storageUsed.rows[0].total || '0')
      const extraBytes = parseInt(extraStorage.rows[0].extra || '0') * 1024 * 1024
      const totalBytes = MAX_STORAGE_BYTES + extraBytes
      if (usedBytes + files.photo[0].size > totalBytes) {
        return res.status(403).json({ error: 'Limite de armazenamento atingido. Adquira mais espaço em Perfil → Armazenamento.' })
      }

      const result = await uploadToCloudinary(files.photo[0].buffer, {
        folder: 'nossa-historia/photos',
        resource_type: 'image'
      })
      photo_url = result?.secure_url || null
    }

    // Validação de áudio
    if (files.audio?.[0]) {
      if (!isPremium) {
        return res.status(403).json({ error: 'Mensagens de voz são exclusivas do plano premium.', isPremium: false })
      }
      if (files.audio[0].size > MAX_AUDIO_BYTES) {
        return res.status(400).json({ error: 'Áudio muito grande. Máximo: 10 MB.' })
      }
      if (audioDuration > MAX_AUDIO_DURATION) {
        return res.status(400).json({ error: 'Áudio muito longo. Máximo: 2 minutos.' })
      }

      const storageUsed2 = await pool.query(
        'SELECT COALESCE(SUM(photo_size + audio_size), 0) as total FROM moments WHERE couple_id = $1',
        [coupleId]
      )
      const extraStorage2 = await pool.query(
        'SELECT COALESCE(SUM(extra_mb), 0) as extra FROM storage_purchases WHERE couple_id = $1',
        [coupleId]
      )
      const usedBytes2 = parseInt(storageUsed2.rows[0].total || '0')
      const extraBytes2 = parseInt(extraStorage2.rows[0].extra || '0') * 1024 * 1024
      const totalBytes2 = MAX_STORAGE_BYTES + extraBytes2
      if (usedBytes2 + files.audio[0].size > totalBytes2) {
        return res.status(403).json({ error: 'Limite de armazenamento atingido. Adquira mais espaço em Perfil → Armazenamento.' })
      }

      const result = await uploadToCloudinary(files.audio[0].buffer, {
        folder: 'nossa-historia/audios',
        resource_type: 'video'
      })
      voice_url = result?.secure_url || null
    }

    const photoSize = files.photo?.[0]?.size || 0
    const audioSize = files.audio?.[0]?.size || 0

    const result = await pool.query(
      `INSERT INTO moments (couple_id, title, description, moment_date, music_name, music_link, photo_url, voice_url, voice_duration, photo_size, audio_size, created_by)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12) RETURNING *`,
      [coupleId, title, description, moment_date, music_name, music_link, photo_url, voice_url, audioDuration, photoSize, audioSize, userId]
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

