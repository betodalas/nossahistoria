// hooks/useSpecialDates.ts
// Hook React para gerenciar datas especiais do casal

import { useCallback, useEffect, useState } from 'react'
import {
  getSpecialDates,
  createSpecialDate,
  updateSpecialDate,
  deleteSpecialDate,
  SpecialDate,
  CreateSpecialDatePayload,
} from '../services/specialDates'

interface UseSpecialDatesReturn {
  dates: SpecialDate[]
  loading: boolean
  error: string | null
  refresh: () => Promise<void>
  create: (payload: CreateSpecialDatePayload) => Promise<SpecialDate>
  update: (id: string, payload: Partial<CreateSpecialDatePayload>) => Promise<SpecialDate>
  remove: (id: string) => Promise<void>
  /** Datas filtradas para exibição no Dashboard */
  dashboardDates: SpecialDate[]
  /** Datas que têm aniversário nos próximos N dias */
  upcomingAnniversaries: (withinDays?: number) => SpecialDate[]
}

export function useSpecialDates(): UseSpecialDatesReturn {
  const [dates, setDates] = useState<SpecialDate[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    try {
      setLoading(true)
      setError(null)
      const data = await getSpecialDates()
      setDates(data)
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { refresh() }, [refresh])

  const create = useCallback(async (payload: CreateSpecialDatePayload) => {
    const created = await createSpecialDate(payload)
    setDates(prev => [...prev, created].sort((a, b) => a.date.localeCompare(b.date)))
    return created
  }, [])

  const update = useCallback(async (id: string, payload: Partial<CreateSpecialDatePayload>) => {
    const updated = await updateSpecialDate(id, payload)
    setDates(prev => prev.map(d => d.id === id ? updated : d))
    return updated
  }, [])

  const remove = useCallback(async (id: string) => {
    await deleteSpecialDate(id)
    setDates(prev => prev.filter(d => d.id !== id))
  }, [])

  const dashboardDates = dates.filter(d => d.show_in_dashboard)

  const upcomingAnniversaries = useCallback((withinDays = 30) => {
    return dates.filter(d =>
      d.counters.isPast && d.counters.daysToNextAnniversary <= withinDays
    )
  }, [dates])

  return { dates, loading, error, refresh, create, update, remove, dashboardDates, upcomingAnniversaries }
}
