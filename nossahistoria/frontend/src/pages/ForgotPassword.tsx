import { useState } from 'react'
import { Link } from 'react-router-dom'
import { authService } from '../services/api'

export default function ForgotPassword() {
  const [email, setEmail] = useState('')
  const [sent, setSent] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authService.forgotPassword(email)
      setSent(true)
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao enviar e-mail. Tente novamente.')
    } finally {
      setLoading(false)
    }
  }

  if (sent) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6" style={{ background: '#FFF0F3' }}>
        <div className="w-full max-w-sm text-center">
          <div className="text-6xl mb-4">📬</div>
          <h2 className="text-xl font-bold mb-2" style={{ color: '#3D1A2A' }}>Verifique seu e-mail</h2>
          <p className="text-sm mb-1" style={{ color: '#7C4D6B' }}>Enviamos um link para:</p>
          <p className="text-sm font-semibold mb-4" style={{ color: '#3D1A2A' }}>{email}</p>
          <p className="text-xs mb-6" style={{ color: '#9B6B7A' }}>
            Clique no link do e-mail para criar uma nova senha. Não esqueça de verificar a pasta de spam.
          </p>
          <Link to="/login">
            <button className="btn-primary">Voltar ao login</button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FFF0F3' }}>
      <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: '1px solid #E8C4CE' }}>
        <Link to="/login">
          <button className="text-sm px-3 py-1.5 rounded-lg" style={{ background: '#FADADD', color: '#7C4D6B' }}>← Voltar</button>
        </Link>
        <h2 className="text-base font-semibold" style={{ color: '#3D1A2A' }}>Recuperar senha</h2>
      </div>

      <div className="flex-1 p-4 pb-8">
        <p className="text-sm mb-6" style={{ color: '#9B6B7A' }}>
          Informe o e-mail da sua conta e enviaremos um link para você criar uma nova senha.
        </p>

        {error && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm text-center"
            style={{ background: '#fef2f2', border: '1px solid #fca5a5', color: '#b91c1c' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="text-xs block mb-1" style={{ color: '#9B6B7A' }}>E-mail da conta</label>
            <input
              className="input-field"
              type="email"
              placeholder="seu@email.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>
          <button type="submit" disabled={loading || !email.trim()} className="btn-primary disabled:opacity-60">
            {loading ? 'Enviando...' : '💌 Enviar link de recuperação'}
          </button>
        </form>
      </div>
    </div>
  )
}
