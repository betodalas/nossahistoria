import { useEffect, useCallback, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

import type {
  Token,
  RegistrationError,
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications'

const STORAGE_KEY = 'push_registered_token'
const ASKED_KEY = 'push_permission_asked'

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

  const sendTokenToBackend = useCallback(async (token: string, platform: string) => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === token) return
    try {
      await api.post('/notifications/token', { token, platform })
      localStorage.setItem(STORAGE_KEY, token)
      setIsRegistered(true)
      console.log('[Push] Token registrado no backend ✓', token.slice(0, 20) + '...')
    } catch (err) {
      console.warn('[Push] Falha ao registrar token:', err)
    }
  }, [])

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

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) {
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
      try {
        const current = await PushNotifications.checkPermissions()
        const rawStatus = current.receive as string

        const hasToken = !!localStorage.getItem(STORAGE_KEY)
        const alreadyAsked = !!localStorage.getItem(ASKED_KEY)
        if (!hasToken && alreadyAsked && rawStatus !== 'granted') {
          console.log('[Push] Possível reinstalação — resetando flag de permissão')
          localStorage.removeItem(ASKED_KEY)
        }

        const neverAsked = !localStorage.getItem(ASKED_KEY)

        let status: PushPermissionStatus
        if (rawStatus === 'granted') {
          status = 'granted'
        } else if (rawStatus === 'prompt-with-rationale') {
          status = 'prompt'
        } else if (rawStatus === 'denied' && neverAsked) {
          console.log('[Push] Status inicial Android → tratando como prompt')
          status = 'prompt'
        } else {
          status = rawStatus as PushPermissionStatus
        }

        console.log(`[Push] checkPermissions: raw=${rawStatus} → mapped=${status} neverAsked=${neverAsked}`)
        setPermissionStatus(status)

        if (status === 'granted') {
          await PushNotifications.register()
        }

        const regListener = await PushNotifications.addListener('registration', async (tokenData: Token) => {
          const platform = Capacitor.getPlatform()
          console.log('[Push] Token FCM recebido ✓')
          await sendTokenToBackend(tokenData.value, platform)
        })

        const regErrListener = await PushNotifications.addListener('registrationError', (err: RegistrationError) => {
          console.error('[Push] Erro de registro FCM:', err)
          setIsRegistered(false)
        })

        const rcvListener = await PushNotifications.addListener('pushNotificationReceived', (notification: PushNotificationSchema) => {
          console.log('[Push] Recebida em foreground:', notification.title)
          window.dispatchEvent(new CustomEvent('push:foreground', {
            detail: { title: notification.title, body: notification.body, data: notification.data },
          }))
        })

        const actionListener = await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
          console.log('[Push] Ação realizada:', action.notification.title)
          handleNotificationAction(action.notification.data as Record<string, string>)
        })

        cleanup = () => {
          regListener.remove()
          regErrListener.remove()
          rcvListener.remove()
          actionListener.remove()
        }
      } catch (err) {
        console.error('[Push] Erro na inicialização:', err)
      }
    }

    init()
    return () => { cleanup?.() }
  }, [sendTokenToBackend, handleNotificationAction])

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      if (!('Notification' in window)) { setPermissionStatus('denied'); return false }
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

    try {
      console.log('[Push] Chamando requestPermissions()...')
      localStorage.setItem(ASKED_KEY, '1')
      const result = await PushNotifications.requestPermissions()
      const granted = result.receive === 'granted'
      console.log(`[Push] requestPermissions resultado: ${result.receive}`)
      setPermissionStatus(result.receive as PushPermissionStatus)
      if (granted) {
        await PushNotifications.register()
      }
      return granted
    } catch (err) {
      console.error('[Push] Erro ao pedir permissão:', err)
      return false
    }
  }, [])

  const unregister = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(ASKED_KEY)
    setIsRegistered(false)
    setPermissionStatus('prompt')
  }, [])

  return { permissionStatus, isRegistered, requestPermission, unregister }
}
