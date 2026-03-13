import { useNavigate, useLocation } from 'react-router-dom'

export default function Layout({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const path = location.pathname

  const tabs = [
    { icon: '🏠', label: 'Início',    route: '/' },
    { icon: '📖', label: 'Timeline',  route: '/linha-do-tempo' },
    { icon: '💬', label: 'Perguntas', route: '/perguntas' },
    { icon: '📚', label: 'Livro',     route: '/nosso-livro' },
  ]

  return (
    <div style={{background:'#070412', minHeight:'100vh', display:'flex', justifyContent:'center'}}>
      <div style={{width:'100%', maxWidth:'430px', minHeight:'100vh', background:'#0f0a1a', position:'relative', paddingBottom:'72px'}}>
        <div style={{overflowY:'auto'}}>
          {children}
        </div>
        <nav style={{
          position:'fixed', bottom:0, left:'50%', transform:'translateX(-50%)',
          width:'100%', maxWidth:'430px',
          background:'#6b5a8a', borderTop:'1px solid rgba(255,255,255,0.1)',
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
                  borderRadius:'12px', opacity: active ? 1 : 0.5,
                  background:'none', border:'none', cursor:'pointer'
                }}>
                <span style={{fontSize:'20px', lineHeight:1}}>{t.icon}</span>
                <span style={{color:'white', fontWeight:500, fontSize:'9px'}}>{t.label}</span>
              </button>
            )
          })}
        </nav>
      </div>
    </div>
  )
}
