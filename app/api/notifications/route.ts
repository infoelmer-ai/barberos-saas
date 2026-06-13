import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantOwner } from '@/lib/supabase/api-auth'

// PATCH /api/notifications — activar/desactivar WhatsApp
export async function PATCH(req: Request) {
  const tenant = await requireTenantOwner()
  if (!tenant) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  if (typeof body.whatsapp_enabled !== 'boolean') {
    return NextResponse.json({ error: 'Valor inválido' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tenants')
    .update({ whatsapp_enabled: body.whatsapp_enabled })
    .eq('id', tenant.id)
    .select('whatsapp_enabled')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ whatsapp_enabled: data.whatsapp_enabled })
}
