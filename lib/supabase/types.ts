export type Plan = 'starter' | 'pro' | 'business'
export type TenantStatus = 'trial' | 'active' | 'past_due' | 'cancelled'
export type AppointmentStatus = 'confirmed' | 'cancelled' | 'completed' | 'no_show'

export interface Tenant {
  id: string
  slug: string
  name: string
  plan: Plan
  status: TenantStatus
  trial_ends_at: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  owner_email: string
  owner_name: string | null
  owner_phone: string | null
  logo_url: string | null
  brand_color: string | null
  payment_token: string | null
  payment_provider: string | null
  trial_reminder_3d_sent: boolean
  trial_reminder_1d_sent: boolean
  trial_ended_notified: boolean
  deposit_enabled: boolean
  deposit_percent: number
  whatsapp_enabled: boolean
  created_at: string
  updated_at: string
}

export interface Barber {
  id: string
  tenant_id: string
  name: string
  specialty: string | null
  initials: string | null
  color: string
  active: boolean
  created_at: string
}

export interface Service {
  id: string
  tenant_id: string
  name: string
  price: number
  duration_min: number
  emoji: string | null
  active: boolean
  created_at: string
}

export interface Appointment {
  id: string
  tenant_id: string
  barber_id: string
  service_id: string
  date: string
  time: string
  client_name: string
  client_phone: string
  client_email: string | null
  total: number
  status: AppointmentStatus
  pending_charge: boolean
  reminder_sent: boolean
  deposit_paid: boolean
  deposit_amount: number
  created_at: string
}

export interface Profile {
  id: string
  tenant_id: string | null
  role: 'owner' | 'admin' | 'barber'
  full_name: string | null
  phone: string | null
  created_at: string
}
