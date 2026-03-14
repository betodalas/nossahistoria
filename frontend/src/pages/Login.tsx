import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

declare global {
  interface Window {
    google: any
  }
}

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, loginWithGoogle } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    const script = document.createElement('script')
    script.src = 'https://accounts.google.com/gsi/client'
    script.async = true
    script.defer = true
    script.onload = () => initGoogle()
    document.body.appendChild(script)
    return () => { document.body.removeChild(script) }
  }, [])

  const initGoogle = () => {
    if (!window.google) return
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
      callback: handleGoogleResponse,
    })
    window.google.accounts.id.renderButton(
      document.getElementById('google-btn'),
      {
        theme: 'outline',
        size: 'large',
        width: '100%',
        text: 'signin_with',
        locale: 'pt-BR',
      }
    )
  }

  const handleGoogleResponse = async (response: any) => {
    setError('')
    setLoading(true)
    try {
      await loginWithGoogle(response.credential)
      navigate('/')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'Erro ao entrar com Google.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await login(email, password)
      navigate('/')
    } catch (err: any) {
      setError(err?.response?.data?.error || 'E-mail ou senha inválidos.')
    } finally {
      setLoading(false)
    }
  }

  const labelStyle = { fontSize: '12px', color: '#9B6B7A', display: 'block', marginBottom: '4px' }

  return (
    <div className="min-h-screen flex flex-col" style={{ background: '#FFF0F3' }}>
      {/* Header */}
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

        {/* Botão Google */}
        <div className="mb-4">
          <div id="google-btn" className="w-full flex justify-center"></div>
        </div>

        {/* Divisor */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: '#E8C4CE' }}></div>
          <span className="text-xs" style={{ color: '#C9A0B0' }}>ou entre com e-mail</span>
          <div className="flex-1 h-px" style={{ background: '#E8C4CE' }}></div>
        </div>

        {/* Formulário email/senha */}
        <form onSubmit={handleSubmit}>
          <div className="mb-3">
            <label style={labelStyle}>E-mail</label>
            <input className="input-field" type="email" placeholder="seu@email.com"
              value={email} onChange={e => setEmail(e.target.value)} required />
          </div>
          <div className="mb-5">
            <label style={labelStyle}>Senha</label>
            <input className="input-field" type="password" placeholder="sua senha"
              value={password} onChange={e => setPassword(e.target.value)} required />
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
