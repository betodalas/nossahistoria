// pages/SpecialDatesPage.tsx
// Página para gerenciar as datas especiais do casal

import React, { useEffect, useState } from 'react'
import {
  getSpecialDates,
  createSpecialDate,
  updateSpecialDate,
  deleteSpecialDate,
  SpecialDate,
  DATE_TYPE_OPTIONS,
  formatCounterLabel,
  formatDateBR,
} from '../services/specialDates'

// ─── Formulário de nova data ──────────────────────────────────────────────────

interface DateFormProps {
  initial?: Partial<SpecialDate>
  onSave: (data: any) => Promise<void>
  onCancel: () => void
  loading: boolean
}

function DateForm({ initial, onSave, onCancel, loading }: DateFormProps) {
  const [type, setType] = useState(initial?.type || 'custom')
  const [label, setLabel] = useState(initial?.label || '')
  const [date, setDate] = useState(initial?.date || '')
  const [emoji, setEmoji] = useState(initial?.emoji || '')
  const [showInDashboard, setShowInDashboard] = useState(initial?.show_in_dashboard ?? true)
  const [showInCapsules, setShowInCapsules] = useState(initial?.show_in_capsules ?? true)
  const [photoPreview, setPhotoPreview] = useState<string | null>(initial?.photo_url || null)
  const [photoBase64, setPhotoBase64] = useState<string | null>(null)
  const [removePhoto, setRemovePhoto] = useState(false)

  const selectedTypeOption = DATE_TYPE_OPTIONS.find(o => o.value === type)

  function handleTypeChange(val: string) {
    setType(val)
    const opt = DATE_TYPE_OPTIONS.find(o => o.value === val)
    if (opt && !label) setLabel(opt.label)
    if (opt && !emoji) setEmoji(opt.emoji)
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const b64 = reader.result as string
      setPhotoBase64(b64)
      setPhotoPreview(b64)
      setRemovePhoto(false)
    }
    reader.readAsDataURL(file)
  }

  function handleRemovePhoto() {
    setPhotoBase64(null)
    setPhotoPreview(null)
    setRemovePhoto(true)
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!label.trim() || !date) return
    await onSave({
      label: label.trim(),
      date,
      emoji: emoji || selectedTypeOption?.emoji || '💕',
      type,
      show_in_dashboard: showInDashboard,
      show_in_capsules: showInCapsules,
      ...(photoBase64 ? { photo: photoBase64 } : {}),
      ...(removePhoto ? { remove_photo: true } : {}),
    })
  }

  return (
    <form onSubmit={handleSubmit} style={styles.form}>
      {/* Tipo */}
      <label style={styles.label}>Tipo de data</label>
      <div style={styles.typeGrid}>
        {DATE_TYPE_OPTIONS.map(opt => (
          <button
            key={opt.value}
            type="button"
            onClick={() => handleTypeChange(opt.value)}
            style={{
              ...styles.typeChip,
              ...(type === opt.value ? styles.typeChipActive : {}),
            }}
          >
            {opt.emoji} {opt.label}
          </button>
        ))}
      </div>

      {/* Label */}
      <label style={styles.label}>Nome da data</label>
      <input
        style={styles.input}
        value={label}
        onChange={e => setLabel(e.target.value)}
        placeholder="Ex: Nosso primeiro encontro"
        required
      />

      {/* Data */}
      <label style={styles.label}>Data</label>
      <input
        style={styles.input}
        type="date"
        value={date}
        onChange={e => setDate(e.target.value)}
        required
      />

      {/* Emoji */}
      <label style={styles.label}>Emoji (opcional)</label>
      <input
        style={{ ...styles.input, maxWidth: 100 }}
        value={emoji}
        onChange={e => setEmoji(e.target.value)}
        placeholder={selectedTypeOption?.emoji || '💕'}
        maxLength={4}
      />

      {/* Foto */}
      <label style={styles.label}>Foto da data (opcional)</label>
      {photoPreview ? (
        <div style={styles.photoPreviewWrapper}>
          <img src={photoPreview} alt="Foto da data" style={styles.photoPreview} />
          <button type="button" onClick={handleRemovePhoto} style={styles.removePhotoBtn}>
            ✕ Remover foto
          </button>
        </div>
      ) : (
        <label style={styles.photoUploadBtn}>
          📷 Escolher foto
          <input
            type="file"
            accept="image/*"
            onChange={handlePhotoChange}
            style={{ display: 'none' }}
          />
        </label>
      )}

      {/* Toggles */}
      <div style={styles.toggleRow}>
        <label style={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={showInDashboard}
            onChange={e => setShowInDashboard(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Mostrar no Dashboard
        </label>
        <label style={styles.toggleLabel}>
          <input
            type="checkbox"
            checked={showInCapsules}
            onChange={e => setShowInCapsules(e.target.checked)}
            style={{ marginRight: 8 }}
          />
          Usar nas Cápsulas do Tempo
        </label>
      </div>

      {/* Botões */}
      <div style={styles.btnRow}>
        <button type="button" onClick={onCancel} style={styles.btnSecondary} disabled={loading}>
          Cancelar
        </button>
        <button type="submit" style={styles.btnPrimary} disabled={loading || !label || !date}>
          {loading ? 'Salvando…' : initial ? 'Salvar alterações' : '✨ Adicionar data'}
        </button>
      </div>
    </form>
  )
}

// ─── Card de data ─────────────────────────────────────────────────────────────

interface DateCardProps {
  item: SpecialDate
  onEdit: () => void
  onDelete: () => void
}

function DateCard({ item, onEdit, onDelete }: DateCardProps) {
  const { counters } = item
  const counterLabel = formatCounterLabel(counters)

  return (
    <div style={styles.card}>
      {item.photo_url && (
        <img
          src={item.photo_url}
          alt={item.label}
          style={styles.cardPhoto}
        />
      )}
      <div style={styles.cardBody}>
        <div style={styles.cardLeft}>
          <span style={styles.cardEmoji}>{item.emoji}</span>
          <div>
            <div style={styles.cardLabel}>{item.label}</div>
            <div style={styles.cardDate}>{formatDateBR(item.date)}</div>
          </div>
        </div>
        <div style={styles.cardRight}>
          <div style={styles.counterBadge}>
            {counters.isPast ? (
              <>
                <span style={styles.counterNum}>{counterLabel}</span>
                <span style={styles.counterSub}>juntos</span>
              </>
            ) : (
              <>
                <span style={styles.counterNum}>{counterLabel}</span>
                <span style={styles.counterSub}>faltam</span>
              </>
            )}
          </div>
          {counters.isPast && counters.daysToNextAnniversary <= 30 && (
            <div style={styles.anniversaryBadge}>
              🎉 {counters.daysToNextAnniversary === 0
                ? 'Aniversário hoje!'
                : `Aniversário em ${counters.daysToNextAnniversary} dias`}
            </div>
          )}
          <div style={styles.cardActions}>
            <button onClick={onEdit} style={styles.btnEdit}>✏️</button>
            <button onClick={onDelete} style={styles.btnDelete}>🗑️</button>
          </div>
          <div style={styles.cardBadges}>
            {item.show_in_dashboard && <span style={styles.badge}>Dashboard</span>}
            {item.show_in_capsules && <span style={styles.badge}>Cápsulas</span>}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── Página principal ─────────────────────────────────────────────────────────

export default function SpecialDatesPage() {
  const [dates, setDates] = useState<SpecialDate[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [editingDate, setEditingDate] = useState<SpecialDate | null>(null)

  async function load() {
    try {
      setLoading(true)
      const data = await getSpecialDates()
      setDates(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function handleCreate(payload: any) {
    setSaving(true)
    try {
      const created = await createSpecialDate(payload)
      setDates(prev => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)))
      setShowForm(false)
      setError('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleUpdate(payload: any) {
    if (!editingDate) return
    setSaving(true)
    try {
      const updated = await updateSpecialDate(editingDate.id, payload)
      setDates(prev => prev.map(d => d.id === updated.id ? updated : d))
      setEditingDate(null)
      setError('')
    } catch (e: any) {
      setError(e.message)
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Remover esta data especial?')) return
    try {
      await deleteSpecialDate(id)
      setDates(prev => prev.filter(d => d.id !== id))
    } catch (e: any) {
      setError(e.message)
    }
  }

  return (
    <div style={styles.page}>
      {/* Header */}
      <div style={styles.header}>
        <div>
          <h1 style={styles.title}>🗓️ Datas Especiais</h1>
          <p style={styles.subtitle}>
            Registre os momentos que marcaram a história de vocês
          </p>
        </div>
        {!showForm && !editingDate && (
          <button style={styles.btnPrimary} onClick={() => setShowForm(true)}>
            + Adicionar data
          </button>
        )}
      </div>

      {error && <div style={styles.errorBanner}>{error}</div>}

      {/* Formulário de criação */}
      {showForm && (
        <div style={styles.formWrapper}>
          <h2 style={styles.formTitle}>Nova data especial</h2>
          <DateForm
            onSave={handleCreate}
            onCancel={() => setShowForm(false)}
            loading={saving}
          />
        </div>
      )}

      {/* Formulário de edição */}
      {editingDate && (
        <div style={styles.formWrapper}>
          <h2 style={styles.formTitle}>Editar data</h2>
          <DateForm
            initial={editingDate}
            onSave={handleUpdate}
            onCancel={() => setEditingDate(null)}
            loading={saving}
          />
        </div>
      )}

      {/* Lista */}
      {loading ? (
        <div style={styles.emptyState}>Carregando datas…</div>
      ) : dates.length === 0 ? (
        <div style={styles.emptyState}>
          <div style={{ fontSize: 48, marginBottom: 12 }}>💕</div>
          <div style={{ fontWeight: 600, marginBottom: 8, color: '#7C4D6B' }}>
            Nenhuma data especial ainda
          </div>
          <div style={{ color: '#9B6B7A', fontSize: 14 }}>
            Adicione o dia que se conheceram, o pedido de noivado, aniversários e mais!
          </div>
        </div>
      ) : (
        <div style={styles.list}>
          {dates.map(item => (
            <DateCard
              key={item.id}
              item={item}
              onEdit={() => { setEditingDate(item); setShowForm(false) }}
              onDelete={() => handleDelete(item.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Estilos ──────────────────────────────────────────────────────────────────

const styles: Record<string, React.CSSProperties> = {
  page: {
    maxWidth: 700,
    margin: '0 auto',
    padding: '24px 16px 80px',
    fontFamily: "'Georgia', serif",
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
    gap: 12,
    flexWrap: 'wrap',
  },
  title: {
    fontSize: 24,
    fontWeight: 700,
    color: '#3D1A2A',
    margin: 0,
  },
  subtitle: {
    color: '#9B6B7A',
    margin: '4px 0 0',
    fontSize: 14,
  },
  errorBanner: {
    background: '#FEE2E2',
    color: '#991B1B',
    borderRadius: 10,
    padding: '12px 16px',
    marginBottom: 16,
    fontSize: 14,
  },
  formWrapper: {
    background: '#FFF5F7',
    borderRadius: 16,
    padding: 24,
    marginBottom: 24,
    border: '1px solid #F3C8D5',
  },
  formTitle: {
    fontSize: 18,
    fontWeight: 600,
    color: '#7C4D6B',
    margin: '0 0 16px',
  },
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: 12,
  },
  label: {
    fontSize: 13,
    fontWeight: 600,
    color: '#7C4D6B',
  },
  input: {
    padding: '10px 14px',
    borderRadius: 10,
    border: '1.5px solid #E8B4C4',
    fontSize: 15,
    color: '#3D1A2A',
    background: '#fff',
    outline: 'none',
    width: '100%',
    boxSizing: 'border-box' as const,
  },
  typeGrid: {
    display: 'flex',
    flexWrap: 'wrap',
    gap: 8,
  },
  typeChip: {
    padding: '7px 14px',
    borderRadius: 20,
    border: '1.5px solid #E8B4C4',
    background: '#fff',
    color: '#7C4D6B',
    fontSize: 13,
    cursor: 'pointer',
    fontFamily: "'Georgia', serif",
  },
  typeChipActive: {
    background: 'linear-gradient(135deg, #C9A0B0, #7C4D6B)',
    color: '#fff',
    border: '1.5px solid transparent',
  },
  toggleRow: {
    display: 'flex',
    gap: 20,
    flexWrap: 'wrap',
  },
  toggleLabel: {
    fontSize: 14,
    color: '#7C4D6B',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
  },
  btnRow: {
    display: 'flex',
    gap: 12,
    justifyContent: 'flex-end',
    marginTop: 8,
  },
  btnPrimary: {
    background: 'linear-gradient(135deg, #C9A0B0, #7C4D6B)',
    color: '#fff',
    border: 'none',
    borderRadius: 12,
    padding: '12px 24px',
    fontSize: 15,
    fontWeight: 600,
    cursor: 'pointer',
    fontFamily: "'Georgia', serif",
  },
  btnSecondary: {
    background: 'transparent',
    color: '#9B6B7A',
    border: '1.5px solid #E8B4C4',
    borderRadius: 12,
    padding: '12px 24px',
    fontSize: 15,
    cursor: 'pointer',
    fontFamily: "'Georgia', serif",
  },
  list: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  card: {
    background: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    boxShadow: '0 2px 12px rgba(124,77,107,0.08)',
    border: '1px solid #F3C8D5',
  },
  cardPhoto: {
    width: '100%',
    height: 160,
    objectFit: 'cover' as const,
    display: 'block',
  },
  cardBody: {
    padding: '16px 20px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    gap: 16,
  },
  photoPreviewWrapper: {
    position: 'relative' as const,
    display: 'inline-block',
  },
  photoPreview: {
    width: '100%',
    maxHeight: 180,
    objectFit: 'cover' as const,
    borderRadius: 10,
    display: 'block',
  },
  removePhotoBtn: {
    marginTop: 8,
    background: 'none',
    border: '1px solid #E8B4C4',
    borderRadius: 8,
    padding: '5px 12px',
    fontSize: 13,
    color: '#9B6B7A',
    cursor: 'pointer',
    fontFamily: "'Georgia', serif",
  },
  photoUploadBtn: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: 8,
    padding: '10px 18px',
    borderRadius: 10,
    border: '1.5px dashed #E8B4C4',
    background: '#FFF8FA',
    color: '#7C4D6B',
    fontSize: 14,
    cursor: 'pointer',
    fontFamily: "'Georgia', serif",
  },
  cardLeft: {
    display: 'flex',
    alignItems: 'center',
    gap: 14,
    flex: 1,
  },
  cardEmoji: {
    fontSize: 32,
    flexShrink: 0,
  },
  cardLabel: {
    fontWeight: 600,
    color: '#3D1A2A',
    fontSize: 16,
  },
  cardDate: {
    color: '#9B6B7A',
    fontSize: 13,
    marginTop: 2,
  },
  cardRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: 6,
    flexShrink: 0,
  },
  counterBadge: {
    textAlign: 'center',
    background: '#FFF0F3',
    borderRadius: 10,
    padding: '6px 14px',
  },
  counterNum: {
    display: 'block',
    fontWeight: 700,
    color: '#7C4D6B',
    fontSize: 15,
  },
  counterSub: {
    display: 'block',
    color: '#C9A0B0',
    fontSize: 11,
    marginTop: 1,
  },
  anniversaryBadge: {
    fontSize: 12,
    color: '#7C4D6B',
    background: '#FFE8EF',
    borderRadius: 8,
    padding: '3px 10px',
    fontWeight: 500,
  },
  cardActions: {
    display: 'flex',
    gap: 8,
  },
  btnEdit: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
    padding: 4,
    borderRadius: 6,
  },
  btnDelete: {
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 16,
    padding: 4,
    borderRadius: 6,
  },
  cardBadges: {
    display: 'flex',
    gap: 6,
  },
  badge: {
    fontSize: 10,
    background: '#F3C8D5',
    color: '#7C4D6B',
    borderRadius: 6,
    padding: '2px 7px',
    fontWeight: 600,
  },
  emptyState: {
    textAlign: 'center',
    padding: '60px 24px',
    color: '#9B6B7A',
  },
}
