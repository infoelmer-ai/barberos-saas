import { notFound } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/admin'
import TenantBooking from '@/components/TenantBooking'

export default async function TenantPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const supabase = createAdminClient()

  const { data: tenant } = await supabase
    .from('tenants')
    .select('*')
    .eq('slug', slug)
    .single()

  if (!tenant) notFound()

  const [{ data: barbers }, { data: services }, { data: appointments }] = await Promise.all([
    supabase.from('barbers').select('*').eq('tenant_id', tenant.id).eq('active', true),
    supabase.from('services').select('*').eq('tenant_id', tenant.id).eq('active', true),
    supabase
      .from('appointments')
      .select('id, barber_id, service_id, date, time, status, client_phone, client_name, total, pending_charge, services(duration_min, name, emoji)')
      .eq('tenant_id', tenant.id)
      .gte('date', new Date().toISOString().split('T')[0]),
  ])

  return (
    <TenantBooking
      tenant={tenant}
      barbers={barbers || []}
      services={services || []}
      appointments={appointments || []}
    />
  )
}
