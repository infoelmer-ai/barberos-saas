import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantOwner } from '@/lib/supabase/api-auth'

// PATCH /api/deposit — configurar el anticipo (% del servicio)
export async function PATCH(req: Request) {
  const tenant = await requireTenantOwner()
  if (!tenant) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const patch: Record<string, unknown> = {}

  if (typeof body.deposit_enabled === 'boolean') {
    patch.deposit_enabled = body.deposit_enabled
  }
  if (body.deposit_percent !== undefined) {
    const pct = Math.round(Number(body.deposit_percent))
    if (!(pct >= 0 && pct <= 100)) {
      return NextResponse.json({ error: 'El porcentaje debe estar entre 0 y 100' }, { status: 400 })
    }
    patch.deposit_percent = pct
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tenants')
    .update(patch)
    .eq('id', tenant.id)
    .select('deposit_enabled, deposit_percent')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ deposit: data })
}
