import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantOwner } from '@/lib/supabase/api-auth'

// POST /api/services — crear servicio
export async function POST(req: Request) {
  const tenant = await requireTenantOwner()
  if (!tenant) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const name = (body.name || '').trim()
  const price = Number(body.price)
  const duration = Number(body.duration_min)
  if (!name) return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
  if (!(price >= 0)) return NextResponse.json({ error: 'Precio inválido' }, { status: 400 })
  if (!(duration > 0) || duration % 30 !== 0)
    return NextResponse.json({ error: 'La duración debe ser múltiplo de 30 min' }, { status: 400 })

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('services')
    .insert({
      tenant_id: tenant.id,
      name,
      price,
      duration_min: duration,
      emoji: (body.emoji || '✂️').trim(),
      active: true,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ service: data })
}
