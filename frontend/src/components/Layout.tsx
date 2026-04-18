import { useNavigate, useLocation } from 'react-router-dom'

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const path = location.pathname

  const tabs = [
    { icon: '🏠', label: 'Início',    route: '/dashboard' },
    { icon: '📖', label: 'Timeline',  route: '/linha-do-tempo' },
    { icon: '💬', label: 'Perguntas', route: '/perguntas' },
    { icon: '📚', label: 'Livro',     route: '/nosso-livro' },
  ]

  return (
    <div style={{ background: '#FFF0F3', minHeight: '100vh', display: 'flex', justifyContent: 'center' }}>
      <div style={{ width: '100%', maxWidth: '430px', minHeight: '100vh', background: '#FFF0F3', position: 'relative', paddingBottom: '72px' }}>
        <div style={{ overflowY: 'auto' }}>
          {children}
        </div>

        {/* FAB — Adicionar momento (apenas Dashboard e Timeline) */}
        {path === '/dashboard' && (
          <button
            aria-label="Adicionar momento"
            onClick={() => navigate('/novo-momento')}
            style={{
              position: 'fixed',
              bottom: '76px',
              left: '50%',
              transform: 'translateX(calc(-50% + 163px))',
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
            onMouseEnter={e => {
              e.currentTarget.style.boxShadow = '0 6px 20px rgba(124,77,107,0.55)'
            }}
            onMouseLeave={e => {
              e.currentTarget.style.boxShadow = '0 4px 16px rgba(124,77,107,0.40)'
            }}
            onFocus={e => {
              e.currentTarget.style.outline = '3px solid #C9A0B0'
              e.currentTarget.style.outlineOffset = '3px'
            }}
            onBlur={e => {
              e.currentTarget.style.outline = 'none'
            }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="18"
              height="18"
              viewBox="0 0 24 24"
              fill="none"
              stroke="white"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              aria-hidden="true"
            >
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
            const active = path === t.route
            return (
              <button key={t.route} onClick={() => navigate(t.route)}
                style={{
                  display: 'flex', flexDirection: 'column', alignItems: 'center',
                  justifyContent: 'center', gap: '2px', flex: 1, padding: '4px',
                  borderRadius: '12px',
                  background: active ? '#FADADD' : 'none',
                  border: 'none', cursor: 'pointer'
                }}>
                <span style={{ fontSize: '20px', lineHeight: 1 }}>{t.icon}</span>
                <span style={{
                  fontWeight: active ? 700 : 400,
                  fontSize: '9px',
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
