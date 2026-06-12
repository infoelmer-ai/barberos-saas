// ─── Paleta ────────────────────────────────────────────────
export const C = {
  bg: '#0A0906',
  bg2: '#13110E',
  bg3: '#1C1915',
  bg4: '#252118',
  gold: '#C9A84C',
  goldLt: '#E8C96D',
  goldDm: '#8B7030',
  cream: '#F0EAD8',
  muted: '#7A7060',
  muted2: '#4A4438',
  border: '#2A2520',
  border2: '#35302A',
  green: '#4DBF8A',
  red: '#E05252',
  blue: '#5A9BCC',
  purple: '#9B59B6',
}

// ─── Planes ────────────────────────────────────────────────
export const PLANS = [
  {
    id: 'starter' as const,
    name: 'Starter',
    price: 15,
    barbers: 3,
    locations: 1,
    analytics: false,
    whiteLabel: false,
    color: '#4A8FBF',
    badge: 'Popular entre barberías nuevas',
  },
  {
    id: 'pro' as const,
    name: 'Pro',
    price: 25,
    barbers: 8,
    locations: 1,
    analytics: true,
    whiteLabel: false,
    color: '#C9A84C',
    badge: 'El más elegido',
  },
  {
    id: 'business' as const,
    name: 'Business',
    price: 45,
    barbers: 99,
    locations: 3,
    analytics: true,
    whiteLabel: true,
    color: '#8B3A8B',
    badge: 'Para cadenas',
  },
]

// Horarios disponibles (9am – 6pm, cada 30 min)
export const TIME_SLOTS = (() => {
  const s: string[] = []
  for (let h = 9; h < 18; h++) {
    s.push(`${String(h).padStart(2, '0')}:00`)
    s.push(`${String(h).padStart(2, '0')}:30`)
  }
  return s
})()
