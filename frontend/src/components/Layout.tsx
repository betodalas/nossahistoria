import { useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { hasAlbum } = useAuth()
  const path = location.pathname

  const tabs = [
    {
      label: 'Início',
      route: '/dashboard',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke={active ? '#7C4D6B' : '#C9A0B0'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true">
          <path d="M3 9.5L12 3l9 6.5V20a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V9.5z" />
          <polyline points="9 21 9 12 15 12 15 21" />
        </svg>
      ),
    },
    {
      label: 'Timeline',
      route: '/linha-do-tempo',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke={active ? '#7C4D6B' : '#C9A0B0'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true">
          <circle cx="12" cy="12" r="10" />
          <polyline points="12 6 12 12 16 14" />
        </svg>
      ),
    },
    {
      label: 'Perguntas',
      route: '/perguntas',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke={active ? '#7C4D6B' : '#C9A0B0'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true">
          <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
        </svg>
      ),
    },
    {
      label: 'Livro',
      route: '/nosso-livro',
      icon: (active: boolean) => (
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
          stroke={active ? '#7C4D6B' : '#C9A0B0'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          aria-hidden="true">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
        </svg>
      ),
    },
    {
      label: 'Álbum',
      route: hasAlbum ? '/album-convidados' : '/album-convidados/info',
      icon: (active: boolean) => (
        <div style={{ position: 'relative', display: 'inline-flex' }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none"
            stroke={active ? '#7C4D6B' : '#C9A0B0'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            aria-hidden="true">
            <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
            <circle cx="8.5" cy="8.5" r="1.5" />
            <polyline points="21 15 16 10 5 21" />
          </svg>
          {!hasAlbum && (
            <span style={{
              position: 'absolute', top: -4, right: -4,
              fontSize: '9px', lineHeight: 1,
            }}>🔒</span>
          )}
        </div>
      ),
    },
  ]

  return (
    <div style={{ background: '#FFF0F3', minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '430px', minHeight: '100vh', background: '#FFF0F3', position: 'relative', paddingBottom: '72px' }}>
        <div style={{ overflowY: 'auto' }}>
          {children}
        </div>

        {/* FAB — Adicionar momento (apenas Dashboard) */}
        {path === '/dashboard' && (
          <button
            aria-label="Adicionar momento"
            onClick={() => navigate('/novo-momento')}
            style={{
              position: 'fixed',
              bottom: '76px',
              right: 'max(16px, calc(50vw - 215px + 16px))',
              height: '44px',
              borderRadius: '22px',
              background: 'linear-gradient(135deg, #C9A0B0, #7C4D6B)',
              border: 'none',
              boxShadow: '0 4px 16px rgba(124,77,107,0.40)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 18px 0 14px',
              zIndex: 50,
              transition: 'box-shadow 0.15s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.boxShadow = '0 6px 20px rgba(124,77,107,0.55)' }}
            onMouseLeave={e => { e.currentTarget.style.boxShadow = '0 4px 16px rgba(124,77,107,0.40)' }}
            onFocus={e => { e.currentTarget.style.outline = '3px solid #C9A0B0'; e.currentTarget.style.outlineOffset = '3px' }}
            onBlur={e => { e.currentTarget.style.outline = 'none' }}
          >
            <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24"
              fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
              aria-hidden="true">
              <line x1="12" y1="5" x2="12" y2="19" />
              <line x1="5" y1="12" x2="19" y2="12" />
            </svg>
            <span style={{ color: 'white', fontSize: '13px', fontWeight: 600, whiteSpace: 'nowrap' }}>
              Adicionar momento
            </span>
          </button>
        )}

        <nav style={{
          position: 'fixed', bottom: 0, left: '50%', transform: 'translateX(-50%)',
          width: '100%', maxWidth: '430px',
          background: 'white',
          borderTop: '1.5px solid #E8C4CE',
          height: '64px', display: 'flex', justifyContent: 'space-around', alignItems: 'center',
          padding: '0 8px', zIndex: 40
        }}>
          {tabs.map(t => {
            const active = path === t.route ||
              (t.label === 'Álbum' && (path === '/album-convidados' || path === '/album-convidados/info'))
            return (
              <button key={t.route} onClick={() => navigate(t.route)}
                aria-label={t.label}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: '2px', flex: 1, padding: '4px',
                  borderRadius: '12px',
                  background: active ? '#FADADD' : 'none',
                  border: 'none', cursor: 'pointer'
                }}>
                {t.icon(active)}
                <span style={{
                  fontWeight: active ? 700 : 400,
                  fontSize: '11px',
                  color: active ? '#7C4D6B' : '#C9A0B0'
                }}>{t.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
