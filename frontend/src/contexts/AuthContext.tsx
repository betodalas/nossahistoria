import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authService } from '../services/api'
import { Capacitor } from '@capacitor/core'

interface User {
  id: string
  name: string
  email: string
  avatar_url?: string
}

interface Couple {
  id: string
  couple_name?: string
  wedding_date?: string
  is_premium?: boolean
  album_paid?: boolean
  user1_id?: string
  user2_id?: string
  partner_name?: string
  partner_email?: string
}

interface AuthContextType {
  user: User | null
  couple: Couple | null
  isPremium: boolean
  hasAlbum: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: (credential: string) => Promise<void>
  logout: () => void
  refreshCouple: () => Promise<void>
  saveCouple: (data: any) => void
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(() => {
    try { return JSON.parse(localStorage.getItem('user') || 'null') } catch { return null }
  })
  const [couple, setCouple] = useState<Couple | null>(() => {
    try { return JSON.parse(localStorage.getItem('couple') || 'null') } catch { return null }
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const clearIfReinstalled = async () => {
      if (Capacitor.isNativePlatform()) {
        try {
          const { Preferences } = await import('@capacitor/preferences')
          const { value } = await Preferences.get({ key: 'app_installed' })
          if (!value) {
            // Primeira vez após (re)instalação — limpa TODOS os dados legados
            // incluindo push_permission_asked para que o diálogo apareça de novo
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            localStorage.removeItem('couple')
            localStorage.removeItem('push_registered_token')
            localStorage.removeItem('push_permission_asked')  // ← fix: limpa flag de permissão
            await Preferences.set({ key: 'app_installed', value: '1' })
          }
        } catch {
          // @capacitor/preferences não disponível — ignora silenciosamente
        }
      }
      initAuth()
    }

    const initAuth = () => {
      const token = localStorage.getItem('token')
      if (token) {
        authService.me()
          .then(res => {
            const u = res.data.user
            const c = res.data.couple || null
            setUser(u)
            setCouple(c)
            localStorage.setItem('user', JSON.stringify(u))
            if (c) localStorage.setItem('couple', JSON.stringify(c))
            else localStorage.removeItem('couple')
          })
          .catch(() => {
            localStorage.removeItem('token')
            localStorage.removeItem('user')
            localStorage.removeItem('couple')
            setUser(null)
            setCouple(null)
          })
          .finally(() => setLoading(false))
      } else {
        setLoading(false)
      }
    }

    clearIfReinstalled()
  }, [])

  const login = async (email: string, password: string) => {
    const res = await authService.login({ email, password })
    const { user, couple, token } = res.data
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    if (couple) localStorage.setItem('couple', JSON.stringify(couple))
    setUser(user)
    setCouple(couple || null)
  }

  const loginWithGoogle = async (credential: string) => {
    const res = await authService.googleLogin({ credential })
    const { user, couple, token } = res.data
    localStorage.setItem('token', token)
    localStorage.setItem('user', JSON.stringify(user))
    if (couple) localStorage.setItem('couple', JSON.stringify(couple))
    setUser(user)
    setCouple(couple || null)
  }

  const logout = () => {
    setUser(null)
    setCouple(null)
    localStorage.removeItem('token')
    localStorage.removeItem('user')
    localStorage.removeItem('couple')
  }

  const saveCouple = (data: any) => {
    setCouple(data)
    localStorage.setItem('couple', JSON.stringify(data))
  }

  const refreshCouple = async () => {
    try {
      const res = await authService.me()
      const c = res.data.couple || null
      setCouple(c)
      if (c) localStorage.setItem('couple', JSON.stringify(c))
      else localStorage.removeItem('couple')
    } catch {}
  }

  return (
    <AuthContext.Provider value={{
      user, couple,
      isPremium: couple?.is_premium || false,
      hasAlbum: couple?.is_premium || couple?.album_paid || false,
      loading,
      login, loginWithGoogle, logout, refreshCouple, saveCouple
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
