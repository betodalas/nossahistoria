import { Response } from 'express'
import { pool } from '../utils/db'
import { AuthRequest } from '../middleware/auth'

const FREE_QUESTIONS_PER_WEEK = 3

export const getWeeklyQuestion = async (req: AuthRequest, res: Response) => {
  const { coupleId } = req
  try {
    const coupleResult = await pool.query('SELECT is_premium FROM couples WHERE id = $1', [coupleId])
    const isPremium = coupleResult.rows[0]?.is_premium

    // Busca pergunta ainda não respondida pelo casal
    const result = await pool.query(
      `SELECT q.* FROM questions q
       WHERE q.is_premium <= $1
       AND q.id NOT IN (
         SELECT DISTINCT question_id FROM question_answers WHERE couple_id = $2
       )
       ORDER BY RANDOM() LIMIT 1`,
      [isPremium, coupleId]
    )

    if (!result.rows[0]) {
      return res.json({ message: 'Todas as perguntas já foram respondidas!', done: true })
    }

    // Busca respostas já dadas para esta pergunta
    const answers = await pool.query(
      'SELECT * FROM question_answers WHERE question_id = $1 AND couple_id = $2',
      [result.rows[0].id, coupleId]
    )

    res.json({ question: result.rows[0], answers: answers.rows })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao buscar pergunta' })
  }
}

export const answerQuestion = async (req: AuthRequest, res: Response) => {
  const { userId, coupleId } = req
  const { questionId, answer } = req.body

  try {
    // Verifica limite semanal no plano gratuito
    const coupleResult = await pool.query('SELECT is_premium FROM couples WHERE id = $1', [coupleId])
    const isPremium = coupleResult.rows[0]?.is_premium

    if (!isPremium) {
      const weekStart = new Date()
      weekStart.setDate(weekStart.getDate() - weekStart.getDay())
      const count = await pool.query(
        `SELECT COUNT(*) FROM question_answers 
         WHERE user_id = $1 AND couple_id = $2 AND created_at >= $3`,
        [userId, coupleId, weekStart]
      )
      if (parseInt(count.rows[0].count) >= FREE_QUESTIONS_PER_WEEK) {
        return res.status(403).json({
          error: `Plano gratuito permite ${FREE_QUESTIONS_PER_WEEK} perguntas por semana. Faça upgrade!`,
          isPremium: false
        })
      }
    }

    const result = await pool.query(
      `INSERT INTO question_answers (question_id, couple_id, user_id, answer)
       VALUES ($1, $2, $3, $4)
       ON CONFLICT (question_id, user_id) DO UPDATE SET answer = $4
       RETURNING *`,
      [questionId, coupleId, userId, answer]
    )

    // Verifica se o parceiro também respondeu para revelar
    const bothAnswered = await pool.query(
      `SELECT COUNT(*) FROM question_answers 
       WHERE question_id = $1 AND couple_id = $2`,
      [questionId, coupleId]
    )

    if (parseInt(bothAnswered.rows[0].count) >= 2) {
      await pool.query(
        `UPDATE question_answers SET revealed_at = NOW() 
         WHERE question_id = $1 AND couple_id = $2 AND revealed_at IS NULL`,
        [questionId, coupleId]
      )
    }

    res.status(201).json(result.rows[0])
  } catch (err) {
    res.status(500).json({ error: 'Erro ao salvar resposta' })
  }
}

export const seedQuestions = async (req: AuthRequest, res: Response) => {
  const questions = [
    { text: 'Qual foi o momento em que você soube que queria ficar com essa pessoa para sempre?', premium: false },
    { text: 'O que você mais admira no outro?', premium: false },
    { text: 'Qual foi a primeira coisa que você notou no seu parceiro(a)?', premium: false },
    { text: 'Qual foi o momento em que você teve mais medo de perder a outra pessoa?', premium: false },
    { text: 'Qual memória do nosso relacionamento você mais gosta de relembrar?', premium: false },
    { text: 'Se pudesse reviver um dia do nosso relacionamento, qual seria?', premium: true },
    { text: 'O que você imagina que vamos estar fazendo daqui a 10 anos?', premium: true },
    { text: 'Qual é o seu maior sonho que ainda não contou para o outro?', premium: true },
    { text: 'Que hábito seu você acha que mais irrita o seu parceiro(a)?', premium: true },
    { text: 'Qual foi a coisa mais corajosa que você fez por amor?', premium: true },
  ]

  try {
    for (const q of questions) {
      await pool.query(
        'INSERT INTO questions (text, is_premium) VALUES ($1, $2) ON CONFLICT DO NOTHING',
        [q.text, q.premium]
      )
    }
    res.json({ message: `${questions.length} perguntas inseridas!` })
  } catch (err) {
    res.status(500).json({ error: 'Erro ao inserir perguntas' })
  }
}
