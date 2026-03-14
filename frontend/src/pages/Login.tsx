import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'E-mail ou senha incorretos.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{background:'linear-gradient(160deg, #FFF0F3, #FADADD 50%, #E8C4CE)'}}>
      <div className="w-20 h-20 rounded-full flex items-center justify-center text-4xl mb-6"
        style={{background:'white', border:'2px solid #E8C4CE', boxShadow:'0 4px 20px rgba(201,160,176,0.3)'}}>
        💍
      </div>
      <h1 className="text-2xl font-bold mb-1" style={{color:'#3D1A2A'}}>Nossa história</h1>
      <p className="text-sm mb-8" style={{color:'#9B6B7A'}}>O app do seu relacionamento</p>

      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm text-center"
            style={{background:'#fef2f2', border:'1px solid #fca5a5', color:'#b91c1c'}}>
            {error}
          </div>
        )}
        <input className="input-field mb-3" type="email" placeholder="seu@email.com"
          value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="input-field mb-4" type="password" placeholder="senha"
          value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit" disabled={loading} className="btn-primary mb-3 disabled:opacity-60">
          {loading ? 'Entrando...' : 'Entrar'}
        </button>
        <Link to="/cadastro">
          <button type="button" className="btn-secondary">Criar conta</button>
        </Link>
      </form>
    </div>
  )
}
