import { Response } from 'express'
import { pool } from '../utils/db'
import { AuthRequest } from '../middleware/auth'

const PAYPAL_API = process.env.PAYPAL_MODE === 'production'
  ? 'https://api-m.paypal.com'
  : 'https://api-m.sandbox.paypal.com'

const getAccessToken = async (): Promise<string> => {
  const credentials = Buffer.from(
    `${process.env.PAYPAL_CLIENT_ID}:${process.env.PAYPAL_CLIENT_SECRET}`
  ).toString('base64')

  const res = await fetch(`${PAYPAL_API}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      Authorization: `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  })
  const data = await res.json() as { access_token: string }
  return data.access_token
}

export const createOrder = async (req: AuthRequest, res: Response) => {
  const { coupleId } = req
  try {
    const token = await getAccessToken()
    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        intent: 'CAPTURE',
        purchase_units: [{
          amount: {
            currency_code: 'BRL',
            value: process.env.PREMIUM_PRICE || '49.00',
          },
          description: 'Nossa História — Plano Premium',
          custom_id: coupleId,
        }],
        application_context: {
          return_url: `${process.env.FRONTEND_URL}/pagamento/sucesso`,
          cancel_url: `${process.env.FRONTEND_URL}/pagamento/cancelado`,
        },
      }),
    })
    const order = await response.json() as { id: string; links: { rel: string; href: string }[] }
    res.json({ orderId: order.id })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao criar pedido no PayPal' })
  }
}

export const captureOrder = async (req: AuthRequest, res: Response) => {
  const { coupleId } = req
  const { orderId } = req.body

  try {
    const token = await getAccessToken()
    const response = await fetch(`${PAYPAL_API}/v2/checkout/orders/${orderId}/capture`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
    })
    const capture = await response.json() as { status: string }

    if (capture.status === 'COMPLETED') {
      await pool.query(
        'UPDATE couples SET is_premium = TRUE, premium_activated_at = NOW(), paypal_order_id = $1 WHERE id = $2',
        [orderId, coupleId]
      )
      res.json({ success: true, message: 'Premium ativado com sucesso!' })
    } else {
      res.status(400).json({ error: 'Pagamento não foi concluído' })
    }
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao capturar pagamento' })
  }
}
