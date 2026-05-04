import { Response } from 'express'
import { pool } from '../utils/db'
import { AuthRequest } from '../middleware/auth'

// Tipos de datas pré-definidos com emojis padrão
export const DATE_TYPE_DEFAULTS: Record<string, { label: string; emoji: string }> = {
  first_date:       { label: 'Primeiro encontro',       emoji: '✨' },
  engagement:       { label: 'Pedido de noivado',       emoji: '💍' },
  anniversary:      { label: 'Aniversário de namoro',   emoji: '❤️' },
  wedding:          { label: 'Casamento',               emoji: '💒' },
  first_kiss:       { label: 'Primeiro beijo',          emoji: '💋' },
  first_trip:       { label: 'Primeira viagem juntos',  emoji: '✈️' },
  moved_together:   { label: 'Passaram a morar juntos', emoji: '🏠' },
  custom:           { label: 'Data especial',           emoji: '💕' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

async function getCoupleId(userId: string): Promise<string | null> {
  const result = await pool.query(
    'SELECT id FROM couples WHERE user1_id = $1 OR user2_id = $1 LIMIT 1',
    [userId]
  )
  return result.rows[0]?.id ?? null
}

function normalizeDate(raw: any): string {
  // Postgres pode retornar Date object ou string ISO '2003-04-23T00:00:00.000Z'
  if (raw instanceof Date) {
    return raw.toISOString().split('T')[0]
  }
  // string ISO com T
  if (typeof raw === 'string' && raw.includes('T')) {
    return raw.split('T')[0]
  }
  return String(raw)
}

function calcCounters(dateStr: string) {
  const normalized = normalizeDate(dateStr)
  const [y, m, d] = normalized.split('-').map(Number)
  const target = new Date(y, m - 1, d)   // local, sem fuso
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  const diffMs = today.getTime() - target.getTime()
  const totalDays = Math.floor(diffMs / (1000 * 60 * 60 * 24))
  const isPast = diffMs >= 0

  // Próximo aniversário anual
  const nextAnniversary = new Date(today.getFullYear(), target.getMonth(), target.getDate())
  if (nextAnniversary < today) nextAnniversary.setFullYear(today.getFullYear() + 1)
  const daysToNextAnniversary = Math.ceil((nextAnniversary.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

  // Anos e meses completados
  let years = today.getFullYear() - target.getFullYear()
  let months = today.getMonth() - target.getMonth()
  if (months < 0) { years--; months += 12 }
  if (today.getDate() < target.getDate()) months--
  if (months < 0) { years--; months += 11 }

  return { totalDays, isPast, years, months: years * 12 + months, daysToNextAnniversary }
}

// ─── GET /special-dates ───────────────────────────────────────────────────────

export const getSpecialDates = async (req: AuthRequest, res: Response) => {
  try {
    const coupleId = await getCoupleId(req.userId!)
    if (!coupleId) return res.json([])

    const result = await pool.query(
      'SELECT * FROM special_dates WHERE couple_id = $1 ORDER BY date ASC',
      [coupleId]
    )

    const dates = result.rows.map(row => {
      const dateStr = normalizeDate(row.date)
      return {
        ...row,
        date: dateStr,
        counters: calcCounters(dateStr),
      }
    })

    res.json(dates)
  } catch (err) {
    console.error('[getSpecialDates]', err)
    res.status(500).json({ error: 'Erro ao buscar datas especiais' })
  }
}

// ─── POST /special-dates ──────────────────────────────────────────────────────

export const createSpecialDate = async (req: AuthRequest, res: Response) => {
  const { label, date, emoji, type, show_in_dashboard, show_in_capsules, photo } = req.body
  if (!label || !date) return res.status(400).json({ error: 'label e date são obrigatórios' })

  try {
    const coupleId = await getCoupleId(req.userId!)
    if (!coupleId) return res.status(403).json({ error: 'Casal não encontrado' })

    const resolvedEmoji = emoji || DATE_TYPE_DEFAULTS[type]?.emoji || '💕'
    const resolvedType = type || 'custom'

    let photo_url: string | null = null
    if (photo) {
      const { v2: cloudinary } = await import('cloudinary')
      const result = await cloudinary.uploader.upload(photo, {
        folder: 'special_dates',
        transformation: [{ width: 1200, quality: 'auto', fetch_format: 'auto' }],
      })
      photo_url = result.secure_url
    }

    const result = await pool.query(
      `INSERT INTO special_dates
         (couple_id, label, date, emoji, type, photo_url, show_in_dashboard, show_in_capsules)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
       RETURNING *`,
      [
        coupleId, label, date, resolvedEmoji, resolvedType, photo_url,
        show_in_dashboard !== false,
        show_in_capsules !== false,
      ]
    )

    const row = result.rows[0]
    const dateStr = normalizeDate(row.date)
    res.status(201).json({
      ...row,
      date: dateStr,
      counters: calcCounters(dateStr),
    })
  } catch (err) {
    console.error('[createSpecialDate]', err)
    res.status(500).json({ error: 'Erro ao criar data especial' })
  }
}

// ─── PUT /special-dates/:id ───────────────────────────────────────────────────

export const updateSpecialDate = async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const { label, date, emoji, type, show_in_dashboard, show_in_capsules, photo, remove_photo } = req.body

  try {
    const coupleId = await getCoupleId(req.userId!)
    if (!coupleId) return res.status(403).json({ error: 'Casal não encontrado' })

    let photo_url: string | null | undefined = undefined
    if (remove_photo) {
      photo_url = null
    } else if (photo) {
      const { v2: cloudinary } = await import('cloudinary')
      const result = await cloudinary.uploader.upload(photo, {
        folder: 'special_dates',
        transformation: [{ width: 1200, quality: 'auto', fetch_format: 'auto' }],
      })
      photo_url = result.secure_url
    }

    const result = await pool.query(
      `UPDATE special_dates SET
         label             = COALESCE($1, label),
         date              = COALESCE($2::date, date),
         emoji             = COALESCE($3, emoji),
         type              = COALESCE($4, type),
         show_in_dashboard = COALESCE($5, show_in_dashboard),
         show_in_capsules  = COALESCE($6, show_in_capsules),
         photo_url         = CASE WHEN $7::boolean THEN NULL WHEN $8::text IS NOT NULL THEN $8::text ELSE photo_url END
       WHERE id = $9 AND couple_id = $10
       RETURNING *`,
      [
        label || null, date || null, emoji || null, type || null,
        show_in_dashboard ?? null, show_in_capsules ?? null,
        remove_photo ? true : false,
        photo_url ?? null,
        id, coupleId,
      ]
    )

    if (!result.rows[0]) return res.status(404).json({ error: 'Data não encontrada' })

    const row = result.rows[0]
    const dateStr = normalizeDate(row.date)
    res.json({
      ...row,
      date: dateStr,
      counters: calcCounters(dateStr),
    })
  } catch (err) {
    console.error('[updateSpecialDate]', err)
    res.status(500).json({ error: 'Erro ao atualizar data especial' })
  }
}

// ─── DELETE /special-dates/:id ────────────────────────────────────────────────

export const deleteSpecialDate = async (req: AuthRequest, res: Response) => {
  const { id } = req.params

  try {
    const coupleId = await getCoupleId(req.userId!)
    if (!coupleId) return res.status(403).json({ error: 'Casal não encontrado' })

    const result = await pool.query(
      'DELETE FROM special_dates WHERE id = $1 AND couple_id = $2 RETURNING id',
      [id, coupleId]
    )

    if (!result.rows[0]) return res.status(404).json({ error: 'Data não encontrada' })
    res.json({ success: true })
  } catch (err) {
    console.error('[deleteSpecialDate]', err)
    res.status(500).json({ error: 'Erro ao excluir data especial' })
  }
}

// ─── GET /special-dates/for-capsules ─────────────────────────────────────────
// Retorna datas formatadas para uso nas cápsulas do tempo

export const getDatesForCapsules = async (req: AuthRequest, res: Response) => {
  try {
    const coupleId = await getCoupleId(req.userId!)
    if (!coupleId) return res.json([])

    // Busca datas especiais + a data de casamento do casal (se existir)
    const [datesResult, coupleResult] = await Promise.all([
      pool.query(
        `SELECT * FROM special_dates
         WHERE couple_id = $1 AND show_in_capsules = TRUE
         ORDER BY date ASC`,
        [coupleId]
      ),
      pool.query('SELECT wedding_date, couple_name FROM couples WHERE id = $1', [coupleId]),
    ])

    const rows = datesResult.rows.map(row => {
      const dateStr = normalizeDate(row.date)
      const c = calcCounters(dateStr)
      return {
        id: row.id,
        label: row.label,
        date: dateStr,
        emoji: row.emoji,
        type: row.type,
        ...c,
        capsule_key: `date_${row.id}`,
      }
    })

    // Inclui data do casamento da tabela couples se não estiver em special_dates
    const couple = coupleResult.rows[0]
    if (couple?.wedding_date) {
      const weddingStr = normalizeDate(couple.wedding_date)
      const alreadyInDates = rows.some(r => r.type === 'wedding' && r.date === weddingStr)
      if (!alreadyInDates) {
        const c = calcCounters(weddingStr)
        rows.unshift({
          id: 'wedding_main',
          label: 'Casamento',
          date: weddingStr,
          emoji: '💒',
          type: 'wedding',
          ...c,
          capsule_key: 'wedding',
        })
      }
    }

    res.json(rows)
  } catch (err) {
    console.error('[getDatesForCapsules]', err)
    res.status(500).json({ error: 'Erro ao buscar datas para cápsulas' })
  }
}
