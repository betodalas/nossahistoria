import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Profile() {
  const { user, couple, saveCouple } = useAuth()
  const navigate = useNavigate()

  const [partnerName, setPartnerName] = useState(couple?.partner_name || '')
  const [coupleName, setCoupleName] = useState(couple?.couple_name || '')
  const [weddingDate, setWeddingDate] = useState(couple?.wedding_date || '')
  const [saved, setSaved] = useState(false)

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault()
    saveCouple({
      ...couple,
      id: couple?.id || '1',
      couple_name: coupleName,
      partner_name: partnerName,
      wedding_date: weddingDate,
    })
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="min-h-screen flex flex-col" style={{background:'#0f0a1a'}}>
      <div className="flex items-center gap-3 px-4 py-4 border-b border-white/10">
        <button onClick={() => navigate(-1)} className="text-violet-300 px-3 py-1.5 rounded-lg text-sm" style={{background:'#1e1035'}}>←</button>
        <h2 className="text-base font-semibold text-white">Perfil do casal</h2>
      </div>

      <form onSubmit={handleSave} className="flex-1 p-4 overflow-y-auto pb-8">

        <div className="flex items-center gap-4 p-4 rounded-2xl mb-6 border border-white/10" style={{background:'#1a1030'}}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl" style={{background:'linear-gradient(135deg,#7c3aed,#be185d)'}}>
            💍
          </div>
          <div>
            <p className="text-sm font-semibold text-white">{coupleName || user?.name || 'Meu casal'}</p>
            <p className="text-xs text-white/40 mt-0.5">{user?.email}</p>
          </div>
        </div>

        <p className="section-label">Informações do casal</p>

        <div className="mb-3">
          <label className="text-xs text-white/40 block mb-1">Nome do casal</label>
          <input className="input-field" placeholder="ex: Ana & Pedro" value={coupleName} onChange={e => setCoupleName(e.target.value)} />
        </div>

        <div className="mb-3">
          <label className="text-xs text-white/40 block mb-1">Nome do(a) parceiro(a)</label>
          <input className="input-field" placeholder="ex: Pedro" value={partnerName} onChange={e => setPartnerName(e.target.value)} />
        </div>

        <div className="mb-6">
          <label className="text-xs text-white/40 block mb-1">Data do casamento 💍</label>
          <input className="input-field" type="date" value={weddingDate} onChange={e => setWeddingDate(e.target.value)} />
          {weddingDate && (
            <p className="text-xs text-violet-300 mt-1.5">
              {Math.max(0, Math.ceil((new Date(weddingDate).getTime() - Date.now()) / 86400000))} dias para o grande dia! 🎉
            </p>
          )}
        </div>

        <button type="button" className="btn-secondary mb-3" onClick={() => navigate('/armazenamento')}>💾 Armazenamento</button>
        <button type="submit" className="btn-primary mb-3">
          {saved ? '✅ Salvo!' : 'Salvar'}
        </button>

      </form>
    </div>
  )
}
