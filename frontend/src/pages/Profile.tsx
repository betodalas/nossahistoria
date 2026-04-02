import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authService } from '../services/api'

export default function Profile() {
  const { user, couple, saveCouple, refreshCouple, logout } = useAuth()
  const navigate = useNavigate()

  const [partnerName, setPartnerName] = useState(couple?.partner_name || '')
  const [coupleName, setCoupleName] = useState(couple?.couple_name || '')
  const [weddingDate, setWeddingDate] = useState(
    couple?.wedding_date ? couple.wedding_date.split('T')[0] : ''
  )
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

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

  const handleDeleteAccount = async () => {
    setDeleting(true)
    setDeleteError('')
    try {
      await authService.deleteAccount()
      logout()
      navigate('/login')
    } catch (err: any) {
      setDeleteError(err?.response?.data?.error || 'Erro ao cancelar conta. Tente novamente.')
      setDeleting(false)
    }
  }

  const daysLeft = weddingDate
    ? (() => {
      const [y,m,d] = weddingDate.split('T')[0].split('-').map(Number)
      const target = new Date(y, m-1, d).getTime()
      const today = new Date(); const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
      return Math.round((target - todayMs) / 86400000)
    })()
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
          <p className="text-xs font-bold text-violet-300 mb-2">💡 Conectar parceiro(a)</p>
          <p className="text-xs mb-3" style={{color:'rgba(255,255,255,0.7)'}}>Vincule seu parceiro(a) para compartilhar momentos e perguntas</p>
          <button type="button" className="btn-primary" onClick={() => navigate('/convidar')}>
            💌 Convidar parceiro(a)
          </button>
        </div>

        <button type="button" className="btn-secondary mb-3" onClick={() => navigate('/armazenamento')}>💾 Armazenamento</button>
        <button type="submit" disabled={saving} className="btn-primary mb-3 disabled:opacity-60">
          {saving ? 'Salvando...' : '✅ Salvar e voltar'}
        </button>

        <div className="mt-6 pt-6" style={{borderTop:'1px solid rgba(255,255,255,0.08)'}}>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="w-full py-3 rounded-2xl text-sm font-semibold"
            style={{background:'rgba(239,68,68,0.08)', border:'1px solid rgba(239,68,68,0.25)', color:'#f87171'}}
          >
            🗑️ Cancelar minha conta
          </button>
        </div>

      </form>

      {/* Modal de confirmação de cancelamento */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6" style={{background:'rgba(0,0,0,0.85)'}}>
          <div className="w-full max-w-sm rounded-3xl p-6 text-center" style={{background:'#1a1030', border:'1px solid rgba(239,68,68,0.3)'}}>
            <div className="text-5xl mb-4">⚠️</div>
            <h2 className="text-lg font-bold text-white mb-2">Cancelar conta</h2>
            {user && couple?.user1_id === user.id ? (
              <>
                <p className="text-sm mb-1" style={{color:'rgba(255,255,255,0.6)'}}>
                  Você é o criador do casal. Isso vai apagar permanentemente:
                </p>
                <p className="text-xs mb-5" style={{color:'rgba(255,255,255,0.4)'}}>
                  todos os momentos, cartas, perguntas e dados do casal — para você e seu parceiro(a). Esta ação não pode ser desfeita.
                </p>
              </>
            ) : (
              <>
                <p className="text-sm mb-1" style={{color:'rgba(255,255,255,0.6)'}}>
                  Você vai sair do casal. Isso vai apagar:
                </p>
                <p className="text-xs mb-5" style={{color:'rgba(255,255,255,0.4)'}}>
                  apenas a sua conta. Os momentos e a história do casal continuam intactos para seu parceiro(a).
                </p>
              </>
            )}
            {deleteError && (
              <p className="text-xs text-red-400 mb-3">{deleteError}</p>
            )}
            <button
              onClick={handleDeleteAccount}
              disabled={deleting}
              className="w-full py-3 rounded-2xl text-sm font-bold mb-3 disabled:opacity-50"
              style={{background:'linear-gradient(135deg,#dc2626,#b91c1c)', color:'white'}}
            >
              {deleting ? 'Cancelando...' : '🗑️ Sim, cancelar minha conta'}
            </button>
            <button
              onClick={() => { setShowDeleteModal(false); setDeleteError('') }}
              className="w-full py-2 rounded-2xl text-sm"
              style={{background:'rgba(255,255,255,0.08)', color:'rgba(255,255,255,0.6)'}}
            >
              Voltar
            </button>
          </div>
        </div>
      )}

    </div>
  )
}
