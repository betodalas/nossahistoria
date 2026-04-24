import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authService } from '../services/api'
import { parseDate, daysUntil } from '../utils/dateUtils'
import Layout from '../components/Layout'
import ConfirmModal from '../components/ConfirmModal'

export default function Profile() {
  const { user, couple, saveCouple, refreshCouple, logout, hasAlbum } = useAuth()
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
      const res = await authService.updateCouple({
        weddingDate: weddingDate || undefined,
        coupleName: coupleName || undefined,
        partnerName: partnerName || undefined,
      })
      saveCouple({ ...couple, ...res.data, partner_name: partnerName || couple?.partner_name })
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

  const daysLeft = weddingDate ? daysUntil(parseDate(weddingDate)) : null

  const [pushLog, setPushLog] = useState<string[]>([])

  const log = (msg: string) => setPushLog(prev => [...prev, `${new Date().toLocaleTimeString()} ${msg}`])

  const testPush = async () => {
    setPushLog([])
    const BACKEND_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'
    log('Iniciando...')

    try {
      const { initializeApp, getApps } = await import('firebase/app')
      const { getMessaging, getToken } = await import('firebase/messaging')
      const { PushNotifications } = await import('@capacitor/push-notifications')

      const firebaseConfig = {
        apiKey: "AIzaSyCdz_OzOzwlK-ZIF0MexnB1mSZ5BB-7NYs",
        authDomain: "nossahistoria-67c05.firebaseapp.com",
        projectId: "nossahistoria-67c05",
        storageBucket: "nossahistoria-67c05.firebasestorage.app",
        messagingSenderId: "263899434835",
        appId: "1:263899434835:web:3f19bbc75d01e7d7475ba6",
      }

      const app = getApps().length ? getApps()[0] : initializeApp(firebaseConfig)
      log('✓ Firebase inicializado')

      // Usa Capacitor para pedir permissão (funciona na WebView)
      const perm = await PushNotifications.requestPermissions()
      log('Permissão: ' + perm.receive)
      if (perm.receive === 'denied') { log('❌ Permissão negada'); return }

      // Usa Capacitor para registrar e pegar o token nativo
      await PushNotifications.register()
      log('Aguardando token nativo...')

      await new Promise<void>((resolve) => {
        PushNotifications.addListener('registration', async (token) => {
          log('✓ Token: ' + token.value.slice(0, 30) + '...')

          const jwt = localStorage.getItem('token')
          if (!jwt) { log('❌ JWT não encontrado'); resolve(); return }

          const res = await fetch(`${BACKEND_URL}/notifications/token`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
            body: JSON.stringify({ token: token.value, platform: 'android' }),
          })
          const body = await res.json()
          log('Backend ' + res.status + ': ' + JSON.stringify(body))
          resolve()
        })

        PushNotifications.addListener('registrationError' as any, (err: any) => {
          log('❌ Erro FCM: ' + JSON.stringify(err))
          resolve()
        })

        setTimeout(() => { log('⚠️ Timeout — token não chegou'); resolve() }, 10000)
      })
    } catch (err: any) {
      log('❌ Erro: ' + err.message)
    }
  }

  return (
    <Layout>
      <div className="flex items-center gap-3 px-4 py-4" style={{ borderBottom: '1px solid #E8C4CE' }}>
        <button onClick={() => navigate('/dashboard')} className="px-3 py-1.5 rounded-lg text-sm"
          style={{ background: '#F5E6EA', color: '#7C4D6B' }}>←</button>
        <h2 className="text-base font-semibold" style={{ color: '#3D1A2A' }}>Perfil do casal</h2>
      </div>

      <form onSubmit={handleSave} className="p-4 pb-8">

        <div className="flex items-center gap-4 p-4 rounded-2xl mb-6"
          style={{ background: '#FADADD', border: '1px solid #E8C4CE' }}>
          <div className="w-14 h-14 rounded-full flex items-center justify-center text-2xl"
            style={{ background: 'linear-gradient(135deg,#C9A0B0,#7C4D6B)' }}>
            💍
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#3D1A2A' }}>{coupleName || user?.name || 'Meu casal'}</p>
            <p className="text-xs mt-0.5" style={{ color: '#9B6B7A' }}>{user?.email}</p>
          </div>
        </div>

        {error && (
          <div className="mb-4 px-3 py-2 rounded-xl text-xs"
            style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)', color: '#b91c1c' }}>
            {error}
          </div>
        )}

        <p className="section-label mb-3">Informações do casal</p>

        <div className="mb-3">
          <label className="text-xs block mb-1" style={{ color: '#9B6B7A' }}>Nome do casal</label>
          <input className="input-field" placeholder="ex: Ana & Pedro"
            value={coupleName} onChange={e => setCoupleName(e.target.value)} />
        </div>

        <div className="mb-3">
          <label className="text-xs block mb-1" style={{ color: '#9B6B7A' }}>Nome do(a) parceiro(a)</label>
          <input className="input-field" placeholder="ex: Pedro"
            value={partnerName} onChange={e => setPartnerName(e.target.value)} />
        </div>

        <div className="mb-4">
          <label className="text-xs block mb-1" style={{ color: '#9B6B7A' }}>Data do casamento 💍</label>
          <input className="input-field" type="date" value={weddingDate} onChange={e => setWeddingDate(e.target.value)} />
          {weddingDate && daysLeft !== null && (
            <p className="text-xs mt-1.5" style={{ color: '#7C4D6B' }}>
              {daysLeft > 0
                ? `${daysLeft} dias para o grande dia! 🎉`
                : daysLeft === 0 ? '🎊 É hoje!'
                : `Casados há ${Math.abs(daysLeft)} dias 💍`}
            </p>
          )}
        </div>

        <div className="mb-4 p-3 rounded-xl" style={{ background: '#FADADD', border: '1px solid #E8C4CE' }}>
          <p className="text-xs font-bold mb-2" style={{ color: '#7C4D6B' }}>💡 Conectar parceiro(a)</p>
          <p className="text-xs mb-3" style={{ color: '#9B6B7A' }}>Vincule seu parceiro(a) para compartilhar momentos e perguntas</p>
          <button type="button" className="btn-primary" onClick={() => navigate('/convidar')}>
            💌 Convidar parceiro(a)
          </button>
        </div>

        <p className="section-label mb-3">Funcionalidades</p>

        <div className="mb-4 rounded-2xl overflow-hidden" style={{ border: '1px solid #E8C4CE' }}>
          <button
            type="button"
            onClick={() => navigate(hasAlbum ? '/album-convidados' : '/album-convidados/info')}
            className="w-full flex items-center justify-between px-4 py-3.5 text-left"
            style={{ background: 'white', borderBottom: '1px solid #E8C4CE' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">📸</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#3D1A2A' }}>Álbum de convidados</p>
                <p className="text-xs" style={{ color: '#9B6B7A' }}>
                  {hasAlbum ? 'Ver fotos enviadas pelos convidados' : 'Convidados enviam fotos do casamento'}
                </p>
              </div>
            </div>
            <span style={{ color: '#C9A0B0', fontSize: '18px' }}>›</span>
          </button>

          <button
            type="button"
            onClick={() => navigate('/armazenamento')}
            className="w-full flex items-center justify-between px-4 py-3.5 text-left"
            style={{ background: 'white' }}
          >
            <div className="flex items-center gap-3">
              <span className="text-xl">💾</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#3D1A2A' }}>Armazenamento</p>
                <p className="text-xs" style={{ color: '#9B6B7A' }}>Gerencie o espaço para fotos e vídeos</p>
              </div>
            </div>
            <span style={{ color: '#C9A0B0', fontSize: '18px' }}>›</span>
          </button>
        </div>

        <button type="submit" disabled={saving} className="btn-primary mb-3 disabled:opacity-60">
          {saving ? 'Salvando...' : '✅ Salvar e voltar'}
        </button>

        <div className="mt-6 pt-6" style={{ borderTop: '1px solid #E8C4CE' }}>
          <button
            type="button"
            onClick={() => setShowDeleteModal(true)}
            className="w-full py-3 rounded-2xl text-sm font-semibold"
            style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.25)', color: '#e53e3e' }}>
            🗑️ Cancelar minha conta
          </button>
        </div>
      </form>

      {/* Modal de confirmação de exclusão de conta */}
      <div className="mx-4 mb-6 rounded-2xl p-4" style={{ background: '#FFF0F3', border: '1px solid #E8C4CE' }}>
          <p className="text-xs font-semibold mb-3" style={{ color: '#3D1A2A' }}>🔔 Diagnóstico de Push</p>
          <button onClick={testPush}
            className="w-full py-2.5 rounded-xl text-sm font-semibold mb-3"
            style={{ background: 'linear-gradient(135deg,#C9A0B0,#7C4D6B)', color: 'white' }}>
            Testar registro FCM
          </button>
          {pushLog.length > 0 && (
            <div className="rounded-xl p-3" style={{ background: '#3D1A2A' }}>
              {pushLog.map((line, i) => (
                <p key={i} className="text-xs font-mono mb-1" style={{ color: '#E8C4CE' }}>{line}</p>
              ))}
            </div>
          )}
        </div>

      {showDeleteModal && (
        <ConfirmModal
          icon="⚠️"
          title="Cancelar conta"
          confirmLabel="🗑️ Sim, cancelar minha conta"
          loadingLabel="Cancelando..."
          cancelLabel="Voltar"
          danger
          loading={deleting}
          errorMessage={deleteError || undefined}
          onConfirm={handleDeleteAccount}
          onCancel={() => { setShowDeleteModal(false); setDeleteError('') }}
        >
          {user && couple?.user1_id === user.id ? (
            <div className="text-center">
              <p className="text-sm mb-1" style={{ color: '#7C4D6B' }}>
                Você é o criador do casal. Isso vai apagar permanentemente:
              </p>
              <p className="text-xs" style={{ color: '#9B6B7A' }}>
                todos os momentos, cartas, perguntas e dados do casal — para você e seu parceiro(a). Esta ação não pode ser desfeita.
              </p>
            </div>
          ) : (
            <div className="text-center">
              <p className="text-sm mb-1" style={{ color: '#7C4D6B' }}>
                Você vai sair do casal. Isso vai apagar:
              </p>
              <p className="text-xs" style={{ color: '#9B6B7A' }}>
                apenas a sua conta. Os momentos e a história do casal continuam intactos para seu parceiro(a).
              </p>
            </div>
          )}
        </ConfirmModal>
      )}
    </Layout>
  )
}
