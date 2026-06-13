import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantOwner } from '@/lib/supabase/api-auth'

// POST /api/barbers — crear barbero (solo el dueño del tenant)
export async function POST(req: Request) {
  const tenant = await requireTenantOwner()
  if (!tenant) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const name = (body.name || '').trim()
  if (!name) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })

  const initials =
    (body.initials || '').trim() ||
    name
      .split(/\s+/)
      .slice(0, 2)
      .map((w: string) => w[0]?.toUpperCase() || '')
      .join('') ||
    'B'

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('barbers')
    .insert({
      tenant_id: tenant.id,
      name,
      specialty: (body.specialty || '').trim() || null,
      initials,
      color: body.color || '#C9A84C',
      active: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ barber: data })
}
