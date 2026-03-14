import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function Splash() {
  const { user, couple, loading } = useAuth()
  const navigate = useNavigate()
  const [visible, setVisible] = useState(true)

  useEffect(() => {
    if (loading) return
    const timer = setTimeout(() => {
      setVisible(false)
      setTimeout(() => {
        sessionStorage.setItem('splash_shown', '1')
        if (user) navigate('/dashboard')
        else navigate('/login')
      }, 600)
    }, 2800)
    return () => clearTimeout(timer)
  }, [loading, user])

  const coupleName = couple?.couple_name || null
  const weddingDate = couple?.wedding_date
    ? new Date(couple.wedding_date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })
    : null

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'linear-gradient(160deg, #FFF0F3 0%, #FADADD 40%, #F2C8D4 100%)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      transition: 'opacity 0.6s ease',
      opacity: visible ? 1 : 0,
      pointerEvents: visible ? 'all' : 'none',
    }}>
      {/* Pétalas */}
      <Petals />

      {/* Alianças */}
      <div style={{ position: 'relative', width: 180, height: 120, marginBottom: 8, animation: 'fadeUp 0.9s ease both' }}>
        <Heart />
        <Ring side="left" />
        <Ring side="right" />
      </div>

      {/* Título */}
      <h1 style={{
        fontFamily: 'Georgia, serif', fontStyle: 'italic', fontWeight: 300,
        fontSize: 40, color: '#3D1A2A', margin: '0 0 6px 0', letterSpacing: '0.02em',
        animation: 'fadeUp 0.9s 0.3s ease both', opacity: 0,
        animationFillMode: 'forwards',
      }}>
        Nossa História
      </h1>

      <p style={{
        fontSize: 11, color: '#9B6B7A', letterSpacing: '0.22em',
        textTransform: 'uppercase', margin: '0 0 40px 0',
        animation: 'fadeUp 0.9s 0.5s ease both', opacity: 0,
        animationFillMode: 'forwards',
      }}>
        cada momento importa
      </p>

      {/* Loading dots */}
      <div style={{ display: 'flex', gap: 8, animation: 'fadeUp 0.9s 0.8s ease both', opacity: 0, animationFillMode: 'forwards' }}>
        {[0, 1, 2].map(i => (
          <div key={i} style={{
            width: 6, height: 6, borderRadius: '50%', background: '#C9A0B0',
            animation: `blink 1.4s ${i * 0.2}s ease-in-out infinite`,
          }} />
        ))}
      </div>

      {/* Nome do casal dinâmico */}
      {coupleName && (
        <p style={{
          position: 'absolute', bottom: 48,
          fontSize: 12, color: '#C9A0B0', letterSpacing: '0.12em',
          animation: 'fadeUp 0.9s 1s ease both', opacity: 0,
          animationFillMode: 'forwards',
        }}>
          💍 {coupleName}{weddingDate ? ` · ${weddingDate}` : ''}
        </p>
      )}

      <style>{`
        @keyframes fadeUp {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes blink {
          0%, 80%, 100% { opacity: 0.3; transform: scale(1); }
          40%            { opacity: 1;   transform: scale(1.3); }
        }
        @keyframes floatPetal {
          0%   { transform: translateY(-20px) rotate(0deg); opacity: 0; }
          10%  { opacity: 0.18; }
          90%  { opacity: 0.1; }
          100% { transform: translateY(110vh) rotate(360deg); opacity: 0; }
        }
      `}</style>
    </div>
  )
}

function Ring({ side }: { side: 'left' | 'right' }) {
  const isRight = side === 'right'
  return (
    <div style={{
      position: 'absolute', top: '50%', transform: 'translateY(-50%)',
      [isRight ? 'right' : 'left']: 0,
      width: 108, height: 108, borderRadius: '50%',
      border: `15px solid ${isRight ? '#7C4D6B' : '#C9A0B0'}`,
      boxShadow: isRight
        ? 'inset 0 -4px 8px rgba(61,26,42,0.2), 0 4px 16px rgba(124,77,107,0.4)'
        : 'inset 0 -4px 8px rgba(155,107,122,0.25), 0 4px 12px rgba(201,160,176,0.35)',
    }}>
      {isRight && (
        <div style={{
          position: 'absolute', top: -8, left: '50%', transform: 'translateX(-50%)',
          width: 20, height: 13, background: 'radial-gradient(ellipse, #fff 30%, #E8C4CE 100%)',
          borderRadius: '50%', border: '2px solid #C9A0B0',
        }} />
      )}
    </div>
  )
}

function Heart() {
  return (
    <div style={{
      position: 'absolute', top: -10, left: '50%', transform: 'translateX(-50%)',
      width: 20, height: 18, zIndex: 10,
      animation: 'pulse 2s ease-in-out infinite',
    }}>
      <svg viewBox="0 0 20 18" width="20" height="18">
        <path d="M10,15 C10,15 1,9 1,4.5 C1,2 3,0 5.5,0 C7.5,0 9,1.5 10,3 C11,1.5 12.5,0 14.5,0 C17,0 19,2 19,4.5 C19,9 10,15 10,15 Z"
          fill="#7C4D6B" />
      </svg>
      <style>{`@keyframes pulse { 0%,100%{transform:translateX(-50%) scale(1)} 50%{transform:translateX(-50%) scale(1.2)} }`}</style>
    </div>
  )
}

function Petals() {
  const colors = ['#E8C4CE', '#C9A0B0', '#FADADD', '#D4A0B5', '#F2C8D4']
  const petals = Array.from({ length: 14 }, (_, i) => ({
    id: i,
    size: Math.random() * 16 + 8,
    color: colors[Math.floor(Math.random() * colors.length)],
    left: Math.random() * 100,
    duration: Math.random() * 8 + 6,
    delay: Math.random() * 6,
    rotate: Math.random() * 360,
  }))

  return (
    <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}>
      {petals.map(p => (
        <div key={p.id} style={{
          position: 'absolute',
          width: p.size, height: p.size,
          background: p.color,
          borderRadius: '50% 0 50% 0',
          left: `${p.left}%`,
          top: '-20px',
          opacity: 0.18,
          animation: `floatPetal ${p.duration}s ${p.delay}s linear infinite`,
          transform: `rotate(${p.rotate}deg)`,
        }} />
      ))}
    </div>
  )
}
