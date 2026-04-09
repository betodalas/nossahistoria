import { Response } from 'express'
import { pool } from '../utils/db'
import { AuthRequest } from '../middleware/auth'

const PAYPAL_API = process.env.PAYPAL_MODE === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

const EXTRA_STORAGE_MB = 500
const EXTRA_STORAGE_PRICE = '19.00'

const getAccessToken = async (): Promise<string> => {
  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64')
  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: { Authorization: `Basic ${credentials}`, 'Content-Type': 'application/x-www-form-urlencoded' },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json() as { access_token: string }
  return data.access_token
}

// Retorna uso atual de armazenamento do casal
export const getStorageInfo = async (req: AuthRequest, res: Response) => {
  const { coupleId } = req
  try {
    const usageResult = await pool.query(
      'SELECT COALESCE(SUM(photo_size + audio_size), 0) as used FROM moments WHERE couple_id = $1',
      [coupleId]
    )
    const extraResult = await pool.query(
      'SELECT COALESCE(SUM(extra_mb), 0) as extra FROM storage_purchases WHERE couple_id = $1',
      [coupleId]
    )
    const usedBytes = parseInt(usageResult.rows[0].used)
    const extraMB = parseInt(extraResult.rows[0].extra)
    const totalMB = 500 + extraMB
    const totalBytes = totalMB * 1024 * 1024

    res.json({
      usedBytes,
      usedMB: Math.round(usedBytes / 1024 / 1024 * 10) / 10,
      totalMB,
      totalBytes,
      extraMB,
      percentUsed: Math.round((usedBytes / totalBytes) * 100),
      extraStorageMB: EXTRA_STORAGE_MB,
      extraStoragePrice: EXTRA_STORAGE_PRICE,
    })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar informações de armazenamento' })
  }
}

// Cria pedido PayPal para compra de espaço extra
export const createStorageOrder = async (req: AuthRequest, res: Response) => {
  const { coupleId } = req
  try {
    const token = await getAccessToken()
    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: { currency_code: 'BRL', value: EXTRA_STORAGE_PRICE },
          description: `Nossa História — +${EXTRA_STORAGE_MB} MB de armazenamento`,
          custom_id: `storage:${coupleId}`,
        }],
        application_context: {
          return_url: `${process.env.FRONTEND_URL}/armazenamento/sucesso`,
          cancel_url: `${process.env.FRONTEND_URL}/armazenamento`,
        },
      }),
    })
    const order = await response.json() as { id: string }
    res.json({ orderId: order.id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao criar pedido' })
  }
}

// Captura pagamento e adiciona espaço
export const captureStorageOrder = async (req: AuthRequest, res: Response) => {
  const { coupleId } = req
  const { orderId } = req.body
  try {
    const token = await getAccessToken()
    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    })
    const capture = await response.json() as { status: string }

    if (capture.status === 'COMPLETED') {
      await pool.query(
        'INSERT INTO storage_purchases (couple_id, extra_mb, paypal_order_id, price_paid) VALUES ($1, $2, $3, $4)',
        [coupleId, EXTRA_STORAGE_MB, orderId, EXTRA_STORAGE_PRICE]
      )
      res.json({ success: true, extraMB: EXTRA_STORAGE_MB, message: `+${EXTRA_STORAGE_MB} MB adicionados!` })
    } else {
      res.status(400).json({ error: 'Pagamento não foi concluído' })
    }
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao capturar pagamento' })
  }
}
