import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authService } from '../services/api'

export default function Profile() {
  const { user, couple, saveCouple, refreshCouple } = useAuth()
  const navigate = useNavigate()

  const [partnerName, setPartnerName] = useState(couple?.partner_name || '')
  const [coupleName, setCoupleName] = useState(couple?.couple_name || '')
  const [weddingDate, setWeddingDate] = useState(
    couple?.wedding_date ? couple.wedding_date.split('T')[0] : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSaving(true)
    try {
      // PUT cria casal solo automaticamente se não tiver parceiro ainda
      const res = await authService.updateCouple({
        weddingDate: weddingDate || undefined,
        coupleName: coupleName || undefined,
        partnerName: partnerName || undefined,
      })
      saveCouple({
        ...couple,
        ...res.data,
        partner_name: partnerName || couple?.partner_name,
      })
      await refreshCouple()
      navigate('/dashboard')
    } catch (err: any) {
      const status = err?.response?.status
      const msg = err?.response?.data?.error || err?.response?.data?.message || ''
      if (status === 401) {
        setError('Sessão expirada. Faça login novamente.')
      } else if (msg) {
        setError(msg)
      } else {
        // Offline fallback silencioso
        saveCouple({
          ...couple,
          id: couple?.id || '',
          couple_name: coupleName,
          partner_name: partnerName,
          wedding_date: weddingDate,
        })
        navigate('/dashboard')
      }
    } finally {
      setSaving(false)
    }
  }

  const daysLeft = weddingDate
    ? Math.ceil((new Date(weddingDate).getTime() - Date.now()) / 86400000)
    : null

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
            <p className="text-xs text-white/50 mt-0.5">{user?.email}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-xl text-xs"
            style={{background:'rgba(239,68,68,0.15)', border:'1px solid rgba(239,68,68,0.3)', color:'#fca5a5'}}>
            {error}
          </div>
        )}

        <p className="section-label mb-3" style={{color:'rgba(255,255,255,0.5)'}}>Informações do casal</p>

        <div className="mb-3">
          <label className="text-xs text-white/60 block mb-1">Nome do casal</label>
          <input className="input-field" placeholder="ex: Ana & Pedro" value={coupleName} onChange={e => setCoupleName(e.target.value)} />
        </div>

        <div className="mb-3">
          <label className="text-xs text-white/60 block mb-1">Nome do(a) parceiro(a)</label>
          <input className="input-field" placeholder="ex: Pedro" value={partnerName} onChange={e => setPartnerName(e.target.value)} />
        </div>

        <div className="mb-4">
          <label className="text-xs text-white/60 block mb-1">Data do casamento 💍</label>
          <input className="input-field" type="date" value={weddingDate} onChange={e => setWeddingDate(e.target.value)} />
          {weddingDate && daysLeft !== null && (
            <p className="text-xs text-violet-300 mt-1.5">
              {daysLeft > 0
                ? `${daysLeft} dias para o grande dia! 🎉`
                : daysLeft === 0 ? '🎊 É hoje!'
                : `Casados há ${Math.abs(daysLeft)} dias 💍`}
            </p>
          )}
        </div>

        <div className="mb-4 p-3 rounded-xl" style={{background:'rgba(124,58,237,0.1)', border:'1px solid rgba(124,58,237,0.2)'}}>
          <p className="text-xs text-violet-300 mb-1">💡 Conectar parceiro(a)</p>
          <p className="text-xs text-white/50 mb-2">Vincule seu parceiro(a) para compartilhar momentos e perguntas</p>
          <button type="button" className="text-xs text-violet-300 underline" onClick={() => navigate('/convidar')}>
            Ir para Convidar parceiro(a) →
          </button>
        </div>

        <button type="button" className="btn-secondary mb-3" onClick={() => navigate('/armazenamento')}>💾 Armazenamento</button>
        <button type="submit" disabled={saving} className="btn-primary mb-3 disabled:opacity-60">
          {saving ? 'Salvando...' : '✅ Salvar e voltar'}
        </button>

      </form>
    </div>
  )
}
