/**
 * notificationCrons.ts
 * Crons de notificações push — roda no processo do backend.
 * Chamar startNotificationCrons() em src/index.ts.
 *
 * ┌─ Jobs ──────────────────────────────────────────────────────────────────┐
 * │ 09:00 diário  → Pergunta do dia (apenas quem ainda não respondeu)      │
 * │ 20:00 diário  → Datas especiais: casamento + aniversários pessoais     │
 * │                  • Aviso 7 dias antes                                  │
 * │                  • Aviso 1 dia antes                                   │
 * │                  • No dia                                              │
 * └─────────────────────────────────────────────────────────────────────────┘
 */

import cron from 'node-cron'
import { pool } from '../utils/db'
import { sendPushToUser } from '../controllers/notificationsController'

// ── Helpers ──────────────────────────────────────────────────────────────────

function matchesInDays(mmdd: string, daysAhead: number): boolean {
  const target = new Date()
  target.setDate(target.getDate() + daysAhead)
  const month = String(target.getMonth() + 1).padStart(2, '0')
  const day = String(target.getDate()).padStart(2, '0')
  return mmdd === `${month}-${day}`
}

// ── Exportação principal ──────────────────────────────────────────────────────

export function startNotificationCrons() {

  // ── 1. Pergunta do dia — 09:00 ──────────────────────────────────────────
  cron.schedule('0 9 * * *', async () => {
    console.log('[Cron] Pergunta do dia...')
    try {
      // Usuários em casal COM token e que NÃO responderam a pergunta desta semana
      const result = await pool.query(`
        SELECT DISTINCT pt.user_id
        FROM push_tokens pt
        INNER JOIN couples c ON c.user1_id = pt.user_id OR c.user2_id = pt.user_id
        WHERE NOT EXISTS (
          SELECT 1 FROM question_answers qa
          INNER JOIN questions q ON q.id = qa.question_id
          WHERE qa.user_id = pt.user_id
            AND q.week_number = EXTRACT(WEEK FROM NOW())::int
            AND q.year = EXTRACT(YEAR FROM NOW())::int
        )
      `)

      let sent = 0
      for (const row of result.rows) {
        await sendPushToUser(row.user_id, {
          title: '💌 Pergunta do dia chegou!',
          body: 'Uma nova pergunta está esperando por vocês dois. Respondam juntos!',
          data: { screen: 'questions' },
        })
        sent++
      }
      console.log(`[Cron] Pergunta do dia: ${sent} usuário(s) notificado(s)`)
    } catch (err) {
      console.error('[Cron] Erro pergunta do dia:', err)
    }
  }, { timezone: 'America/Sao_Paulo' })


  // ── 2. Datas especiais — 20:00 ──────────────────────────────────────────
  cron.schedule('0 20 * * *', async () => {
    console.log('[Cron] Verificando datas especiais...')

    try {
      // ── 2a. Aniversário de casamento ─────────────────────────────────────
      const couples = await pool.query(`
        SELECT id, user1_id, user2_id, couple_name, wedding_date,
               TO_CHAR(wedding_date, 'MM-DD') AS mmdd,
               EXTRACT(YEAR FROM NOW())::int - EXTRACT(YEAR FROM wedding_date)::int AS years
        FROM couples
        WHERE wedding_date IS NOT NULL
      `)

      for (const couple of couples.rows) {
        const { mmdd, user1_id, user2_id, couple_name, years } = couple
        const label = couple_name || 'vocês'
        const targets = [user1_id, user2_id].filter(Boolean) as string[]

        if (matchesInDays(mmdd, 7)) {
          for (const userId of targets) {
            await sendPushToUser(userId, {
              title: '💍 Aniversário em 7 dias!',
              body: years > 0
                ? `Em 7 dias são ${years + 1} anos de casamento de ${label}. Que tal planejar algo especial?`
                : `Em 7 dias é o casamento de ${label}!`,
              data: { screen: 'dashboard' },
            })
          }
        } else if (matchesInDays(mmdd, 1)) {
          for (const userId of targets) {
            await sendPushToUser(userId, {
              title: '💍 Amanhã é o dia!',
              body: years > 0
                ? `Amanhã é o aniversário de ${years + 1} anos de casamento de ${label}! 🥂`
                : `Amanhã é o grande dia de ${label}!`,
              data: { screen: 'dashboard' },
            })
          }
        } else if (matchesInDays(mmdd, 0)) {
          for (const userId of targets) {
            await sendPushToUser(userId, {
              title: '🎉 Feliz aniversário!',
              body: years > 0
                ? `Hoje ${label} comemora ${years} ${years === 1 ? 'ano' : 'anos'} de casamento! 🥂`
                : `Hoje é o dia especial de ${label}! Que comecem os votos!`,
              data: { screen: 'dashboard' },
            })
          }
        }
      }

      // ── 2b. Aniversários pessoais ─────────────────────────────────────────
      const users = await pool.query(`
        SELECT u.id, u.name, u.birth_date,
               TO_CHAR(u.birth_date, 'MM-DD') AS mmdd,
               c.user1_id, c.user2_id
        FROM users u
        INNER JOIN couples c ON c.user1_id = u.id OR c.user2_id = u.id
        WHERE u.birth_date IS NOT NULL
      `)

      for (const person of users.rows) {
        const { id: personId, name, mmdd, user1_id, user2_id } = person
        const partnerId = user1_id === personId ? user2_id : user1_id
        if (!partnerId) continue

        const firstName = (name as string)?.split(' ')[0] || 'seu amor'

        if (matchesInDays(mmdd, 7)) {
          await sendPushToUser(partnerId, {
            title: '🎂 Aniversário se aproximando!',
            body: `O aniversário de ${firstName} é em 7 dias. Já pensou no presente? 😉`,
            data: { screen: 'dashboard' },
          })
        } else if (matchesInDays(mmdd, 1)) {
          await sendPushToUser(partnerId, {
            title: '🎂 Amanhã é o aniversário!',
            body: `Amanhã é o aniversário de ${firstName}! Não esqueça de celebrar! 🎁`,
            data: { screen: 'dashboard' },
          })
          await sendPushToUser(personId, {
            title: '🎂 Seu aniversário é amanhã!',
            body: `Que dia especial — amanhã é o seu dia! Celebre muito! ✨`,
            data: { screen: 'dashboard' },
          })
        } else if (matchesInDays(mmdd, 0)) {
          await sendPushToUser(partnerId, {
            title: `🎉 Hoje é o aniversário de ${firstName}!`,
            body: `Não esqueça de desejar um feliz aniversário ao seu amor! ❤️`,
            data: { screen: 'dashboard' },
          })
          await sendPushToUser(personId, {
            title: '🎂 Feliz aniversário!',
            body: `Hoje é o seu dia especial! Que seja incrível! 🎊`,
            data: { screen: 'dashboard' },
          })
        }
      }

      console.log('[Cron] Datas especiais verificadas ✓')
    } catch (err) {
      console.error('[Cron] Erro datas especiais:', err)
    }
  }, { timezone: 'America/Sao_Paulo' })

  console.log('[Cron] Notificações agendadas ✓ (09:00 perguntas | 20:00 datas especiais)')
}
