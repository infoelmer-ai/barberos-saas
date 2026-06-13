import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantOwner } from '@/lib/supabase/api-auth'

const PLANS = ['starter', 'pro', 'business'] as const

// PATCH /api/plan — el dueño cambia su plan
export async function PATCH(req: Request) {
  const tenant = await requireTenantOwner()
  if (!tenant) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const plan = body.plan
  if (!PLANS.includes(plan)) {
    return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
  }
  if (plan === tenant.plan) {
    return NextResponse.json({ plan: tenant.plan })
  }

  // El cambio de plan aplica las funciones de inmediato.
  // Durante el trial no hay cobro; el plan elegido es el que se cobrará al
  // terminar la prueba. Para tenants ya activos, el ajuste de cobro se hará
  // con n1co cuando esté conectado (ver lib/billing/charge.ts).
  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tenants')
    .update({ plan })
    .eq('id', tenant.id)
    .select('plan')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ plan: data.plan })
}
