export function parseDate(dateStr: string): Date {
  const [y, m, d] = dateStr.split('T')[0].split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function daysUntil(date: Date): number {
  const today = new Date()
  const todayMs = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime()
  const targetMs = new Date(date.getFullYear(), date.getMonth(), date.getDate()).getTime()
  return Math.round((targetMs - todayMs) / 86400000)
}

export function formatDateBR(date: Date, opts?: Intl.DateTimeFormatOptions): string {
  return date.toLocaleDateString('pt-BR', opts ?? { day: 'numeric', month: 'long', year: 'numeric' })
}
