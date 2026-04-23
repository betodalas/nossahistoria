import { Response } from 'express'
import { pool } from '../utils/db'
import { AuthRequest } from '../middleware/auth'
import * as admin from 'firebase-admin'

// ─── Inicializar Firebase Admin (uma única vez) ────────────────────────────────

if (!admin.apps.length) {
  const credentialsJson = process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON
  if (!credentialsJson) {
    console.warn('[Push] GOOGLE_APPLICATION_CREDENTIALS_JSON não configurada — push desativado')
  } else {
    try {
      const serviceAccount = JSON.parse(credentialsJson)
      admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      })
      console.log('[Push] Firebase Admin inicializado ✓')
    } catch (err) {
      console.error('[Push] Erro ao inicializar Firebase Admin:', err)
    }
  }
}

// ─── Salvar token do device ────────────────────────────────────────────────────

export const saveToken = async (req: AuthRequest, res: Response) => {
  const { userId } = req
  const { token, platform } = req.body

  if (!token || !platform) {
    return res.status(400).json({ error: 'token e platform são obrigatórios' })
  }

  try {
    await pool.query(
      `INSERT INTO push_tokens (user_id, token, platform, updated_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (token)
       DO UPDATE SET user_id = $1, platform = $3, updated_at = NOW()`,
      [userId, token, platform]
    )
    res.json({ success: true })
  } catch (err) {
    console.error('[saveToken]', err)
    res.status(500).json({ error: 'Erro ao salvar token' })
  }
}

// ─── Enviar notificação via FCM HTTP v1 (Firebase Admin SDK) ──────────────────

interface FcmPayload {
  title: string
  body: string
  data?: Record<string, string>
}

export async function sendPushToUser(targetUserId: string, payload: FcmPayload): Promise<void> {
  if (!admin.apps.length) return

  const result = await pool.query(
    'SELECT token FROM push_tokens WHERE user_id = $1',
    [targetUserId]
  )
  if (result.rows.length === 0) return

  const tokens: string[] = result.rows.map((r: any) => r.token)

  const message: admin.messaging.MulticastMessage = {
    tokens,
    notification: {
      title: payload.title,
      body: payload.body,
    },
    android: {
      priority: 'high',
      notification: {
        sound: 'default',
        channelId: 'nossa-historia-default',
      },
    },
    apns: {
      payload: {
        aps: {
          sound: 'default',
          badge: 1,
        },
      },
    },
    data: payload.data || {},
  }

  try {
    const response = await admin.messaging().sendEachForMulticast(message)

    const invalidTokens: string[] = []
    response.responses.forEach((r, i) => {
      if (!r.success) {
        const code = r.error?.code
        if (
          code === 'messaging/invalid-registration-token' ||
          code === 'messaging/registration-token-not-registered'
        ) {
          invalidTokens.push(tokens[i])
        }
      }
    })

    if (invalidTokens.length > 0) {
      await pool.query(
        'DELETE FROM push_tokens WHERE token = ANY($1)',
        [invalidTokens]
      )
    }

    console.log(`[Push] ${response.successCount}/${tokens.length} entregue(s) para user ${targetUserId}`)
  } catch (err) {
    console.error('[Push] Erro ao enviar notificação:', err)
  }
}

// ─── Notificar parceiro: novo momento ─────────────────────────────────────────

export async function notifyPartnerNewMoment(
  coupleId: string,
  creatorId: string,
  momentTitle: string
): Promise<void> {
  try {
    const couple = await pool.query(
      'SELECT user1_id, user2_id FROM couples WHERE id = $1',
      [coupleId]
    )
    if (!couple.rows[0]) return

    const { user1_id, user2_id } = couple.rows[0]
    const partnerId = user1_id === creatorId ? user2_id : user1_id
    if (!partnerId) return

    const creator = await pool.query('SELECT name FROM users WHERE id = $1', [creatorId])
    const creatorName = creator.rows[0]?.name || 'Seu amor'

    await sendPushToUser(partnerId, {
      title: '💍 Novo momento adicionado!',
      body: `${creatorName} registrou: "${momentTitle}"`,
      data: { screen: 'timeline' },
    })
  } catch (err) {
    console.error('[notifyPartnerNewMoment]', err)
  }
}

// ─── Notificar parceiro: resposta de pergunta ──────────────────────────────────

export async function notifyPartnerAnsweredQuestion(
  coupleId: string,
  answererId: string,
  questionText: string
): Promise<void> {
  try {
    const couple = await pool.query(
      'SELECT user1_id, user2_id FROM couples WHERE id = $1',
      [coupleId]
    )
    if (!couple.rows[0]) return

    const { user1_id, user2_id } = couple.rows[0]
    const partnerId = user1_id === answererId ? user2_id : user1_id
    if (!partnerId) return

    const answerer = await pool.query('SELECT name FROM users WHERE id = $1', [answererId])
    const answererName = answerer.rows[0]?.name || 'Seu amor'

    const shortQuestion = questionText.length > 50
      ? questionText.slice(0, 47) + '...'
      : questionText

    await sendPushToUser(partnerId, {
      title: '💬 Pergunta respondida!',
      body: `${answererName} respondeu: "${shortQuestion}"`,
      data: { screen: 'questions' },
    })
  } catch (err) {
    console.error('[notifyPartnerAnsweredQuestion]', err)
  }
}
