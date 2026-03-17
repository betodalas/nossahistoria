import { Response } from 'express'
import { pool } from '../utils/db'
import { AuthRequest } from '../middleware/auth'

export const getWeeklyQuestion = async (req: AuthRequest, res: Response) => {
  const { userId } = req
  let { coupleId } = req
  try {
    if (!coupleId) {
      const row = await pool.query('SELECT id FROM couples WHERE user1_id = $1 OR user2_id = $1 LIMIT 1', [userId])
      coupleId = row.rows[0]?.id
    }
    if (!coupleId) return res.json({ done: true })

    const coupleResult = await pool.query('SELECT is_premium FROM couples WHERE id = $1', [coupleId])
    const isPremium = coupleResult.rows[0]?.is_premium

    const today = new Date().toISOString().split('T')[0]

    // Verifica se já respondeu hoje
    const answeredToday = await pool.query(
      `SELECT qa.*, q.text AS question_text FROM question_answers qa
       JOIN questions q ON q.id = qa.question_id
       WHERE qa.couple_id = $1 AND qa.user_id = $2
       AND DATE(qa.created_at) = $3::date
       LIMIT 1`,
      [coupleId, userId, today]
    )

    const historyResult = await pool.query(
      `SELECT q.text AS question, qa.answer, qa.user_id, qa.created_at AS date
       FROM question_answers qa
       JOIN questions q ON q.id = qa.question_id
       WHERE qa.couple_id = $1 AND qa.user_id = $2
       ORDER BY qa.created_at DESC LIMIT 50`,
      [coupleId, userId]
    )

    if (answeredToday.rows[0]) {
      // Já respondeu hoje — mostra resposta e resposta do parceiro se tiver
      const myAnswer = answeredToday.rows[0]
      const partnerAnswer = await pool.query(
        `SELECT qa.answer FROM question_answers qa
         WHERE qa.question_id = $1 AND qa.couple_id = $2 AND qa.user_id != $3 LIMIT 1`,
        [myAnswer.question_id, coupleId, userId]
      )
      return res.json({
        answeredToday: true,
        question: { id: myAnswer.question_id, text: myAnswer.question_text },
        myAnswer: myAnswer.answer,
        partnerAnswer: partnerAnswer.rows[0]?.answer || null,
        history: historyResult.rows,
      })
    }

    // Não respondeu hoje — busca pergunta do dia para o CASAL (mesma para os dois)
    // Verifica se o parceiro já tem uma pergunta designada hoje
    const partnerAnsweredToday = await pool.query(
      `SELECT qa.question_id, q.text AS question_text FROM question_answers qa
       JOIN questions q ON q.id = qa.question_id
       WHERE qa.couple_id = $1 AND qa.user_id != $2
       AND DATE(qa.created_at) = $3::date
       LIMIT 1`,
      [coupleId, userId, today]
    )

    let todayQuestion = null

    if (partnerAnsweredToday.rows[0]) {
      // Parceiro já respondeu hoje — usa a mesma pergunta
      todayQuestion = {
        id: partnerAnsweredToday.rows[0].question_id,
        text: partnerAnsweredToday.rows[0].question_text,
      }
    } else {
      // Nenhum dos dois respondeu hoje — escolhe nova pergunta para o casal
      const allQuestions = await pool.query(
        `SELECT q.* FROM questions q
         WHERE q.is_premium <= $1
         AND q.id NOT IN (
           SELECT DISTINCT question_id FROM question_answers
           WHERE couple_id = $2
         )
         ORDER BY q.id ASC`,
        [isPremium, coupleId]
      )

      if (!allQuestions.rows.length) {
        const first = await pool.query(
          'SELECT * FROM questions WHERE is_premium <= $1 ORDER BY id ASC LIMIT 1',
          [isPremium]
        )
        todayQuestion = first.rows[0]
      } else {
        const dayIndex = Math.floor(new Date().getTime() / 86400000)
        todayQuestion = allQuestions.rows[dayIndex % allQuestions.rows.length]
      }
    }

    if (!todayQuestion) return res.json({ done: true })

    res.json({
      answeredToday: false,
      question: todayQuestion,
      answers: [],
      myAnswer: null,
      partnerAnswer: null,
      history: historyResult.rows,
    })
  } catch (err) {
    console.error(err)
    res.status(500).json({ error: 'Erro ao buscar pergunta' })
  }
}

