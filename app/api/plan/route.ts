import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantOwner } from '@/lib/supabase/api-auth'
import { PLANS } from '@/lib/constants'
import { sendPlanUpgraded } from '@/lib/email/resend'

const VALID = ['starter', 'pro', 'business'] as const
const ORDER: Record<string, number> = { starter: 0, pro: 1, business: 2 }

// PATCH /api/plan — el dueño cambia su plan
export async function PATCH(req: Request) {
  const tenant = await requireTenantOwner()
  if (!tenant) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const plan = body.plan as string
  if (!VALID.includes(plan as (typeof VALID)[number])) {
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

  // Si es una MEJORA (no downgrade), correo de felicitación con lo desbloqueado
  if (ORDER[plan] > ORDER[tenant.plan]) {
    try {
      const oldP = PLANS.find((p) => p.id === tenant.plan)
      const newP = PLANS.find((p) => p.id === plan)
      if (newP) {
        const unlocked: string[] = []
        if (newP.barbers > (oldP?.barbers ?? 0)) {
          unlocked.push(
            newP.barbers >= 99 ? 'Barberos ilimitados' : `Hasta ${newP.barbers} barberos`
          )
        }
        if (newP.locations > (oldP?.locations ?? 0)) {
          unlocked.push(`${newP.locations} ubicaciones`)
        }
        if (newP.analytics && !oldP?.analytics) unlocked.push('Analíticas avanzadas')
        if (newP.whiteLabel && !oldP?.whiteLabel) unlocked.push('Marca blanca (tu logo y color)')

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
        await sendPlanUpgraded({
          ownerEmail: tenant.owner_email,
          ownerName: (tenant.owner_name || '').split(' ')[0] || '',
          tenantName: tenant.name,
          planName: newP.name,
          planPrice: newP.price,
          unlocked,
          adminUrl: `${appUrl}/t/${tenant.slug}/admin`,
        })
      }
    } catch {
      /* el correo es best-effort, no romper el cambio de plan */
    }
  }

  return NextResponse.json({ plan: data.plan })
}
