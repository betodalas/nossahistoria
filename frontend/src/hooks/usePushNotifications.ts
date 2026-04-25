/**
 * usePushNotifications
 * Hook central para gerenciamento de push notifications via Capacitor.
 *
 * Responsabilidades:
 *  - Pedir permissão ao usuário (iOS/Android)
 *  - Registrar o device token no backend
 *  - Ouvir notificações recebidas em foreground
 *  - Ouvir toque em notificações (deep-link para a tela correta)
 *  - Detectar se já foi registrado (evitar chamadas desnecessárias)
 *
 * Uso:
 *   const { permissionStatus, requestPermission } = usePushNotifications()
 */

import { useEffect, useCallback, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

// Importa apenas os tipos — não afeta o bundle web (tree-shaken)
import type {
  Token,
  RegistrationError,
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications'

// Lazy import — não quebra o bundle web se o plugin não estiver instalado
async function getPushPlugin() {
  if (!Capacitor.isNativePlatform()) return null
  try {
    const { PushNotifications } = await import('@capacitor/push-notifications')
    return PushNotifications
  } catch {
    return null
  }
}

const STORAGE_KEY = 'push_registered_token'

export type PushPermissionStatus = 'unknown' | 'granted' | 'denied' | 'prompt'

interface UsePushNotificationsReturn {
  permissionStatus: PushPermissionStatus
  isRegistered: boolean
  requestPermission: () => Promise<boolean>
  unregister: () => Promise<void>
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const navigate = useNavigate()
  const [permissionStatus, setPermissionStatus] = useState<PushPermissionStatus>('unknown')
  const [isRegistered, setIsRegistered] = useState(false)

  // ─── Registrar token no backend ──────────────────────────────────────────
  const sendTokenToBackend = useCallback(async (token: string, platform: string) => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === token) return // já registrado — sem requisição desnecessária

    try {
      await api.post('/notifications/token', { token, platform })
      localStorage.setItem(STORAGE_KEY, token)
      setIsRegistered(true)
      console.log('[Push] Token registrado no backend ✓')
    } catch (err) {
      console.warn('[Push] Falha ao registrar token:', err)
    }
  }, [])

  // ─── Navegar pela notificação tocada ─────────────────────────────────────
  const handleNotificationAction = useCallback((data?: Record<string, string>) => {
    const screen = data?.screen
    if (!screen) return
    const routes: Record<string, string> = {
      timeline: '/timeline',
      questions: '/perguntas',
      dashboard: '/dashboard',
      profile: '/perfil',
      moments: '/timeline',
    }
    const route = routes[screen]
    if (route) navigate(route)
  }, [navigate])

  // ─── Inicialização: verificar permissão + ouvir eventos ──────────────────
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
      // No browser, ler o status atual da Web Notifications API
      if ('Notification' in window) {
        const p = Notification.permission
        setPermissionStatus(p === 'default' ? 'prompt' : p as PushPermissionStatus)
      } else {
        setPermissionStatus('denied')
      }
      return
    }

    let cleanup: (() => void) | null = null

    const init = async () => {
      const Push = await getPushPlugin()
      if (!Push) return

      // Verificar status atual de permissão
      const current = await Push.checkPermissions()
      // No Android, após reinstalar o app, o sistema retorna 'denied' mesmo sem
      // o usuário ter negado explicitamente — é o estado padrão do SO pós-reinstall.
      // Mapeamos 'denied' para 'prompt' para que o PushRegistrar tente requestPermission(),
      // que por sua vez chamará requestPermissions() e o SO exibirá o pop-up nativo.
      // 'prompt-with-rationale' (Android) também vira 'prompt' para consistência.
      const rawStatus = current.receive as string
      const status: PushPermissionStatus =
        (rawStatus === 'prompt-with-rationale' || rawStatus === 'denied')
          ? 'prompt'
          : rawStatus as PushPermissionStatus
      setPermissionStatus(status)

      // Se já foi autorizado, registrar automaticamente
      if (status === 'granted') {
        await Push.register()
      }

      // ── Listeners ────────────────────────────────────────────────────────

      // Token FCM obtido
      const regListener = await Push.addListener('registration', async (tokenData: Token) => {
        const platform = Capacitor.getPlatform() // 'android' | 'ios'
        await sendTokenToBackend(tokenData.value, platform)
      })

      // Erro de registro
      const regErrListener = await Push.addListener('registrationError', (err: RegistrationError) => {
        console.error('[Push] Erro de registro:', err)
        setIsRegistered(false)
      })

      // Notificação recebida com app em FOREGROUND — exibir banner in-app
      const rcvListener = await Push.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
        console.log('[Push] Recebida em foreground:', notification.title)
        // O evento de UI é emitido para que o componente NotificationBanner possa capturá-lo
        window.dispatchEvent(new CustomEvent('push:foreground', {
          detail: {
            title: notification.title,
            body: notification.body,
            data: notification.data,
          },
        }))
      })

      // Usuário TOCOU na notificação (app em background/fechado)
      const actionListener = await Push.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
        console.log('[Push] Ação realizada:', action.notification.title)
        handleNotificationAction(action.notification.data as Record<string, string>)
      })

      cleanup = () => {
        regListener.remove()
        regErrListener.remove()
        rcvListener.remove()
        actionListener.remove()
      }
    }

    init()
    return () => { cleanup?.() }
  }, [sendTokenToBackend, handleNotificationAction])

  // ─── Solicitar permissão (chamado pelo usuário) ───────────────────────────
  const requestPermission = useCallback(async (): Promise<boolean> => {
    const Push = await getPushPlugin()
    if (!Push) {
      // Web — tentar usar a Web Notifications API como fallback
      if (!('Notification' in window)) {
        setPermissionStatus('denied')
        return false
      }
      try {
        const result = await Notification.requestPermission()
        const granted = result === 'granted'
        setPermissionStatus(granted ? 'granted' : 'denied')
        return granted
      } catch {
        setPermissionStatus('denied')
        return false
      }
    }

    const result = await Push.requestPermissions()
    const granted = result.receive === 'granted'
    setPermissionStatus(result.receive as PushPermissionStatus)

    if (granted) {
      await Push.register()
    }

    return granted
  }, [])

  // ─── Descadastrar (limpar token local) ───────────────────────────────────
  const unregister = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY)
    setIsRegistered(false)
    setPermissionStatus('prompt')
  }, [])

  return { permissionStatus, isRegistered, requestPermission, unregister }
}
