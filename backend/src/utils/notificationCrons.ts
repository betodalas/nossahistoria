import cron from 'node-cron'
import { pool } from '../utils/db'
import { sendPushToUser } from '../controllers/notificationsController'

/**
 * Cron de notificações push — roda no processo do backend.
 * Importar e chamar startNotificationCrons() no src/index.ts.
 *
 * Jobs ativos:
 *  - Diariamente às 09:00 → pergunta do dia
 *  - Diariamente às 20:00 → lembretes de datas especiais (7 dias antes)
 */
export function startNotificationCrons() {

  // ── Pergunta do dia ── roda todo dia às 09:00 ─────────────────────────────
  cron.schedule('0 9 * * *', async () => {
    console.log('[Cron] Disparando notificação: pergunta do dia')
    try {
      // Busca todos os usuários que têm token cadastrado e fazem parte de um casal
      const result = await pool.query(`
        SELECT DISTINCT pt.user_id
        FROM push_tokens pt
        INNER JOIN couples c ON c.user1_id = pt.user_id OR c.user2_id = pt.user_id
      `)

      for (const row of result.rows) {
        await sendPushToUser(row.user_id, {
          title: '💌 Pergunta do dia chegou!',
          body: 'Uma nova pergunta está esperando por vocês dois. Respondam juntos!',
          data: { screen: 'questions' },
        })
      }
    } catch (err) {
      console.error('[Cron] Erro na notificação de pergunta:', err)
    }
  }, { timezone: 'America/Sao_Paulo' })


  // ── Datas especiais ── roda todo dia às 20:00 ─────────────────────────────
  cron.schedule('0 20 * * *', async () => {
    console.log('[Cron] Verificando datas especiais próximas')
    try {
      // Busca casais com casamento nos próximos 7 dias (inclusive hoje)
      const couples = await pool.query(`
        SELECT id, user1_id, user2_id, couple_name, wedding_date
        FROM couples
        WHERE wedding_date IS NOT NULL
          AND TO_CHAR(wedding_date, 'MM-DD') = TO_CHAR(NOW() + INTERVAL '7 days', 'MM-DD')
      `)

      for (const couple of couples.rows) {
        const label = couple.couple_name ? `de ${couple.couple_name}` : 'de vocês'
        const targets = [couple.user1_id, couple.user2_id].filter(Boolean)

        for (const userId of targets) {
          await sendPushToUser(userId, {
            title: '💍 Data especial se aproximando!',
            body: `O aniversário ${label} é em 7 dias. Que tal planejar algo especial?`,
            data: { screen: 'dashboard' },
          })
        }
      }

      // Também verifica o dia exato (aniversário hoje)
      const today = await pool.query(`
        SELECT id, user1_id, user2_id, couple_name
        FROM couples
        WHERE wedding_date IS NOT NULL
          AND TO_CHAR(wedding_date, 'MM-DD') = TO_CHAR(NOW(), 'MM-DD')
      `)

      for (const couple of today.rows) {
        const label = couple.couple_name || 'vocês'
        const targets = [couple.user1_id, couple.user2_id].filter(Boolean)

        for (const userId of targets) {
          await sendPushToUser(userId, {
            title: '🎉 Feliz aniversário!',
            body: `Hoje é o dia especial de ${label}! Celebrem muito! 🥂`,
            data: { screen: 'dashboard' },
          })
        }
      }

    } catch (err) {
      console.error('[Cron] Erro na verificação de datas especiais:', err)
    }
  }, { timezone: 'America/Sao_Paulo' })

  console.log('[Cron] Notificações agendadas ✓')
}
