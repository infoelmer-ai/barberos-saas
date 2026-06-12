import Stripe from 'stripe'

let _stripe: Stripe | null = null

export function getStripe(): Stripe {
  if (_stripe) return _stripe
  const key = process.env.STRIPE_SECRET_KEY
  if (!key) throw new Error('STRIPE_SECRET_KEY no configurada')
  _stripe = new Stripe(key, { typescript: true })
  return _stripe
}

// Compat: permite seguir usando `stripe` como antes
export const stripe = new Proxy({} as Stripe, {
  get(_t, prop) {
    const s = getStripe()
    const val = (s as unknown as Record<string | symbol, unknown>)[prop]
    return typeof val === 'function' ? (val as (...args: unknown[]) => unknown).bind(s) : val
  },
})

export const PRICE_IDS: Record<'starter' | 'pro' | 'business', string> = {
  get starter() {
    return process.env.STRIPE_PRICE_STARTER || ''
  },
  get pro() {
    return process.env.STRIPE_PRICE_PRO || ''
  },
  get business() {
    return process.env.STRIPE_PRICE_BUSINESS || ''
  },
} as Record<'starter' | 'pro' | 'business', string>

export const PLAN_PRICES = {
  starter: 15,
  pro: 25,
  business: 45,
} as const
