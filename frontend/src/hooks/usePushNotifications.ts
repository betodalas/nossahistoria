import { useEffect, useCallback, useRef, useState } from 'react'
import { Capacitor, registerPlugin } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { useNavigate } from 'react-router-dom'
import api from '../services/api'

import type {
  Token,
  RegistrationError,
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications'

// Plugin nativo que busca o token FCM diretamente,
// contornando o bloqueio do MIUI no broadcast do Capacitor
interface FcmTokenPlugin {
  getToken(): Promise<{ token: string }>
}
const FcmToken = registerPlugin<FcmTokenPlugin>('FcmToken')

const STORAGE_KEY = 'push_registered_token'
const ASKED_KEY = 'push_permission_asked'

const IS_DEV = import.meta.env.DEV

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
  const listenersRef = useRef<PluginListenerHandle[]>([])
  const initializedRef = useRef(false)
  const mockSentRef = useRef(false)
  const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const sendTokenToBackend = useCallback(async (token: string, platform: string) => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === token) {
      setIsRegistered(true)
      return
    }
    try {
      await api.post('/notifications/token', { token, platform })
      localStorage.setItem(STORAGE_KEY, token)
      setIsRegistered(true)
      console.log('[Push] Token registrado no backend ✓', token.slice(0, 20) + '...')

      // Token recebido — cancela qualquer retry pendente
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current)
        retryIntervalRef.current = null
      }
    } catch (err) {
      console.warn('[Push] Falha ao registrar token:', err)
    }
  }, [])

  const sendMockToken = useCallback(async () => {
    if (!IS_DEV || mockSentRef.current) return
    mockSentRef.current = true
    const mockToken = 'MOCK_DEV_TOKEN_' + Date.now()
    console.log('[Push] ⚠️ Emulador/Dev: usando token mock para teste')
    await sendTokenToBackend(mockToken, 'android')
  }, [sendTokenToBackend])

  /**
   * FIX MIUI: busca token diretamente via plugin nativo,
   * sem depender do evento 'registration' do Capacitor.
   * O MIUI bloqueia o broadcast mas não bloqueia chamada direta ao SDK.
   */
  const fetchTokenNative = useCallback(async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) return false
    try {
      console.log('[Push] Tentando buscar token via plugin nativo...')
      const { token } = await FcmToken.getToken()
      if (token) {
        const platform = Capacitor.getPlatform()
        console.log('[Push] Token obtido via plugin nativo ✓')
        await sendTokenToBackend(token, platform)
        return true
      }
    } catch (err) {
      console.warn('[Push] Plugin nativo falhou:', err)
    }
    return false
  }, [sendTokenToBackend])

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

  const setupListeners = useCallback(async () => {
    if (listenersRef.current.length > 0) {
      await Promise.all(listenersRef.current.map(h => h.remove()))
      listenersRef.current = []
    }

    const h1 = await PushNotifications.addListener('registration', async (tokenData: Token) => {
      const platform = Capacitor.getPlatform()
      console.log('[Push] Token FCM recebido via evento ✓')
      await sendTokenToBackend(tokenData.value, platform)
    })

    const h2 = await PushNotifications.addListener('registrationError', (err: RegistrationError) => {
      console.error('[Push] Erro de registro FCM:', err)
      setIsRegistered(false)
      if (IS_DEV) sendMockToken()
    })

    const h3 = await PushNotifications.addListener('pushNotificationReceived', (n: PushNotificationSchema) => {
      console.log('[Push] Recebida em foreground:', n.title)
      window.dispatchEvent(new CustomEvent('push:foreground', {
        detail: { title: n.title, body: n.body, data: n.data },
      }))
    })

    const h4 = await PushNotifications.addListener('pushNotificationActionPerformed', (action: ActionPerformed) => {
      console.log('[Push] Ação realizada:', action.notification.title)
      handleNotificationAction(action.notification.data as Record<string, string>)
    })

    listenersRef.current = [h1, h2, h3, h4]
    console.log('[Push] Listeners registrados ✓')
  }, [sendTokenToBackend, sendMockToken, handleNotificationAction])

  /**
   * Retry com fallback nativo para contornar MIUI/Xiaomi
   */
  const startRegisterRetry = useCallback(() => {
    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current)
      retryIntervalRef.current = null
    }

    let attempts = 0
    const MAX_ATTEMPTS = 5

    retryIntervalRef.current = setInterval(async () => {
      if (localStorage.getItem(STORAGE_KEY)) {
        clearInterval(retryIntervalRef.current!)
        retryIntervalRef.current = null
        return
      }

      attempts++
      console.warn(`[Push] Token ainda não chegou — retry ${attempts}/${MAX_ATTEMPTS} (MIUI/bateria?)`)

      // Tenta plugin nativo primeiro (contorna MIUI)
      const gotToken = await fetchTokenNative()
      if (gotToken) return

      // Fallback: tenta register() novamente
      try {
        await PushNotifications.register()
      } catch (err) {
        console.warn('[Push] Erro no retry de register():', err)
      }

      if (attempts >= MAX_ATTEMPTS) {
        clearInterval(retryIntervalRef.current!)
        retryIntervalRef.current = null
        console.error('[Push] Token FCM não chegou após todas as tentativas.')
        if (IS_DEV) sendMockToken()
      }
    }, 8000)
  }, [fetchTokenNative, sendMockToken])

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

    if (initializedRef.current) return
    initializedRef.current = true

    const init = async () => {
      try {
        const current = await PushNotifications.checkPermissions()
        const rawStatus = current.receive as string

        const hasToken = !!localStorage.getItem(STORAGE_KEY)
        const alreadyAsked = !!localStorage.getItem(ASKED_KEY)
        if (!hasToken && alreadyAsked && rawStatus !== 'granted') {
          console.log('[Push] Possível reinstalação — resetando flag')
          localStorage.removeItem(ASKED_KEY)
        }

        const neverAsked = !localStorage.getItem(ASKED_KEY)

        let status: PushPermissionStatus
        if (rawStatus === 'granted') {
          status = 'granted'
        } else if (rawStatus === 'prompt-with-rationale') {
          status = 'prompt'
        } else if (rawStatus === 'denied' && neverAsked) {
          status = 'prompt'
        } else {
          status = rawStatus as PushPermissionStatus
        }

        console.log(`[Push] checkPermissions: raw=${rawStatus} → mapped=${status}`)
        setPermissionStatus(status)

        if (status === 'granted') {
          await setupListeners()
          await PushNotifications.register()
          console.log('[Push] register() chamado (já tinha permissão)')

          // Tenta plugin nativo imediatamente
          const gotToken = await fetchTokenNative()

          // Se não conseguiu, inicia retries
          if (!gotToken && !localStorage.getItem(STORAGE_KEY)) {
            startRegisterRetry()
          }

          if (IS_DEV) {
            setTimeout(() => sendMockToken(), 10000)
          }
        }
      } catch (err) {
        console.error('[Push] Erro na inicialização:', err)
      }
    }

    init()

    return () => {
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current)
        retryIntervalRef.current = null
      }
    }
  }, [setupListeners, sendMockToken, startRegisterRetry, fetchTokenNative])

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

      await setupListeners()

      const result = await PushNotifications.requestPermissions()
      const granted = result.receive === 'granted'
      console.log(`[Push] requestPermissions resultado: ${result.receive}`)
      setPermissionStatus(result.receive as PushPermissionStatus)

      if (granted) {
        await new Promise(resolve => setTimeout(resolve, 300))
        await PushNotifications.register()
        console.log('[Push] register() chamado após permissão concedida')

        // Tenta plugin nativo imediatamente
        const gotToken = await fetchTokenNative()

        // Se não conseguiu, inicia retries
        if (!gotToken && !localStorage.getItem(STORAGE_KEY)) {
          startRegisterRetry()
        }

        if (IS_DEV) {
          setTimeout(() => sendMockToken(), 10000)
        }
      }
      return granted
    } catch (err) {
      console.error('[Push] Erro ao pedir permissão:', err)
      return false
    }
  }, [setupListeners, sendMockToken, startRegisterRetry, fetchTokenNative])

  const unregister = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(ASKED_KEY)
    setIsRegistered(false)
    setPermissionStatus('prompt')
    initializedRef.current = false
    mockSentRef.current = false

    if (retryIntervalRef.current) {
      clearInterval(retryIntervalRef.current)
      retryIntervalRef.current = null
    }

    await Promise.all(listenersRef.current.map(h => h.remove()))
    listenersRef.current = []
  }, [])

  return { permissionStatus, isRegistered, requestPermission, unregister }
}
