/**
 * PushContext
 * Garante uma única instância do usePushNotifications em todo o app.
 * Evita conflito de estado entre App.tsx e Profile.tsx.
 */

import { createContext, useContext, ReactNode } from 'react'
import { usePushNotifications } from '../hooks/usePushNotifications'
import type { PushPermissionStatus } from '../hooks/usePushNotifications'

interface PushContextValue {
  permissionStatus: PushPermissionStatus
  isRegistered: boolean
  requestPermission: () => Promise<boolean>
  unregister: () => Promise<void>
}

const PushContext = createContext<PushContextValue | null>(null)

export function PushProvider({ children }: { children: ReactNode }) {
  const push = usePushNotifications()
  return <PushContext.Provider value={push}>{children}</PushContext.Provider>
}

export function usePush(): PushContextValue {
  const ctx = useContext(PushContext)
  if (!ctx) throw new Error('usePush deve ser usado dentro de PushProvider')
  return ctx
}
