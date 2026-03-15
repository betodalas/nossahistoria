import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import routes from './routes'
import { pool } from './utils/db'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 3001

app.use(cors({
  origin: process.env.FRONTEND_URL || '*',
  credentials: true
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))

app.use('/api', routes)

app.get('/health', (_, res) => res.json({ status: 'ok', timestamp: new Date() }))

// Roda migration automaticamente ao iniciar
const runMigrations = async () => {
  const client = await pool.connect()
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        name VARCHAR(100) NOT NULL,
        email VARCHAR(150) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        avatar_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS couples (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user1_id UUID REFERENCES users(id) ON DELETE CASCADE,
        user2_id UUID REFERENCES users(id) ON DELETE CASCADE,
        wedding_date DATE,
        couple_name VARCHAR(100),
        partner_name_manual VARCHAR(100),
        is_premium BOOLEAN DEFAULT FALSE,
        premium_activated_at TIMESTAMPTZ,
        paypal_order_id VARCHAR(255),
        invite_token VARCHAR(100) UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user1_id, user2_id)
      );
      -- Adiciona coluna se já existir tabela sem ela
      ALTER TABLE couples ADD COLUMN IF NOT EXISTS partner_name_manual VARCHAR(100);

      CREATE TABLE IF NOT EXISTS moments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
        title VARCHAR(150) NOT NULL,
        description TEXT,
        moment_date DATE NOT NULL,
        music_name VARCHAR(150),
        photo_url TEXT,
        voice_url TEXT,
        voice_duration INTEGER DEFAULT 0,
        photo_size INTEGER DEFAULT 0,
        audio_size INTEGER DEFAULT 0,
        music_link TEXT,
        created_by UUID REFERENCES users(id),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS perspectives (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        moment_id UUID REFERENCES moments(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        text TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(moment_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS questions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        text TEXT NOT NULL,
        category VARCHAR(50) DEFAULT 'geral',
        is_premium BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS question_answers (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        question_id UUID REFERENCES questions(id) ON DELETE CASCADE,
        couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        answer TEXT NOT NULL,
        revealed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(question_id, user_id)
      );

      CREATE TABLE IF NOT EXISTS unlock_dates (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
        label VARCHAR(100) NOT NULL,
        unlock_date DATE NOT NULL,
        message TEXT,
        is_unlocked BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS storage_purchases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
        extra_mb INTEGER NOT NULL,
        paypal_order_id VARCHAR(255) UNIQUE,
        price_paid DECIMAL(10,2),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS family_shares (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
        email VARCHAR(150) NOT NULL,
        token VARCHAR(100) UNIQUE NOT NULL,
        expires_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );
    `)
    console.log('✅ Migrations OK')

    // Seed de perguntas
    const { rows } = await client.query('SELECT COUNT(*) FROM questions')
    if (parseInt(rows[0].count) === 0) {
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
      for (const q of questions) {
        await client.query(
          'INSERT INTO questions (text, is_premium) VALUES ($1, $2)',
          [q.text, q.premium]
        )
      }
      console.log('✅ Perguntas inseridas')
    }
  } catch (err) {
    console.error('❌ Erro na migration:', err)
  } finally {
    client.release()
  }
}

app.listen(PORT, async () => {
  console.log(`🚀 Servidor rodando na porta ${PORT}`)
  console.log(`📡 Ambiente: ${process.env.NODE_ENV || 'development'}`)
  await runMigrations()
})

export default app
