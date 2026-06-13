import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { requireTenantOwner } from '@/lib/supabase/api-auth'

// PATCH /api/branding — actualizar logo + color (solo plan Business)
export async function PATCH(req: Request) {
  const tenant = await requireTenantOwner()
  if (!tenant) return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  if (tenant.plan !== 'business') {
    return NextResponse.json(
      { error: 'La marca blanca está disponible solo en el plan Business' },
      { status: 403 }
    )
  }

  const body = await req.json().catch(() => ({}))
  const patch: Record<string, unknown> = {}

  if ('brand_color' in body) {
    const color = String(body.brand_color || '')
    if (!/^#[0-9A-Fa-f]{6}$/.test(color)) {
      return NextResponse.json({ error: 'Color inválido (usa formato #RRGGBB)' }, { status: 400 })
    }
    patch.brand_color = color
  }

  if ('logo_url' in body) {
    const logo = body.logo_url
    if (logo === null || logo === '') {
      patch.logo_url = null
    } else if (typeof logo === 'string' && logo.startsWith('data:image/')) {
      // Límite ~400 KB para no inflar la fila
      if (logo.length > 400_000) {
        return NextResponse.json({ error: 'El logo es muy grande (máx ~300 KB)' }, { status: 400 })
      }
      patch.logo_url = logo
    } else {
      return NextResponse.json({ error: 'Logo inválido' }, { status: 400 })
    }
  }

  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: 'Nada que actualizar' }, { status: 400 })
  }

  const admin = createAdminClient()
  const { data, error } = await admin
    .from('tenants')
    .update(patch)
    .eq('id', tenant.id)
    .select('logo_url, brand_color')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ branding: data })
}
