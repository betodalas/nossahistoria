// services/specialDates.ts
// Serviço de chamadas à API para datas especiais do casal

const API = import.meta.env.VITE_API_URL || 'http://localhost:3001/api'

function authHeaders() {
  const token = localStorage.getItem('token')
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
}

export interface SpecialDateCounters {
  totalDays: number
  isPast: boolean
  years: number
  months: number
  daysToNextAnniversary: number
}

export interface SpecialDate {
  id: string
  couple_id: string
  label: string
  date: string          // YYYY-MM-DD
  emoji: string
  type: string
  photo_url: string | null
  show_in_dashboard: boolean
  show_in_capsules: boolean
  created_at: string
  counters: SpecialDateCounters
}

export interface CapsuleDate extends SpecialDateCounters {
  id: string
  label: string
  date: string
  emoji: string
  type: string
  capsule_key: string
}

export type CreateSpecialDatePayload = {
  label: string
  date: string
  emoji?: string
  type?: string
  photo?: string          // base64
  remove_photo?: boolean
  show_in_dashboard?: boolean
  show_in_capsules?: boolean
}

export const DATE_TYPE_OPTIONS = [
  { value: 'first_date',     label: 'Primeiro encontro',       emoji: '✨' },
  { value: 'engagement',     label: 'Pedido de noivado',       emoji: '💍' },
  { value: 'anniversary',    label: 'Aniversário de namoro',   emoji: '❤️' },
  { value: 'wedding',        label: 'Casamento',               emoji: '💒' },
  { value: 'first_kiss',     label: 'Primeiro beijo',          emoji: '💋' },
  { value: 'first_trip',     label: 'Primeira viagem juntos',  emoji: '✈️' },
  { value: 'moved_together', label: 'Passaram a morar juntos', emoji: '🏠' },
  { value: 'custom',         label: 'Outra data especial',     emoji: '💕' },
]

export async function getSpecialDates(): Promise<SpecialDate[]> {
  const res = await fetch(`${API}/special-dates`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Erro ao buscar datas especiais')
  return res.json()
}

export async function createSpecialDate(payload: CreateSpecialDatePayload): Promise<SpecialDate> {
  const res = await fetch(`${API}/special-dates`, {
    method: 'POST',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Erro ao criar data especial')
  return res.json()
}

export async function updateSpecialDate(
  id: string,
  payload: Partial<CreateSpecialDatePayload>
): Promise<SpecialDate> {
  const res = await fetch(`${API}/special-dates/${id}`, {
    method: 'PUT',
    headers: authHeaders(),
    body: JSON.stringify(payload),
  })
  if (!res.ok) throw new Error('Erro ao atualizar data especial')
  return res.json()
}

export async function deleteSpecialDate(id: string): Promise<void> {
  const res = await fetch(`${API}/special-dates/${id}`, {
    method: 'DELETE',
    headers: authHeaders(),
  })
  if (!res.ok) throw new Error('Erro ao excluir data especial')
}

export async function getDatesForCapsules(): Promise<CapsuleDate[]> {
  const res = await fetch(`${API}/special-dates/for-capsules`, { headers: authHeaders() })
  if (!res.ok) throw new Error('Erro ao buscar datas para cápsulas')
  return res.json()
}

// ─── Helpers de formatação ────────────────────────────────────────────────────

export function formatCounterLabel(counters: SpecialDateCounters, compact = false): string {
  const { totalDays, years, months, isPast } = counters

  if (!isPast) {
    const absDays = Math.abs(totalDays)
    if (absDays === 0) return 'Hoje! 🎉'
    if (absDays === 1) return 'Amanhã'
    return `em ${absDays} dias`
  }

  if (totalDays === 0) return 'Hoje! 🎉'

  if (compact) {
    if (years > 0) return `${years} ano${years > 1 ? 's' : ''}`
    if (months > 0) return `${months} mes${months > 1 ? 'es' : ''}`
    return `${totalDays} dia${totalDays > 1 ? 's' : ''}`
  }

  const parts: string[] = []
  if (years > 0) parts.push(`${years} ano${years > 1 ? 's' : ''}`)
  const remMonths = months - years * 12
  if (remMonths > 0) parts.push(`${remMonths} mes${remMonths > 1 ? 'es' : ''}`)
  if (years === 0 && months === 0) parts.push(`${totalDays} dia${totalDays > 1 ? 's' : ''}`)

  return parts.join(' e ')
}

export function formatDateBR(dateStr: string): string {
  // Normaliza ISO datetime '2003-04-23T00:00:00.000Z' → '2003-04-23'
  const normalized = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr
  const [y, m, d] = normalized.split('-')
  return `${d}/${m}/${y}`
}
