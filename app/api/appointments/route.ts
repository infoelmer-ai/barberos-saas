import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

// GET /api/appointments?phone=...&tenant_id=...
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const phone = searchParams.get('phone')
  const tenantId = searchParams.get('tenant_id')

  if (!phone || !tenantId) {
    return NextResponse.json({ appointments: [] })
  }

  const supabase = createAdminClient()
  const { data, error } = await supabase
    .from('appointments')
    .select(
      'id, barber_id, service_id, date, time, status, client_phone, client_name, total, pending_charge, services(duration_min, name, emoji)'
    )
    .eq('tenant_id', tenantId)
    .eq('client_phone', phone)
    .order('date', { ascending: true })
    .order('time', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ appointments: data || [] })
}

// POST /api/appointments — crear cita (público, validamos disponibilidad)
export async function POST(req: Request) {
  try {
    const body = await req.json()
    const required = ['tenant_id', 'barber_id', 'service_id', 'date', 'time', 'client_name', 'client_phone']
    for (const k of required) {
      if (!body[k]) return NextResponse.json({ error: `Falta ${k}` }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Validar tenant activo
    const { data: tenant } = await supabase
      .from('tenants')
      .select('id, status')
      .eq('id', body.tenant_id)
      .single()
    if (!tenant) return NextResponse.json({ error: 'Tenant no encontrado' }, { status: 404 })
    if (tenant.status === 'cancelled') {
      return NextResponse.json({ error: 'Esta barbería no está activa' }, { status: 403 })
    }

    // Obtener precio + duración del servicio
    const { data: service } = await supabase
      .from('services')
      .select('price, duration_min, name')
      .eq('id', body.service_id)
      .single()
    if (!service) return NextResponse.json({ error: 'Servicio no encontrado' }, { status: 404 })

    // Conflicto: ¿ya hay cita en ese slot para este barbero?
    const { data: conflict } = await supabase
      .from('appointments')
      .select('id')
      .eq('barber_id', body.barber_id)
      .eq('date', body.date)
      .eq('time', body.time)
      .eq('status', 'confirmed')
      .maybeSingle()
    if (conflict) {
      return NextResponse.json({ error: 'Este horario ya no está disponible' }, { status: 409 })
    }

    const { data: appointment, error } = await supabase
      .from('appointments')
      .insert({
        tenant_id: body.tenant_id,
        barber_id: body.barber_id,
        service_id: body.service_id,
        date: body.date,
        time: body.time,
        client_name: body.client_name.trim(),
        client_phone: body.client_phone.trim(),
        client_email: body.client_email?.trim() || null,
        total: service.price,
        status: 'confirmed',
      })
      .select(
        'id, barber_id, service_id, date, time, status, client_phone, client_name, total, pending_charge, services(duration_min, name, emoji)'
      )
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ appointment })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
