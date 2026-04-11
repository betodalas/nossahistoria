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
    <div style={{background:'#FFF0F3', minHeight:'100vh', display:'flex', justifyContent:'center'}}>
      <div style={{width:'100%', maxWidth:'430px', minHeight:'100vh', background:'#FFF0F3', position:'relative', paddingBottom:'72px'}}>
        <div style={{overflowY:'auto'}}>
          {children}
        </div>
        <nav style={{
          position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
          width:'100%', maxWidth:'430px',
          background:'white',
          borderTop:'1.5px solid #E8C4CE',
          height:'64px', display:'flex', justifyContent:'space-around', alignItems:'center',
          padding:'0 8px', zIndex:40
        }}>
          {tabs.map(t => {
            const active = path === t.route
            return (
              <button key={t.route} onClick={() => navigate(t.route)}
                style={{
                  display:'flex', flexDirection:'column', alignItems:'center',
                  justifyContent:'center', gap:'2px', flex:1, padding:'4px',
                  borderRadius:'12px',
                  background: active ? '#FADADD' : 'none',
                  border:'none', cursor:'pointer'
                }}>
                <span style={{fontSize:'20px', lineHeight:1}}>{t.icon}</span>
                <span style={{
                  fontWeight: active ? 700 : 400,
                  fontSize:'9px',
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
