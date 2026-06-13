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

  return (
    <SuperAdminView
      tenants={(tenants as Tenant[]) || []}
      aptCounts={countByTenant}
      adminEmail={user.email}
    />
  )
}
