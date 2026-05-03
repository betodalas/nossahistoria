// components/CapsuleDateSelector.tsx
// Componente para selecionar a data de referência de uma cápsula do tempo
// Usado no fluxo de criação/edição de cápsulas

import React, { useEffect, useState } from 'react'
import { getDatesForCapsules, CapsuleDate, formatCounterLabel, formatDateBR } from '../services/specialDates'

interface Props {
  /** Chave atualmente selecionada (capsule_key) */
  selectedKey: string
  /** Callback quando o usuário seleciona uma data diferente */
  onChange: (key: string, date: CapsuleDate | null) => void
}

export default function CapsuleDateSelector({ selectedKey, onChange }: Props) {
  const [dates, setDates] = useState<CapsuleDate[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getDatesForCapsules()
      .then(setDates)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <div style={styles.loading}>Carregando datas…</div>
  if (dates.length === 0) return null

  return (
    <div style={styles.wrapper}>
      <label style={styles.sectionLabel}>🗓️ Vincular esta cápsula a uma data especial</label>
      <p style={styles.hint}>
        A cápsula será associada a esta data e poderá ser aberta no aniversário correspondente.
      </p>
      <div style={styles.list}>
        {/* Opção: nenhuma */}
        <button
          type="button"
          onClick={() => onChange('', null)}
          style={{
            ...styles.option,
            ...(selectedKey === '' ? styles.optionActive : {}),
          }}
        >
          <span style={styles.optionEmoji}>🔒</span>
          <div style={styles.optionInfo}>
            <div style={styles.optionLabel}>Sem data vinculada</div>
            <div style={styles.optionSub}>Cápsula com data de abertura manual</div>
          </div>
        </button>

        {dates.map(d => {
          const counter = formatCounterLabel(d, true)
          const isSelected = selectedKey === d.capsule_key
          return (
            <button
              key={d.capsule_key}
              type="button"
              onClick={() => onChange(d.capsule_key, d)}
              style={{
                ...styles.option,
                ...(isSelected ? styles.optionActive : {}),
              }}
            >
              <span style={styles.optionEmoji}>{d.emoji}</span>
              <div style={styles.optionInfo}>
                <div style={styles.optionLabel}>{d.label}</div>
                <div style={styles.optionSub}>{formatDateBR(d.date)}</div>
              </div>
              <div style={styles.optionCounter}>
                <span style={styles.optionCounterNum}>{counter}</span>
                <span style={styles.optionCounterSub}>{d.isPast ? 'juntos' : 'faltam'}</span>
              </div>
            </button>
          )
        })}
      </div>
    </div>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  wrapper: {
    background: '#FFF5F7',
    borderRadius: 14,
    padding: '16px',
    border: '1px solid #F3C8D5',
    marginBottom: 16,
  },
  loading: {
    color: '#9B6B7A',
    fontSize: 14,
    padding: 8,
  },
  sectionLabel: {
    fontWeight: 700,
    fontSize: 15,
    color: '#3D1A2A',
    display: 'block',
    marginBottom: 4,
    fontFamily: "'Georgia', serif",
  },
  hint: {
    color: '#9B6B7A',
    fontSize: 13,
    margin: '0 0 12px',
    lineHeight: 1.4,
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 8,
    maxHeight: 280,
    overflowY: 'auto',
  },
  option: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
    background: '#fff',
    border: '1.5px solid #F3C8D5',
    borderRadius: 12,
    padding: '12px 14px',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    fontFamily: "'Georgia', serif",
    transition: 'border-color 0.15s',
  },
  optionActive: {
    border: '1.5px solid #7C4D6B',
    background: 'linear-gradient(135deg, #FFF0F3, #F9E6EE)',
  },
  optionEmoji: {
    fontSize: 22,
    flexShrink: 0,
  },
  optionInfo: {
    flex: 1,
    minWidth: 0,
  },
  optionLabel: {
    fontWeight: 600,
    fontSize: 14,
    color: '#3D1A2A',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  },
  optionSub: {
    fontSize: 12,
    color: '#9B6B7A',
    marginTop: 2,
  },
  optionCounter: {
    textAlign: 'center',
    flexShrink: 0,
  },
  optionCounterNum: {
    display: 'block',
    fontWeight: 700,
    color: '#7C4D6B',
    fontSize: 15,
  },
  optionCounterSub: {
    display: 'block',
    color: '#C9A0B0',
    fontSize: 11,
  },
}
