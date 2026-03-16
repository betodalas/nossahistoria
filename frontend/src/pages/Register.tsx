import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authService } from '../services/api'

export default function Register() {
  const [name, setName] = useState('')
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
      await authService.register({ name, email, password })
      await login(email, password)
      // Verifica se tem convite pendente
      const pending = localStorage.getItem('pending_invite')
      if (pending) { localStorage.removeItem('pending_invite'); navigate(`/convite/${pending}`) }
      else navigate('/dashboard')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao criar conta.')
    } finally {
      setLoading(false)
    }
  }

  const labelStyle = { fontSize: '12px', color: '#9B6B7A', display: 'block', marginBottom: '4px' }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FFF0F3' }}>
      <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: '1px solid #E8C4CE' }}>
        <Link to="/login">
          <button className="text-sm px-3 py-1.5 rounded-lg" style={{ background: '#FADADD', color: '#7C4D6B' }}>← Voltar</button>
        </Link>
        <h2 className="text-base font-semibold" style={{ color: '#3D1A2A' }}>Criar conta</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 p-4 overflow-y-auto pb-8">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm text-center"
            style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c' }}>
            {error}
          </div>
        )}

        <div className="mb-3">
          <label style={labelStyle}>Seu nome *</label>
          <input className="input-field" placeholder="Ana" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label style={labelStyle}>E-mail *</label>
          <input className="input-field" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="mb-6">
          <label style={labelStyle}>Senha *</label>
          <input className="input-field" type="password" placeholder="mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
        </div>

        <button type="submit" disabled={loading} className="btn-primary mb-3 disabled:opacity-60">
          {loading ? 'Criando conta...' : 'Criar conta'}
        </button>
        <Link to="/login">
          <button type="button" className="btn-secondary">Já tenho conta</button>
        </Link>
      </form>
    </div>
  )
}
