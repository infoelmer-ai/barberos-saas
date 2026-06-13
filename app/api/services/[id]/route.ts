import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantOwner } from '@/lib/supabase/api-auth'

// PATCH /api/services/[id]
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await requireTenantOwner()
  if (!tenant) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const patch: Record<string, unknown> = {}
  if (typeof body.name === 'string') patch.name = body.name.trim()
  if (body.price !== undefined) {
    const price = Number(body.price)
    if (!(price >= 0)) return NextResponse.json({ error: 'Precio inválido' }, { status: 400 })
    patch.price = price
  }
  if (body.duration_min !== undefined) {
    const d = Number(body.duration_min)
    if (!(d > 0) || d % 30 !== 0)
      return NextResponse.json({ error: 'Duración debe ser múltiplo de 30' }, { status: 400 })
    patch.duration_min = d
  }
  if (typeof body.emoji === 'string') patch.emoji = body.emoji.trim()
  if (typeof body.active === 'boolean') patch.active = body.active

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('services')
    .update(patch)
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ service: data })
}

// DELETE /api/services/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await requireTenantOwner()
  if (!tenant) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params

  const admin = createAdminClient()
  const { error } = await admin
    .from('services')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenant.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
