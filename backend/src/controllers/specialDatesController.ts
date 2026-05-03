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

function calcCounters(dateStr: string) {
  const target = new Date(dateStr + 'T00:00:00')
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

    const dates = result.rows.map(row => ({
      ...row,
      counters: calcCounters(row.date.toISOString().split('T')[0]),
    }))

    res.json(dates)
  } catch (err) {
    console.error('[getSpecialDates]', err)
    res.status(500).json({ error: 'Erro ao buscar datas especiais' })
  }
}

// ─── POST /special-dates ──────────────────────────────────────────────────────

export const createSpecialDate = async (req: AuthRequest, res: Response) => {
  const { label, date, emoji, type, show_in_dashboard, show_in_capsules } = req.body
  if (!label || !date) return res.status(400).json({ error: 'label e date são obrigatórios' })

  try {
    const coupleId = await getCoupleId(req.userId!)
    if (!coupleId) return res.status(403).json({ error: 'Casal não encontrado' })

    const resolvedEmoji = emoji || DATE_TYPE_DEFAULTS[type]?.emoji || '💕'
    const resolvedType = type || 'custom'

    const result = await pool.query(
      `INSERT INTO special_dates
         (couple_id, label, date, emoji, type, show_in_dashboard, show_in_capsules)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING *`,
      [
        coupleId, label, date, resolvedEmoji, resolvedType,
        show_in_dashboard !== false,
        show_in_capsules !== false,
      ]
    )

    const row = result.rows[0]
    res.status(201).json({
      ...row,
      counters: calcCounters(row.date.toISOString().split('T')[0]),
    })
  } catch (err) {
    console.error('[createSpecialDate]', err)
    res.status(500).json({ error: 'Erro ao criar data especial' })
  }
}

// ─── PUT /special-dates/:id ───────────────────────────────────────────────────

export const updateSpecialDate = async (req: AuthRequest, res: Response) => {
  const { id } = req.params
  const { label, date, emoji, type, show_in_dashboard, show_in_capsules } = req.body

  try {
    const coupleId = await getCoupleId(req.userId!)
    if (!coupleId) return res.status(403).json({ error: 'Casal não encontrado' })

    const result = await pool.query(
      `UPDATE special_dates SET
         label            = COALESCE($1, label),
         date             = COALESCE($2::date, date),
         emoji            = COALESCE($3, emoji),
         type             = COALESCE($4, type),
         show_in_dashboard = COALESCE($5, show_in_dashboard),
         show_in_capsules  = COALESCE($6, show_in_capsules)
       WHERE id = $7 AND couple_id = $8
       RETURNING *`,
      [
        label || null, date || null, emoji || null, type || null,
        show_in_dashboard ?? null, show_in_capsules ?? null,
        id, coupleId,
      ]
    )

    if (!result.rows[0]) return res.status(404).json({ error: 'Data não encontrada' })

    const row = result.rows[0]
    res.json({
      ...row,
      counters: calcCounters(row.date.toISOString().split('T')[0]),
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
      const dateStr = row.date.toISOString().split('T')[0]
      const c = calcCounters(dateStr)
      return {
        id: row.id,
        label: row.label,
        date: dateStr,
        emoji: row.emoji,
        type: row.type,
        ...c,
        // Chave usada nas cápsulas do tempo
        capsule_key: `date_${row.id}`,
      }
    })

    // Inclui data do casamento da tabela couples se não estiver em special_dates
    const couple = coupleResult.rows[0]
    if (couple?.wedding_date) {
      const weddingStr = new Date(couple.wedding_date).toISOString().split('T')[0]
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
