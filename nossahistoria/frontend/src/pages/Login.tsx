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
      const pending = localStorage.getItem('pending_invite')
      if (pending) { localStorage.removeItem('pending_invite'); navigate(`/convite/${pending}`) }
      else navigate('/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'E-mail ou senha inválidos.')
    } finally {
      setLoading(false)
    }
  }

  const labelStyle = { fontSize: '12px', color: '#9B6B7A', display: 'block', marginBottom: '4px' }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FFF0F3' }}>
      <div className="flex flex-col items-center pt-16 pb-8 px-4">
        <div className="text-5xl mb-4">💍</div>
        <h1 className="text-2xl font-bold mb-1" style={{ color: '#3D1A2A', fontFamily: 'Georgia, serif', fontStyle: 'italic' }}>
          Nossa História
        </h1>
        <p className="text-xs" style={{ color: '#C9A0B0', letterSpacing: '0.15em', textTransform: 'uppercase' }}>
          cada momento importa
        </p>
      </div>

      <div className="flex-1 px-4 pb-8">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm text-center"
            style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label style={labelStyle}>E-mail</label>
            <input className="input-field" type="email" placeholder="seu@email.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="mb-1">
            <label style={labelStyle}>Senha</label>
            <input className="input-field" type="password" placeholder="sua senha"
              value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          <div className="flex justify-end mb-5">
            <Link to="/esqueci-senha" className="text-xs" style={{ color: '#9B6B7A', textDecoration: 'underline' }}>
              Esqueci minha senha
            </Link>
          </div>

          <button type="submit" disabled={loading} className="btn-primary mb-3 disabled:opacity-60">
            {loading ? 'Entrando...' : 'Entrar'}
          </button>
        </form>

        <Link to="/cadastro">
          <button className="btn-secondary">Criar conta</button>
        </Link>
      </div>
    </div>
  )
}
