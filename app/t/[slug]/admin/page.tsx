import { redirect, notFound } from 'next/navigation'
import { getCurrentUserAndTenant } from '@/lib/supabase/auth-helpers'
import { createAdminClient } from '@/lib/supabase/admin'
import TenantAdmin from '@/components/TenantAdmin'

const DEMO_SLUG = 'demo'

export default async function TenantAdminPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const admin = createAdminClient()
  const isDemo = slug === DEMO_SLUG

  // Si es el tenant demo, acceso público sin auth (con banner "modo demo")
  if (isDemo) {
    const { data: tenant } = await admin
      .from('tenants')
      .select('*')
      .eq('slug', DEMO_SLUG)
      .single()
    if (!tenant) notFound()
    const tenantId = tenant.id
    const [{ data: barbers }, { data: services }, { data: appointments }] = await Promise.all([
      admin.from('barbers').select('*').eq('tenant_id', tenantId).order('created_at'),
      admin.from('services').select('*').eq('tenant_id', tenantId).order('price'),
      admin
        .from('appointments')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('date', { ascending: false })
        .order('time', { ascending: true })
        .limit(2000),
    ])
    if (!barbers || !services) notFound()
    return (
      <TenantAdmin
        tenant={tenant}
        profile={null}
        barbers={barbers}
        services={services}
        appointments={appointments || []}
        demoMode
      />
    )
  }

  // Para tenants reales: requerir auth
  const session = await getCurrentUserAndTenant()
  const target = `/t/${slug}/admin`

  if (!session?.user) {
    redirect(`/login?next=${encodeURIComponent(target)}`)
  }

  if (!session.tenant) {
    redirect(`/login?error=no_tenant`)
  }

  if (session.tenant.slug !== slug) {
    // El usuario está autenticado pero no es dueño de este tenant
    redirect(`/t/${session.tenant.slug}/admin`)
  }

  // Cargar todo lo necesario para el dashboard
  const tenantId = session.tenant.id

  const [{ data: barbers }, { data: services }, { data: appointments }] = await Promise.all([
    admin.from('barbers').select('*').eq('tenant_id', tenantId).order('created_at'),
    admin.from('services').select('*').eq('tenant_id', tenantId).order('price'),
    admin
      .from('appointments')
      .select('*')
      .eq('tenant_id', tenantId)
      .order('date', { ascending: false })
      .order('time', { ascending: true })
      .limit(2000),
  ])

  if (!barbers || !services) notFound()

  return (
    <TenantAdmin
      tenant={session.tenant}
      profile={session.profile}
      barbers={barbers}
      services={services}
      appointments={appointments || []}
    />
  )
}
