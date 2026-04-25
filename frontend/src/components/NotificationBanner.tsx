/**
 * NotificationBanner
 * Banner in-app exibido quando uma push notification chega com o app em FOREGROUND.
 * Dispensa-se sozinho após 4 segundos ou ao clicar.
 * Ouve o evento customizado 'push:foreground' disparado pelo hook usePushNotifications.
 */

import { useEffect, useState, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { Bell, X } from 'lucide-react'

interface PushPayload {
  title?: string
  body?: string
  data?: Record<string, string>
}

const SCREEN_ROUTES: Record<string, string> = {
  timeline: '/timeline',
  questions: '/perguntas',
  dashboard: '/dashboard',
  profile: '/perfil',
  moments: '/timeline',
}

export default function NotificationBanner() {
  const navigate = useNavigate()
  const [notification, setNotification] = useState<PushPayload | null>(null)
  const [visible, setVisible] = useState(false)
  const [timeoutId, setTimeoutId] = useState<ReturnType<typeof setTimeout> | null>(null)

  const dismiss = useCallback(() => {
    setVisible(false)
    setTimeout(() => setNotification(null), 300) // aguardar animação de saída
  }, [])

  const handleTap = useCallback(() => {
    if (!notification?.data?.screen) {
      dismiss()
      return
    }
    const route = SCREEN_ROUTES[notification.data.screen]
    dismiss()
    if (route) navigate(route)
  }, [notification, navigate, dismiss])

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent<PushPayload>).detail
      if (!detail) return

      // Cancelar timer anterior se houver banner já visível
      if (timeoutId) clearTimeout(timeoutId)

      setNotification(detail)
      setVisible(true)

      const id = setTimeout(() => {
        setVisible(false)
        setTimeout(() => setNotification(null), 300)
      }, 4000)
      setTimeoutId(id)
    }

    window.addEventListener('push:foreground', handler)
    return () => window.removeEventListener('push:foreground', handler)
  }, [timeoutId])

  if (!notification) return null

  return (
    <div
      onClick={handleTap}
      style={{
        position: 'fixed',
        top: 'env(safe-area-inset-top, 16px)',
        left: '50%',
        transform: `translateX(-50%) translateY(${visible ? '8px' : '-120px'})`,
        transition: 'transform 0.35s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        zIndex: 9999,
        width: 'calc(100% - 32px)',
        maxWidth: '420px',
        background: 'white',
        borderRadius: '16px',
        boxShadow: '0 8px 32px rgba(61,26,42,0.18)',
        border: '1.5px solid #E8C4CE',
        padding: '12px 16px',
        display: 'flex',
        alignItems: 'flex-start',
        gap: '12px',
        cursor: 'pointer',
      }}
      role="alert"
      aria-live="polite"
    >
      {/* Ícone */}
      <div style={{
        width: '36px',
        height: '36px',
        borderRadius: '10px',
        background: 'linear-gradient(135deg, #FADADD, #C9A0B0)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        flexShrink: 0,
      }}>
        <Bell size={18} color="#7C4D6B" />
      </div>

      {/* Texto */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {notification.title && (
          <p style={{
            fontSize: '13px',
            fontWeight: 700,
            color: '#3D1A2A',
            margin: 0,
            lineHeight: 1.3,
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
          }}>
            {notification.title}
          </p>
        )}
        {notification.body && (
          <p style={{
            fontSize: '12px',
            color: '#9B6B7A',
            margin: '2px 0 0',
            lineHeight: 1.4,
            display: '-webkit-box',
            WebkitLineClamp: 2,
            WebkitBoxOrient: 'vertical',
            overflow: 'hidden',
          } as React.CSSProperties}>
            {notification.body}
          </p>
        )}
      </div>

      {/* Fechar */}
      <button
        onClick={(e) => { e.stopPropagation(); dismiss() }}
        style={{
          background: 'none',
          border: 'none',
          padding: '2px',
          cursor: 'pointer',
          color: '#C9A0B0',
          flexShrink: 0,
          lineHeight: 1,
        }}
        aria-label="Fechar notificação"
      >
        <X size={16} />
      </button>
    </div>
  )
}
