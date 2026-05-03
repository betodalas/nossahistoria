// components/SpecialDatesWidget.tsx
// Widget para o Dashboard exibindo contadores de datas especiais

import React, { useEffect, useState } from 'react'
import {
  getSpecialDates,
  SpecialDate,
  formatCounterLabel,
  formatDateBR,
} from '../services/specialDates'

interface Props {
  /** Número máximo de datas a exibir (default: 4) */
  maxItems?: number
  /** Callback para navegar para a página de datas */
  onManage?: () => void
}

export default function SpecialDatesWidget({ maxItems = 4, onManage }: Props) {
  const [dates, setDates] = useState<SpecialDate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSpecialDates()
      .then(all => setDates(all.filter(d => d.show_in_dashboard)))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return null
  if (dates.length === 0) return (
    <div style={styles.emptyWidget}>
      <span style={{ fontSize: 20 }}>🗓️</span>
      <span style={{ color: '#9B6B7A', fontSize: 14 }}>
        Adicione datas especiais para ver os contadores aqui
      </span>
      {onManage && (
        <button style={styles.manageBtn} onClick={onManage}>
          Adicionar datas
        </button>
      )}
    </div>
  )

  const visible = dates.slice(0, maxItems)

  return (
    <div style={styles.widget}>
      <div style={styles.widgetHeader}>
        <span style={styles.widgetTitle}>🗓️ Datas Especiais</span>
        {onManage && (
          <button style={styles.manageBtn} onClick={onManage}>
            Gerenciar
          </button>
        )}
      </div>
      <div style={styles.countersGrid}>
        {visible.map(item => (
          <CounterCard key={item.id} item={item} />
        ))}
      </div>
      {dates.length > maxItems && onManage && (
        <button style={styles.viewAllBtn} onClick={onManage}>
          Ver todas as {dates.length} datas →
        </button>
      )}
    </div>
  )
}

// ─── CounterCard ──────────────────────────────────────────────────────────────

function CounterCard({ item }: { item: SpecialDate }) {
  const { counters } = item
  const label = formatCounterLabel(counters, true)
  const isToday = counters.totalDays === 0
  const isUpcoming = !counters.isPast
  const isAnniversarySoon = counters.isPast && counters.daysToNextAnniversary <= 7

  return (
    <div style={{
      ...styles.counterCard,
      ...(isToday ? styles.counterCardToday : {}),
      ...(isAnniversarySoon ? styles.counterCardAnniversary : {}),
    }}>
      <div style={styles.ccEmoji}>{item.emoji}</div>
      <div style={styles.ccLabel}>{item.label}</div>
      <div style={styles.ccNum}>{label}</div>
      <div style={styles.ccSub}>
        {isToday
          ? '🎉 Hoje!'
          : isUpcoming
            ? `📅 ${formatDateBR(item.date)}`
            : counters.years > 0
              ? `${counters.years} ano${counters.years > 1 ? 's' : ''} juntos`
              : 'juntos'
        }
      </div>
      {isAnniversarySoon && !isToday && (
        <div style={styles.ccAnniversaryTag}>
          🎉 Aniversário em {counters.daysToNextAnniversary}d
        </div>
      )}
    </div>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  widget: {
    background: '#FFF5F7',
    borderRadius: 20,
    padding: '20px',
    border: '1px solid #F3C8D5',
    marginBottom: 24,
  },
  widgetHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  widgetTitle: {
    fontWeight: 700,
    fontSize: 17,
    color: '#3D1A2A',
    fontFamily: "'Georgia', serif",
  },
  manageBtn: {
    background: 'none',
    border: '1.5px solid #E8B4C4',
    borderRadius: 10,
    padding: '6px 14px',
    fontSize: 13,
    color: '#7C4D6B',
    cursor: 'pointer',
    fontFamily: "'Georgia', serif",
  },
  countersGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))',
    gap: 12,
  },
  counterCard: {
    background: '#fff',
    borderRadius: 14,
    padding: '14px 12px',
    textAlign: 'center',
    border: '1px solid #F3C8D5',
    boxShadow: '0 2px 8px rgba(124,77,107,0.06)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: 4,
  },
  counterCardToday: {
    background: 'linear-gradient(135deg, #FFF0F3, #FFE0EB)',
    border: '1.5px solid #E8B4C4',
  },
  counterCardAnniversary: {
    background: 'linear-gradient(135deg, #FFF8E7, #FFF0F3)',
    border: '1.5px solid #F3C8D5',
  },
  ccEmoji: {
    fontSize: 26,
    marginBottom: 2,
  },
  ccLabel: {
    fontSize: 12,
    color: '#9B6B7A',
    fontWeight: 500,
    lineHeight: 1.3,
  },
  ccNum: {
    fontSize: 20,
    fontWeight: 700,
    color: '#7C4D6B',
    fontFamily: "'Georgia', serif",
    marginTop: 4,
  },
  ccSub: {
    fontSize: 11,
    color: '#C9A0B0',
  },
  ccAnniversaryTag: {
    marginTop: 6,
    fontSize: 11,
    background: '#FFE8EF',
    color: '#7C4D6B',
    borderRadius: 6,
    padding: '2px 8px',
    fontWeight: 600,
  },
  emptyWidget: {
    background: '#FFF5F7',
    borderRadius: 20,
    padding: '20px',
    border: '1px solid #F3C8D5',
    marginBottom: 24,
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap' as const,
  },
  viewAllBtn: {
    background: 'none',
    border: 'none',
    color: '#C9A0B0',
    fontSize: 13,
    cursor: 'pointer',
    marginTop: 12,
    width: '100%',
    textAlign: 'center' as const,
    fontFamily: "'Georgia', serif",
  },
}
