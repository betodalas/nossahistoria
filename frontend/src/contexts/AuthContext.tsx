import { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { authService } from '../services/api'

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
  user1_id?: string
  user2_id?: string
  partner_name?: string
  partner_email?: string
}

interface AuthContextType {
  user: User | null
  couple: Couple | null
  isPremium: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  loginWithGoogle: (credential: string) => Promise<void>
  logout: () => void
  refreshCouple: () => Promise<void>
  saveCouple: (data: any) => void
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [couple, setCouple] = useState<Couple | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('token')
    if (token) {
      authService.me()
        .then(res => {
          setUser(res.data.user)
          setCouple(res.data.couple || null)
        })
        .catch(() => {
          localStorage.removeItem('token')
          localStorage.removeItem('user')
          localStorage.removeItem('couple')
        })
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
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
      setCouple(res.data.couple || null)
      if (res.data.couple) {
        localStorage.setItem('couple', JSON.stringify(res.data.couple))
      }
    } catch {}
  }

  return (
    <AuthContext.Provider value={{
      user, couple,
      isPremium: couple?.is_premium || false,
      loading,
      login, loginWithGoogle, logout, refreshCouple, saveCouple
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
