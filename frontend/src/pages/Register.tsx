import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Register() {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [partnerName, setPartnerName] = useState('')
  const [weddingDate, setWeddingDate] = useState('')
  const [coupleName, setCoupleName] = useState('')
  const { login, saveCouple } = useAuth()
  const navigate = useNavigate()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    await login(email, password)
    if (weddingDate) {
      saveCouple({
        id: '1',
        couple_name: coupleName || `${name} & ${partnerName}`,
        wedding_date: weddingDate,
        isPremium: false,
      })
    }
    navigate('/')
  }

  return (
    <div className="min-h-screen flex flex-col" style={{background:'#0f0a1a'}}>
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
        <Link to="/login">
          <button className="text-violet-300 px-3 py-1.5 rounded-lg text-sm" style={{background:'#1e1035'}}>← Voltar</button>
        </Link>
        <h2 className="text-base font-semibold text-white">Criar conta</h2>
      </div>

      <form onSubmit={handleSubmit} className="flex-1 p-4 overflow-y-auto pb-8">
        <p className="text-xs text-white/40 mb-4">Suas informações</p>

        <div className="mb-3">
          <label className="text-xs text-white/40 block mb-1">Seu nome *</label>
          <input className="input-field" placeholder="Ana" value={name} onChange={e => setName(e.target.value)} required />
        </div>
        <div className="mb-3">
          <label className="text-xs text-white/40 block mb-1">E-mail *</label>
          <input className="input-field" type="email" placeholder="seu@email.com" value={email} onChange={e => setEmail(e.target.value)} required />
        </div>
        <div className="mb-4">
          <label className="text-xs text-white/40 block mb-1">Senha *</label>
          <input className="input-field" type="password" placeholder="mínimo 6 caracteres" value={password} onChange={e => setPassword(e.target.value)} required minLength={6} />
        </div>

        <div className="border-t border-white/10 pt-4 mb-4">
          <p className="text-xs text-white/40 mb-4">Informações do casal</p>
          <div className="mb-3">
            <label className="text-xs text-white/40 block mb-1">Nome do(a) parceiro(a)</label>
            <input className="input-field" placeholder="Pedro" value={partnerName} onChange={e => setPartnerName(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className="text-xs text-white/40 block mb-1">Nome do casal</label>
            <input className="input-field" placeholder="Ana & Pedro" value={coupleName} onChange={e => setCoupleName(e.target.value)} />
          </div>
          <div className="mb-3">
            <label className="text-xs text-white/40 block mb-1">Data do casamento 💍</label>
            <input className="input-field" type="date" value={weddingDate} onChange={e => setWeddingDate(e.target.value)} />
          </div>
        </div>

        <button type="submit" className="btn-primary mb-3">Criar conta</button>
        <Link to="/login">
          <button type="button" className="btn-secondary">Já tenho conta</button>
        </Link>
      </form>
    </div>
  )
}