export const answerQuestion = async (req: AuthRequest, res: Response) => {
  const { userId } = req
  let { coupleId } = req
  const { questionId, answer } = req.body

  try {
    if (!coupleId) {
      const row = await pool.query('SELECT id FROM couples WHERE user1_id = $1 OR user2_id = $1 LIMIT 1', [userId])
      coupleId = row.rows[0]?.id
    }
    if (!coupleId) return res.status(400).json({ error: 'Configure seu perfil antes de responder.' })

    const today = new Date().toISOString().split('T')[0]

    // Bloqueia se já respondeu hoje
    const alreadyAnswered = await pool.query(
      `SELECT id FROM question_answers
       WHERE couple_id = $1 AND user_id = $2
       AND DATE(created_at) = $3::date`,
      [coupleId, userId, today]
    )
    if (alreadyAnswered.rows.length > 0) {
      return res.status(400).json({ error: 'Você já respondeu a pergunta de hoje. Volte amanhã! 💜' })
    }

    const result = await pool.query(
      `INSERT INTO question_answers (question_id, couple_id, user_id, answer)
       VALUES ($1, $2, $3, $4) RETURNING *`,
      [questionId, coupleId, userId, answer]
    )

    // Verifica se parceiro também respondeu para revelar
    const bothAnswered = await pool.query(
      `SELECT COUNT(*) FROM question_answers WHERE question_id = $1 AND couple_id = $2`,
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
    { text: 'Se pudesse reviver um dia do nosso relacionamento, qual seria?', premium: false },
    { text: 'O que você imagina que vamos estar fazendo daqui a 10 anos?', premium: false },
    { text: 'Qual é o seu maior sonho que ainda não contou para o outro?', premium: false },
    { text: 'Que hábito seu você acha que mais irrita o seu parceiro(a)?', premium: false },
    { text: 'Qual foi a coisa mais corajosa que você fez por amor?', premium: false },
    { text: 'O que você faria diferente se pudesse voltar ao início?', premium: false },
    { text: 'Qual é o lugar favorito de vocês juntos?', premium: false },
    { text: 'O que ele(a) faz que te deixa com borboletas no estômago?', premium: false },
    { text: 'Como você descreveria nosso amor em 3 palavras?', premium: false },
    { text: 'Qual foi o dia mais especial que vocês viveram juntos?', premium: false },
    { text: 'O que você quer que ele(a) saiba mas nunca disse?', premium: false },
    { text: 'Como era sua vida antes dele(a) entrar?', premium: false },
    { text: 'Qual música te lembra automaticamente dele(a)?', premium: false },
    { text: 'O que você diria para ele(a) se soubesse que é a última vez?', premium: false },
    { text: 'O que você imagina para vocês daqui 10 anos?', premium: false },
    { text: 'Qual é o maior sonho que vocês têm juntos?', premium: false },
    { text: 'Como você se sentiu no primeiro beijo de vocês?', premium: false },
    { text: 'Qual foi a coisa mais engraçada que já aconteceu com vocês?', premium: false },
    { text: 'O que você aprendeu com esse relacionamento?', premium: false },
    { text: 'Se você pudesse descrever nosso amor em uma cena de filme, qual seria?', premium: false },
    { text: 'O que você contaria para os seus filhos sobre como vocês se apaixonaram?', premium: false },
    { text: 'Qual é o cheiro, som ou imagem que te faz lembrar imediatamente dele(a)?', premium: false },
    { text: 'Qual viagem dos sonhos vocês fariam juntos?', premium: false },
    { text: 'O que te faz sentir mais amado(a) por ele(a)?', premium: false },
    { text: 'Qual é o hábito dele(a) que você acha mais fofo?', premium: false },
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
