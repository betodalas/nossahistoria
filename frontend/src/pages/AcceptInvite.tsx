import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { authService } from '../services/api'

export default function AcceptInvite() {
  const { token } = useParams()
  const { user, refreshCouple } = useAuth()
  const navigate = useNavigate()
  const [status, setStatus] = useState<'loading'|'success'|'error'>('loading')
  const [error, setError] = useState('')

  useEffect(() => {
    if (!token) { setStatus('error'); setError('Link inválido'); return }
    if (!user) {
      // Salva token para usar após login/cadastro
      localStorage.setItem('pending_invite', token)
      navigate('/login')
      return
    }
    accept()
  }, [token, user])

  const accept = async () => {
    try {
      await authService.acceptInvite(token!)
      await refreshCouple()
      setStatus('success')
      setTimeout(() => navigate('/dashboard'), 2500)
    } catch (err: any) {
      const msg = err?.response?.data?.error || ''
      // Se já faz parte do casal, não é erro
      if (msg.includes('já faz parte')) {
        setStatus('success')
        setTimeout(() => navigate('/dashboard'), 2000)
      } else {
        setStatus('error')
        setError(msg || 'Erro ao aceitar convite')
      }
    }
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-6" style={{background:'#0f0a1a'}}>
      {status === 'loading' && (
        <>
          <div className="text-4xl mb-4">💌</div>
          <p className="text-white text-base">Vinculando casal...</p>
        </>
      )}
      {status === 'success' && (
        <>
          <div className="text-5xl mb-4">💑</div>
          <p className="text-lg font-bold text-white mb-2">Casal vinculado!</p>
          <p className="text-sm text-white/50">Redirecionando para o app...</p>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="text-4xl mb-4">😔</div>
          <p className="text-base text-white mb-4">{error}</p>
          <button className="btn-primary mt-4" onClick={() => navigate('/dashboard')}>
            Ir para o início
          </button>
        </>
      )}
    </div>
  )
}
