import { useState, useEffect } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authService } from '../services/api'

declare global {
  interface Window { google: any }
}

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [partnerEmail, setPartnerEmail] = useState('')
  const [weddingDate, setWeddingDate] = useState('')
  const [coupleName, setCoupleName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const { login, loginWithGoogle, saveCouple } = useAuth()
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
      document.getElementById('google-btn-register'),
      {
        theme: 'outline',
        size: 'large',
        width: '100%',
        text: 'signup_with',
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
      setError(err?.response?.data?.error || 'Erro ao cadastrar com Google.')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      await authService.register({ name, email, password })
      await login(email, password)
      if (partnerEmail) {
        try {
          const res = await authService.createCouple({
            partnerEmail,
            weddingDate: weddingDate || undefined,
            coupleName: coupleName || undefined
          })
          saveCouple(res.data)
        } catch {}
      }
      navigate('/')
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

        {/* Botão Google */}
        <div className="mb-4">
          <div id="google-btn-register" className="w-full flex justify-center"></div>
        </div>

        {/* Divisor */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 h-px" style={{ background: '#E8C4CE' }}></div>
          <span className="text-xs" style={{ color: '#C9A0B0' }}>ou cadastre com e-mail</span>
          <div className="flex-1 h-px" style={{ background: '#E8C4CE' }}></div>
        </div>

        <p className="text-xs mb-4" style={{ color: '#C9A0B0', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
          Suas informações
        </p>

        <div className="mb-3">
          <label style={labelStyle}>Seu nome *</label>
          <input className="input-field" placeholder="Ana" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label style={labelStyle}>E-mail *</label>
          <input className="input-field" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="mb-4">
          <label style={labelStyle}>Senha *</label>
          <input className="input-field" type="password" placeholder="mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
        </div>

        <div className="pt-4 mb-4" style={{ borderTop: '1px solid #E8C4CE' }}>
          <p className="text-xs mb-4" style={{ color: '#C9A0B0', fontWeight: 600, letterSpacing: '0.08em', textTransform: 'uppercase' }}>
            Informações do casal <span style={{ fontWeight: 400 }}>· opcional</span>
          </p>
          <div className="mb-3">
            <label style={labelStyle}>E-mail do(a) parceiro(a)</label>
            <input className="input-field" type="email" placeholder="parceiro@email.com" value={partnerEmail} onChange={e => setPartnerEmail(e.target.value)} />
            <p className="text-xs mt-1" style={{ color: '#C9A0B0' }}>O(a) parceiro(a) precisa ter uma conta criada</p>
          </div>
          <div className="mb-3">
            <label style={labelStyle}>Nome do casal</label>
            <input className="input-field" placeholder="Ana & Pedro" value={coupleName} onChange={e => setCoupleName(e.target.value)} />
          </div>
          <div className="mb-3">
            <label style={labelStyle}>Data do casamento 💍</label>
            <input className="input-field" type="date" value={weddingDate} onChange={e => setWeddingDate(e.target.value)} />
          </div>
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
