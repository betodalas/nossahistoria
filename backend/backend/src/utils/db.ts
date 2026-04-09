import { Pool } from 'pg'
import dotenv from 'dotenv'
dotenv.config()

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

pool.on('connect', () => {
  console.log('🗄️  Conectado ao PostgreSQL')
})

pool.on('error', (err) => {
  console.error('❌ Erro no pool do PostgreSQL:', err)
  process.exit(-1)
})
