import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

interface AuthContextType {
  user: any
  couple: any
  isPremium: boolean
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshCouple: () => Promise<void>
  saveCouple: (data: any) => void
}

const AuthContext = createContext<AuthContextType>({} as AuthContextType)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<any>(null)
  const [couple, setCouple] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const savedUser = localStorage.getItem('user')
    const savedCouple = localStorage.getItem('couple')
    if (savedUser) setUser(JSON.parse(savedUser))
    if (savedCouple) setCouple(JSON.parse(savedCouple))
    setLoading(false)
  }, [])

  const login = async (email: string, _password: string) => {
    const u = { id: '1', name: email.split('@')[0], email }
    setUser(u)
    localStorage.setItem('user', JSON.stringify(u))
    const savedCouple = localStorage.getItem('couple')
    if (savedCouple) setCouple(JSON.parse(savedCouple))
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('user')
  }

  const saveCouple = (data: any) => {
    setCouple(data)
    localStorage.setItem('couple', JSON.stringify(data))
  }

  const refreshCouple = async () => {}

  return (
    <AuthContext.Provider value={{
      user, couple,
      isPremium: couple?.isPremium || false,
      loading,
      login, logout, refreshCouple, saveCouple
    }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
