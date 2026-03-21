import { pool } from './db'

const migrate = async () => {
  const client = await pool.connect()
  try {
    await client.query('BEGIN')

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
        is_premium BOOLEAN DEFAULT FALSE,
        premium_activated_at TIMESTAMPTZ,
        paypal_order_id VARCHAR(255),
        invite_token VARCHAR(100) UNIQUE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(user1_id, user2_id)
      );

      CREATE TABLE IF NOT EXISTS moments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
        title VARCHAR(150) NOT NULL,
        description TEXT,
        moment_date DATE NOT NULL,
        music_name VARCHAR(150),
        photo_url TEXT,
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

      CREATE TABLE IF NOT EXISTS letters (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
        user_id UUID REFERENCES users(id) ON DELETE CASCADE,
        capsule_key VARCHAR(50) NOT NULL,
        text TEXT NOT NULL,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(couple_id, user_id, capsule_key)
      );

      CREATE TABLE IF NOT EXISTS guest_posts (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
        name VARCHAR(100) NOT NULL,
        message TEXT NOT NULL,
        photo_url TEXT,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS storage_purchases (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        couple_id UUID REFERENCES couples(id) ON DELETE CASCADE,
        extra_mb INTEGER NOT NULL DEFAULT 0,
        paypal_order_id VARCHAR(255),
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

    await client.query('COMMIT')
    console.log('✅ Migrations executadas com sucesso!')
  } catch (err) {
    await client.query('ROLLBACK')
    console.error('❌ Erro na migration:', err)
    throw err
  } finally {
    client.release()
    process.exit(0)
  }
}

migrate()
