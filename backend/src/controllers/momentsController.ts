import { Response } from 'express'
import { pool } from '../utils/db'
import { AuthRequest } from '../middleware/auth'
import { v2 as cloudinary } from 'cloudinary'
import { notifyPartnerNewMoment } from './notificationsController'

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
})

const FREE_MOMENTS_LIMIT = 15
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
  const { coupleId } = req
  if (!coupleId) return res.json([])
  try {
    const result = await pool.query(
      `SELECT m.*, 
        json_agg(json_build_object('userId', p.user_id, 'text', p.text)) FILTER (WHERE p.id IS NOT NULL) as perspectives
       FROM moments m
       LEFT JOIN perspectives p ON p.moment_id = m.id
       WHERE m.couple_id = $1
       GROUP BY m.id
       ORDER BY m.moment_date ASC`,
      [coupleId]
    )
    res.json(result.rows)
  } catch (err) {
    console.error('[getMoments] Erro ao buscar momentos:', err)
    res.status(500).json({ error: 'Erro ao buscar momentos' })
  }
}

export const createMoment = async (req: AuthRequest, res: Response) => {
  const { coupleId, userId } = req
  const { title, description, moment_date, music_name, music_link, voice_duration } = req.body

  if (!coupleId) return res.status(400).json({ error: 'Você precisa vincular um casal antes de adicionar momentos.' })

  try {
    const coupleResult = await pool.query('SELECT is_premium FROM couples WHERE id = $1', [coupleId])
    const isPremium = coupleResult.rows[0]?.is_premium

    // Limite de momentos (só para free)
    const count = await pool.query('SELECT COUNT(*) FROM moments WHERE couple_id = $1', [coupleId])
    const momentCount = parseInt(count.rows[0].count)

    if (!isPremium && momentCount >= FREE_MOMENTS_LIMIT) {
      return res.status(403).json({
        error: `Plano gratuito permite até ${FREE_MOMENTS_LIMIT} momentos. Faça upgrade para premium!`,
        isPremium
      })
    }

    const files = (req as any).files || {}
    let photo_url = null
    let voice_url = null
    const audioDuration = parseInt(voice_duration || '0')

    // Validação de foto (disponível para free e premium)
    if (files.photo?.[0]) {
      if (files.photo[0].size > MAX_PHOTO_BYTES) {
        return res.status(400).json({ error: 'Foto muito grande. Máximo permitido: 5 MB.' })
      }

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
    notifyPartnerNewMoment(coupleId!, userId!, title).catch(() => {})
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao criar momento' })
  }
}

export const updateMoment = async (req: AuthRequest, res: Response) => {
  const { coupleId } = req
  const { id } = req.params
  const { title, description, moment_date, music_name, music_link, voice_duration } = req.body

  try {
    // Verifica se o momento pertence ao casal
    const existing = await pool.query(
      'SELECT * FROM moments WHERE id = $1 AND couple_id = $2',
      [id, coupleId]
    )
    if (existing.rows.length === 0) {
      return res.status(404).json({ error: 'Momento não encontrado.' })
    }
    const moment = existing.rows[0]

    const coupleResult = await pool.query('SELECT is_premium FROM couples WHERE id = $1', [coupleId])
    const isPremium = coupleResult.rows[0]?.is_premium

    const files = (req as any).files || {}
    let photo_url = moment.photo_url
    let voice_url = moment.voice_url
    const audioDuration = parseInt(voice_duration || String(moment.voice_duration || 0))

    // Troca de foto (disponível para free e premium)
    if (files.photo?.[0]) {
      if (files.photo[0].size > MAX_PHOTO_BYTES) {
        return res.status(400).json({ error: 'Foto muito grande. Máximo permitido: 5 MB.' })
      }
      const result = await uploadToCloudinary(files.photo[0].buffer, {
        folder: 'nossa-historia/photos',
        resource_type: 'image'
      })
      photo_url = result?.secure_url || photo_url
    }

    // Troca de áudio
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
      const result = await uploadToCloudinary(files.audio[0].buffer, {
        folder: 'nossa-historia/audios',
        resource_type: 'video'
      })
      voice_url = result?.secure_url || voice_url
    }

    const photoSize = files.photo?.[0]?.size || moment.photo_size || 0
    const audioSize = files.audio?.[0]?.size || moment.audio_size || 0

    const result = await pool.query(
      `UPDATE moments 
       SET title = COALESCE($1, title),
           description = COALESCE($2, description),
           moment_date = COALESCE($3::date, moment_date),
           music_name = $4,
           music_link = $5,
           photo_url = $6,
           voice_url = $7,
           voice_duration = $8,
           photo_size = $9,
           audio_size = $10
       WHERE id = $11 AND couple_id = $12
       RETURNING *`,
      [title, description, moment_date, music_name || null, music_link || null,
       photo_url, voice_url, audioDuration, photoSize, audioSize, id, coupleId]
    )
    res.json(result.rows[0])
  } catch (err) {
    console.error('[updateMoment]', err)
    res.status(500).json({ error: 'Erro ao atualizar momento' })
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