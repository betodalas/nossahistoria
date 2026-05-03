import { useEffect, useCallback, useRef, useState } from 'react'
import { Capacitor } from '@capacitor/core'
import type { PluginListenerHandle } from '@capacitor/core'
import { PushNotifications } from '@capacitor/push-notifications'
import { useNavigate } from 'react-router-dom'
import { initializeApp, getApps } from 'firebase/app'
import { getMessaging, getToken } from 'firebase/messaging'
import api from '../services/api'

import type {
  Token,
  RegistrationError,
  PushNotificationSchema,
  ActionPerformed,
} from '@capacitor/push-notifications'

// ─── Firebase config (espelha o google-services.json) ────────────────────────
const firebaseConfig = {
  projectId:        'nossahistoria-67c05',
  appId:            '1:263899434835:android:fb5129b4f1e1828e475ba6',
  apiKey:           'AIzaSyCxPR70Hha11gcNVtb1DUUu3DTl9DViI-U',
  messagingSenderId: '263899434835',
  storageBucket:    'nossahistoria-67c05.firebasestorage.app',
}

const STORAGE_KEY = 'push_registered_token'
const ASKED_KEY   = 'push_permission_asked'
const IS_DEV      = import.meta.env.DEV

export type PushPermissionStatus = 'unknown' | 'granted' | 'denied' | 'prompt'

interface UsePushNotificationsReturn {
  permissionStatus: PushPermissionStatus
  isRegistered:     boolean
  requestPermission: () => Promise<boolean>
  unregister:        () => Promise<void>
}

// Inicializa Firebase JS SDK uma única vez
function getFirebaseApp() {
  if (getApps().length) return getApps()[0]
  return initializeApp(firebaseConfig)
}

