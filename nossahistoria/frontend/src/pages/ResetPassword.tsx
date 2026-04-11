import { useState } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import { authService } from '../services/api'

export default function ResetPassword() {
  const [params] = useSearchParams()
  const token = params.get('token') || ''
  const navigate = useNavigate()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  if (!token) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: '#FFF0F3' }}>
        <div className="text-5xl mb-4">⚠️</div>
        <p className="text-sm text-center" style={{ color: '#9B6B7A' }}>Link inválido ou expirado.</p>
        <Link to="/login"><button className="btn-primary mt-6 max-w-xs">Voltar ao login</button></Link>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (password !== confirm) { setError('As senhas não coincidem.'); return }
    if (password.length < 6) { setError('A senha deve ter pelo menos 6 caracteres.'); return }
    setLoading(true)
    try {
      await authService.resetPassword(token, password)
      setSuccess(true)
      setTimeout(() => navigate('/login'), 2500)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Link expirado ou inválido. Solicite um novo.')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: '#FFF0F3' }}>
        <div className="text-6xl mb-4">✅</div>
        <h2 className="text-xl font-bold mb-2" style={{ color: '#3D1A2A' }}>Senha atualizada!</h2>
        <p className="text-sm" style={{ color: '#9B6B7A' }}>Redirecionando para o login...</p>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FFF0F3' }}>
      <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: '1px solid #E8C4CE' }}>
        <Link to="/login">
          <button className="text-sm px-3 py-1.5 rounded-lg" style={{ background: '#FADADD', color: '#7C4D6B' }}>← Voltar</button>
        </Link>
        <h2 className="text-base font-semibold" style={{ color: '#3D1A2A' }}>Nova senha</h2>
      </div>

      <div className="flex-1 p-4 pb-8">
        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm text-center"
            style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label className="text-xs block mb-1" style={{ color: '#9B6B7A' }}>Nova senha</label>
            <input className="input-field" type="password" placeholder="mínimo 6 caracteres"
              value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
          </div>
          <div className="mb-6">
            <label className="text-xs block mb-1" style={{ color: '#9B6B7A' }}>Confirmar nova senha</label>
            <input className="input-field" type="password" placeholder="repita a senha"
              value={confirm} onChange={e => setConfirm(e.target.value)} required minLength={6} />
          </div>
          <button type="submit" disabled={loading || !password || !confirm} className="btn-primary disabled:opacity-60">
            {loading ? 'Salvando...' : '🔐 Salvar nova senha'}
          </button>
        </form>
      </div>
    </div>
  )
}
