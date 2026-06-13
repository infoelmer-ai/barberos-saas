import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantOwner } from '@/lib/supabase/api-auth'

// PATCH /api/barbers/[id] — editar barbero del tenant
export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await requireTenantOwner()
  if (!tenant) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params
  const body = await req.json().catch(() => ({}))

  const patch: Record<string, unknown> = {}
  if (typeof body.name === 'string') patch.name = body.name.trim()
  if (typeof body.specialty === 'string') patch.specialty = body.specialty.trim() || null
  if (typeof body.initials === 'string') patch.initials = body.initials.trim()
  if (typeof body.color === 'string') patch.color = body.color
  if (typeof body.active === 'boolean') patch.active = body.active

  const admin = createAdminClient()
  // .eq tenant_id garantiza que solo toque barberos de SU tenant
  const { data, error } = await admin
    .from('barbers')
    .update(patch)
    .eq('id', id)
    .eq('tenant_id', tenant.id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ barber: data })
}

// DELETE /api/barbers/[id]
export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await requireTenantOwner()
  if (!tenant) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  const { id } = await params

  const admin = createAdminClient()
  const { error } = await admin
    .from('barbers')
    .delete()
    .eq('id', id)
    .eq('tenant_id', tenant.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
