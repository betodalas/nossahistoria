import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { PayPalScriptProvider } from '@paypal/react-paypal-js'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import { useEffect } from 'react'
import { App as CapApp } from '@capacitor/app'
import { usePushNotifications } from './hooks/usePushNotifications'
import NotificationBanner from './components/NotificationBanner'
import Login from './pages/Login'
import Register from './pages/Register'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Timeline from './pages/Timeline'
import AddMoment from './pages/AddMoment'
import Questions from './pages/Questions'
import Book from './pages/Book'
import Premium from './pages/Premium'
import PaymentSuccess from './pages/PaymentSuccess'
import Profile from './pages/Profile'
import Invite from './pages/Invite'
import AcceptInvite from './pages/AcceptInvite'
import GuestAlbum from './pages/GuestAlbum'
import PublicAlbum from './pages/PublicAlbum'
import AlbumPayment from './pages/AlbumPayment'
import Storage from './pages/Storage'
import BookPDF from './pages/BookPDF'
import Splash from './pages/Splash'

function PushRegistrar() {
  const { permissionStatus, requestPermission } = usePushNotifications()

  useEffect(() => {
    // Pedir permissão automaticamente na primeira vez (status 'prompt' = ainda não perguntou)
    if (permissionStatus === 'prompt') {
      requestPermission()
    }
  }, [permissionStatus])

  return null
}

function DeepLinkHandler() {
  const navigate = useNavigate()
  useEffect(() => {
    const handler = CapApp.addListener('appUrlOpen', (data) => {
      const match = data.url.match(/nossahistoria:\/\/convite\/(.+)/)
      if (match) navigate(`/convite/${match[1]}`)
    })
    return () => { handler.then(h => h.remove()) }
  }, [])
  return null
}

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: '#FFF0F3' }}>
      <div style={{ color: '#C9A0B0', fontSize: '14px' }}>Carregando...</div>
    </div>
  )
  return user ? children : <Navigate to="/login" />
}

const RootRoute = () => {
  const { user, loading } = useAuth()
  if (loading) return <Splash />
  const splashShown = sessionStorage.getItem('splash_shown')
  if (splashShown) return user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
  return <Splash />
}

function App() {
  return (
    <PayPalScriptProvider options={{ clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || 'test', currency: 'BRL' }}>
      <AuthProvider>
        <BrowserRouter>
          <DeepLinkHandler />
          <PushRegistrar />
          <NotificationBanner />
          <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Register />} />
            <Route path="/esqueci-senha" element={<ForgotPassword />} />
            <Route path="/redefinir-senha" element={<ResetPassword />} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/linha-do-tempo" element={<PrivateRoute><Timeline /></PrivateRoute>} />
            <Route path="/novo-momento" element={<PrivateRoute><AddMoment /></PrivateRoute>} />
            <Route path="/perguntas" element={<PrivateRoute><Questions /></PrivateRoute>} />
            <Route path="/nosso-livro" element={<PrivateRoute><Book /></PrivateRoute>} />
            <Route path="/premium" element={<PrivateRoute><Premium /></PrivateRoute>} />
            <Route path="/perfil" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/convidar" element={<PrivateRoute><Invite /></PrivateRoute>} />
            <Route path="/convite/:token" element={<AcceptInvite />} />
            <Route path="/album-convidados" element={<PrivateRoute><GuestAlbum /></PrivateRoute>} />
            <Route path="/album-convidados/info" element={<PrivateRoute><AlbumPayment /></PrivateRoute>} />
            <Route path="/album-convidados/:token" element={<PublicAlbum />} />
            <Route path="/armazenamento" element={<PrivateRoute><Storage /></PrivateRoute>} />
            <Route path="/livro-pdf" element={<PrivateRoute><BookPDF /></PrivateRoute>} />
            <Route path="/pagamento/sucesso" element={<PrivateRoute><PaymentSuccess /></PrivateRoute>} />
            <Route path="/splash" element={<Splash />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </BrowserRouter>
      </AuthProvider>
    </PayPalScriptProvider>
  )
}

export default App
