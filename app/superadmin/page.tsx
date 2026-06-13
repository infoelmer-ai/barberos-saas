import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import SuperAdminView from '@/components/SuperAdminView'
import type { Tenant } from '@/lib/supabase/types'

export const dynamic = 'force-dynamic'

export default async function SuperAdminPage() {
  // Auth: solo correos en la allowlist SUPERADMIN_EMAILS
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const allow = (process.env.SUPERADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  if (!user) {
    redirect('/login?next=/superadmin')
  }
  if (!user.email || !allow.includes(user.email.toLowerCase())) {
    redirect('/?error=no_superadmin')
  }

  const admin = createAdminClient()
  const { data: tenants } = await admin
    .from('tenants')
    .select('*')
    .order('created_at', { ascending: false })

  // Conteo de citas por tenant
  const { data: aptCounts } = await admin.from('appointments').select('tenant_id')
  const countByTenant: Record<string, number> = {}
  for (const a of aptCounts || []) {
    countByTenant[a.tenant_id] = (countByTenant[a.tenant_id] || 0) + 1
  }

  // Métricas de capacidad (datos reales)
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

  const [aptsMonth, aptsMonthEmail, barberCount, serviceCount, aptTotal] = await Promise.all([
    admin.from('appointments').select('*', { count: 'exact', head: true }).gte('created_at', monthStart),
    admin
      .from('appointments')
      .select('*', { count: 'exact', head: true })
      .gte('created_at', monthStart)
      .not('client_email', 'is', null),
    admin.from('barbers').select('*', { count: 'exact', head: true }),
    admin.from('services').select('*', { count: 'exact', head: true }),
    admin.from('appointments').select('*', { count: 'exact', head: true }),
  ])

  const bookingsThisMonth = aptsMonth.count || 0
  const bookingsWithEmail = aptsMonthEmail.count || 0
  // Estimación de correos/mes: 1 aviso al dueño por cita + 1 confirmación si el cliente dio email
  const estEmailsThisMonth = bookingsThisMonth + bookingsWithEmail
  const totalRows =
    (tenants?.length || 0) + (barberCount.count || 0) + (serviceCount.count || 0) + (aptTotal.count || 0)

  const metrics = {
    bookingsThisMonth,
    estEmailsThisMonth,
    totalRows,
    totalAppointments: aptTotal.count || 0,
    projectRef: (process.env.NEXT_PUBLIC_SUPABASE_URL || '').replace('https://', '').split('.')[0],
  }

  return (
    <SuperAdminView
      tenants={(tenants as Tenant[]) || []}
      aptCounts={countByTenant}
      adminEmail={user.email}
      metrics={metrics}
    />
  )
}
