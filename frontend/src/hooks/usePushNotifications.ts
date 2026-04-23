import { useEffect } from 'react'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import api from '../services/api'

/**
 * Registra o device para push notifications via Capacitor.
 * Só roda em Android/iOS nativos — no browser, é no-op silencioso.
 *
 * Fluxo:
 *  1. Pede permissão ao OS
 *  2. Recebe FCM token do device
 *  3. Envia o token para o backend (POST /notifications/token)
 *  4. Escuta notificações recebidas com o app aberto (foreground)
 */
export function usePushNotifications(userId: string | undefined) {
  useEffect(() => {
    if (!userId) return
    if (!Capacitor.isNativePlatform()) return

    const register = async () => {
      // 1. Pede permissão
      const permission = await PushNotifications.requestPermissions()
      if (permission.receive !== 'granted') return

      // 2. Inicia o processo de registro (dispara o evento 'registration')
      await PushNotifications.register()
    }

    // 3. Recebe o FCM token e envia ao backend
    const tokenListener = PushNotifications.addListener('registration', async (token) => {
      try {
        await api.post('/notifications/token', {
          token: token.value,
          platform: Capacitor.getPlatform(), // 'android' | 'ios'
        })
      } catch (err) {
        console.warn('[Push] Falha ao salvar token:', err)
      }
    })

    // 4. Notificação recebida com app aberto — apenas loga por ora
    const foregroundListener = PushNotifications.addListener(
      'pushNotificationReceived',
      (notification) => {
        console.log('[Push] Notificação foreground:', notification)
      }
    )

    // 5. Usuário tocou na notificação — pode navegar para a tela certa aqui
    const actionListener = PushNotifications.addListener(
      'pushNotificationActionPerformed',
      (action) => {
        console.log('[Push] Ação na notificação:', action)
        // Futuramente: navegar para /linha-do-tempo, /perguntas, etc.
        // baseado em action.notification.data.screen
      }
    )

    register()

    return () => {
      tokenListener.then(l => l.remove())
      foregroundListener.then(l => l.remove())
      actionListener.then(l => l.remove())
    }
  }, [userId])
}
