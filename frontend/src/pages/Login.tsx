import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const navigate = useNavigate()

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    localStorage.setItem('token', 'teste')
    localStorage.setItem('user', JSON.stringify({ id: '1', name: 'Ana' }))
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8"
      style={{background: 'linear-gradient(160deg, #2d1060, #6b21a8 50%, #be185d)'}}>
      <div className="w-20 h-20 rounded-full border-2 border-white/30 flex items-center justify-center text-4xl mb-6"
        style={{background: 'rgba(255,255,255,0.15)'}}>💍</div>
      <h1 className="text-2xl font-bold text-white mb-1">Nossa história</h1>
      <p className="text-sm text-white/60 mb-8">O app do seu relacionamento</p>
      <form onSubmit={handleSubmit} className="w-full max-w-sm">
        <input className="input-field mb-3" type="email" placeholder="seu@email.com"
          value={email} onChange={e => setEmail(e.target.value)} required />
        <input className="input-field mb-4" type="password" placeholder="senha"
          value={password} onChange={e => setPassword(e.target.value)} required />
        <button type="submit"
          className="w-full py-3 rounded-xl bg-white text-violet-700 font-bold text-sm mb-3">
          Entrar
        </button>
        <Link to="/cadastro">
          <button type="button" className="btn-secondary">Criar conta</button>
        </Link>
      </form>
    </div>
  )
}