export function usePushNotifications(): UsePushNotificationsReturn {
  const navigate = useNavigate()
  const [permissionStatus, setPermissionStatus] = useState<PushPermissionStatus>('unknown')
  const [isRegistered,     setIsRegistered]     = useState(false)
  const listenersRef     = useRef<PluginListenerHandle[]>([])
  const initializedRef   = useRef(false)
  const retryIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ─── Envia token ao backend ────────────────────────────────────────────────
  const sendTokenToBackend = useCallback(async (token: string, platform: string) => {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved === token) { setIsRegistered(true); return }
    try {
      await api.post('/notifications/token', { token, platform })
      localStorage.setItem(STORAGE_KEY, token)
      setIsRegistered(true)
      console.log('[Push] Token registrado no backend ✓', token.slice(0, 20) + '...')
      if (retryIntervalRef.current) {
        clearInterval(retryIntervalRef.current)
        retryIntervalRef.current = null
      }
    } catch (err) {
      console.warn('[Push] Falha ao registrar token no backend:', err)
    }
  }, [])

  /**
   * ─── SOLUÇÃO MIUI ──────────────────────────────────────────────────────────
   * O MIUI bloqueia o broadcast nativo do FCM *e* o Firebase Installations,
   * então o evento 'registration' do Capacitor nunca dispara e o plugin nativo
   * FcmToken também dá timeout.
   *
   * O Firebase JS SDK usa HTTP puro (não usa broadcast nem Installations nativo),
   * por isso consegue buscar o token mesmo no MIUI.
   */
  const fetchTokenViaJsSdk = useCallback(async (): Promise<boolean> => {
    try {
      console.log('[Push] Buscando token via Firebase JS SDK (HTTP)...')
      const app       = getFirebaseApp()
      const messaging = getMessaging(app)
      const token     = await getToken(messaging)
      if (token) {
        const platform = Capacitor.isNativePlatform() ? Capacitor.getPlatform() : 'web'
        console.log('[Push] Token via JS SDK ✓')
        await sendTokenToBackend(token, platform)
        return true
      }
    } catch (err) {
      console.warn('[Push] Firebase JS SDK falhou:', err)
    }
    return false
  }, [sendTokenToBackend])

  // ─── Navegação por notificação ─────────────────────────────────────────────
  const handleNotificationAction = useCallback((data?: Record<string, string>) => {
    const routes: Record<string, string> = {
      timeline:  '/linha-do-tempo',
      questions: '/perguntas',
      dashboard: '/dashboard',
      profile:   '/perfil',
      moments:   '/linha-do-tempo',
    }
    const route = data?.screen ? routes[data.screen] : null
    if (route) navigate(route)
  }, [navigate])

  // ─── Registra listeners do Capacitor ──────────────────────────────────────
  const setupListeners = useCallback(async () => {
    await Promise.all(listenersRef.current.map(h => h.remove()))
    listenersRef.current = []

    // Evento nativo — funciona em dispositivos normais
    const h1 = await PushNotifications.addListener('registration', async (t: Token) => {
      console.log('[Push] Token via evento Capacitor ✓')
      await sendTokenToBackend(t.value, Capacitor.getPlatform())
    })

    // Fallback imediato para JS SDK quando o evento nativo falha (MIUI/Xiaomi)
    const h2 = await PushNotifications.addListener('registrationError', async (err: RegistrationError) => {
      console.error('[Push] registrationError — tentando JS SDK como fallback:', err)
      await fetchTokenViaJsSdk()
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
  }, [sendTokenToBackend, fetchTokenViaJsSdk, handleNotificationAction])

  // ─── Retry com JS SDK (substitui o plugin nativo FcmToken) ────────────────
  const startRetry = useCallback(() => {
    if (retryIntervalRef.current) return
    let attempts = 0
    const MAX = 5

    retryIntervalRef.current = setInterval(async () => {
      if (localStorage.getItem(STORAGE_KEY)) {
        clearInterval(retryIntervalRef.current!); retryIntervalRef.current = null; return
      }

      attempts++
      console.warn(`[Push] Token ainda não chegou — retry ${attempts}/${MAX}`)

      // JS SDK primeiro (contorna MIUI)
      const ok = await fetchTokenViaJsSdk()
      if (!ok) {
        // Fallback: tenta register() novamente
        try { await PushNotifications.register() } catch {}
      }

      if (attempts >= MAX) {
        clearInterval(retryIntervalRef.current!); retryIntervalRef.current = null
        console.error('[Push] Token FCM não chegou após todas as tentativas.')
      }
    }, 8000)
  }, [fetchTokenViaJsSdk])

  // ─── Inicialização ────────────────────────────────────────────────────────
  useEffect(() => {
    // Web / PWA
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
        const current    = await PushNotifications.checkPermissions()
        const rawStatus  = current.receive as string
        const hasToken   = !!localStorage.getItem(STORAGE_KEY)
        const alreadyAsked = !!localStorage.getItem(ASKED_KEY)

        // Reinstalação: reseta flag para poder perguntar de novo
        if (!hasToken && alreadyAsked && rawStatus !== 'granted') {
          console.log('[Push] Possível reinstalação — resetando flag')
          localStorage.removeItem(ASKED_KEY)
        }

        const neverAsked = !localStorage.getItem(ASKED_KEY)
        const status: PushPermissionStatus =
          rawStatus === 'granted'               ? 'granted' :
          rawStatus === 'prompt-with-rationale' ? 'prompt'  :
          rawStatus === 'denied' && neverAsked  ? 'prompt'  :
          rawStatus as PushPermissionStatus

        console.log(`[Push] checkPermissions: raw=${rawStatus} → mapped=${status}`)
        setPermissionStatus(status)

        if (status === 'granted') {
          await setupListeners()
          await PushNotifications.register()
          console.log('[Push] register() chamado (permissão já existia)')

          // Tenta JS SDK imediatamente; se falhar, inicia retries
          const ok = await fetchTokenViaJsSdk()
          if (!ok && !localStorage.getItem(STORAGE_KEY)) startRetry()
        }
      } catch (err) {
        console.error('[Push] Erro na inicialização:', err)
      }
    }

    init()

    return () => {
      if (retryIntervalRef.current) { clearInterval(retryIntervalRef.current); retryIntervalRef.current = null }
    }
  }, [setupListeners, fetchTokenViaJsSdk, startRetry])

  // ─── Pedir permissão ──────────────────────────────────────────────────────
  const requestPermission = useCallback(async (): Promise<boolean> => {
    // Web / PWA
    if (!Capacitor.isNativePlatform()) {
      if (!('Notification' in window)) { setPermissionStatus('denied'); return false }
      try {
        const result  = await Notification.requestPermission()
        const granted = result === 'granted'
        setPermissionStatus(granted ? 'granted' : 'denied')
        return granted
      } catch {
        setPermissionStatus('denied')
        return false
      }
    }

    // Android / iOS
    try {
      console.log('[Push] Chamando requestPermissions()...')
      localStorage.setItem(ASKED_KEY, '1')

      await setupListeners()

      const result  = await PushNotifications.requestPermissions()
      const granted = result.receive === 'granted'
      console.log(`[Push] requestPermissions resultado: ${result.receive}`)
      setPermissionStatus(result.receive as PushPermissionStatus)

      if (granted) {
        await new Promise(resolve => setTimeout(resolve, 300))
        await PushNotifications.register()
        console.log('[Push] register() chamado após permissão concedida')

        const ok = await fetchTokenViaJsSdk()
        if (!ok && !localStorage.getItem(STORAGE_KEY)) startRetry()
      }

      return granted
    } catch (err) {
      console.error('[Push] Erro ao pedir permissão:', err)
      return false
    }
  }, [setupListeners, fetchTokenViaJsSdk, startRetry])

  // ─── Desregistrar ─────────────────────────────────────────────────────────
  const unregister = useCallback(async () => {
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(ASKED_KEY)
    setIsRegistered(false)
    setPermissionStatus('prompt')
    initializedRef.current = false

    if (retryIntervalRef.current) { clearInterval(retryIntervalRef.current); retryIntervalRef.current = null }
    await Promise.all(listenersRef.current.map(h => h.remove()))
    listenersRef.current = []
  }, [])

  return { permissionStatus, isRegistered, requestPermission, unregister }
}
