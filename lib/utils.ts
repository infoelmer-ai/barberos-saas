import { TIME_SLOTS } from './constants'

export const pad2 = (n: number) => String(n).padStart(2, '0')

export const fmtDate = (d: string) =>
  d
    ? new Date(d + 'T12:00:00').toLocaleDateString('es-SV', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric',
      })
    : ''

export function slugify(s: string) {
  return s
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-')
}

interface AppointmentSlim {
  barber_id: string
  date: string
  time: string
  status: string
  duration_min: number
}

export function getAvailableSlots(
  apts: AppointmentSlim[],
  barberId: string,
  date: string,
  durationMin: number
): string[] {
  if (!barberId || !date) return TIME_SLOTS

  const booked = apts
    .filter(
      (a) => a.barber_id === barberId && a.date === date && a.status !== 'cancelled'
    )
    .flatMap((a) => {
      const [h, m] = a.time.split(':').map(Number)
      const start = h * 60 + m
      return Array.from({ length: a.duration_min / 30 }, (_, i) => {
        const mins = start + i * 30
        return `${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`
      })
    })

  return TIME_SLOTS.filter((slot) => {
    const [h, m] = slot.split(':').map(Number)
    const start = h * 60 + m
    for (let i = 0; i < durationMin; i += 30) {
      const mins = start + i
      if (mins + 30 > 18 * 60) return false
      if (booked.includes(`${pad2(Math.floor(mins / 60))}:${pad2(mins % 60)}`))
        return false
    }
    return true
  })
}
