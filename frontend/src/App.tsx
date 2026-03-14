import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { PayPalScriptProvider } from '@paypal/react-paypal-js'
import { AuthProvider, useAuth } from './contexts/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import Dashboard from './pages/Dashboard'
import Timeline from './pages/Timeline'
import AddMoment from './pages/AddMoment'
import Questions from './pages/Questions'
import Book from './pages/Book'
import Premium from './pages/Premium'
import PaymentSuccess from './pages/PaymentSuccess'
import Profile from './pages/Profile'
import WeddingDay from './pages/WeddingDay'
import Invite from './pages/Invite'
import GuestAlbum from './pages/GuestAlbum'
import Storage from './pages/Storage'
import BookPDF from './pages/BookPDF'
import Splash from './pages/Splash'

const PrivateRoute = ({ children }: { children: JSX.Element }) => {
  const { user, loading } = useAuth()
  if (loading) return (
    <div className="min-h-screen flex items-center justify-center" style={{background:'#0f0a1a'}}>
      <div className="text-white/40 text-sm">Carregando...</div>
    </div>
  )
  return user ? children : <Navigate to="/login" />
}

// Rota raiz: sempre mostra Splash primeiro, que depois redireciona
const RootRoute = () => {
  const { user, loading } = useAuth()
  // Enquanto carrega, mostra Splash
  if (loading) return <Splash />
  // Se já passou pela splash nesta sessão, vai direto
  const splashShown = sessionStorage.getItem('splash_shown')
  if (splashShown) {
    return user ? <Navigate to="/dashboard" /> : <Navigate to="/login" />
  }
  return <Splash />
}

function App() {
  return (
    <PayPalScriptProvider options={{ clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID || 'test', currency: 'BRL' }}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<RootRoute />} />
            <Route path="/login" element={<Login />} />
            <Route path="/cadastro" element={<Register />} />
            <Route path="/dashboard" element={<PrivateRoute><Dashboard /></PrivateRoute>} />
            <Route path="/linha-do-tempo" element={<PrivateRoute><Timeline /></PrivateRoute>} />
            <Route path="/novo-momento" element={<PrivateRoute><AddMoment /></PrivateRoute>} />
            <Route path="/perguntas" element={<PrivateRoute><Questions /></PrivateRoute>} />
            <Route path="/nosso-livro" element={<PrivateRoute><Book /></PrivateRoute>} />
            <Route path="/premium" element={<PrivateRoute><Premium /></PrivateRoute>} />
            <Route path="/perfil" element={<PrivateRoute><Profile /></PrivateRoute>} />
            <Route path="/convidar" element={<PrivateRoute><Invite /></PrivateRoute>} />
            <Route path="/album-convidados" element={<PrivateRoute><GuestAlbum /></PrivateRoute>} />
            <Route path="/armazenamento" element={<PrivateRoute><Storage /></PrivateRoute>} />
            <Route path="/livro-pdf" element={<PrivateRoute><BookPDF /></PrivateRoute>} />
            <Route path="/dia-do-casamento" element={<PrivateRoute><WeddingDay /></PrivateRoute>} />
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
