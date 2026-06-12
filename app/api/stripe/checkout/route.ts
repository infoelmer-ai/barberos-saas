import { NextResponse } from 'next/server'
import { stripe, PRICE_IDS } from '@/lib/stripe/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { slugify } from '@/lib/utils'

interface Body {
  name: string
  slug?: string
  owner: string
  email: string
  phone?: string
  plan: 'starter' | 'pro' | 'business'
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body
    if (!body.name?.trim() || !body.owner?.trim() || !body.email?.trim() || !body.plan) {
      return NextResponse.json({ error: 'Datos incompletos' }, { status: 400 })
    }
    const priceId = PRICE_IDS[body.plan]
    if (!priceId) {
      return NextResponse.json({ error: 'Plan inválido' }, { status: 400 })
    }

    const supabase = createAdminClient()

    // Slug único
    let slug = body.slug ? slugify(body.slug) : slugify(body.name)
    if (!slug) slug = `barber-${Date.now()}`
    const { data: existing } = await supabase.from('tenants').select('id').eq('slug', slug).maybeSingle()
    if (existing) slug = `${slug}-${Math.random().toString(36).slice(2, 6)}`

    // Crea tenant en estado "trial" (pendiente de Stripe)
    const { data: tenant, error: tenantErr } = await supabase
      .from('tenants')
      .insert({
        slug,
        name: body.name.trim(),
        plan: body.plan,
        status: 'trial',
        owner_email: body.email.trim(),
        owner_name: body.owner.trim(),
        owner_phone: body.phone?.trim() || null,
      })
      .select()
      .single()

    if (tenantErr || !tenant) {
      return NextResponse.json({ error: tenantErr?.message || 'No se pudo crear tenant' }, { status: 500 })
    }

    // Sembrar servicios default
    await supabase.from('services').insert([
      { tenant_id: tenant.id, name: 'Corte de Pelo', price: 5, duration_min: 30, emoji: '✂️' },
      { tenant_id: tenant.id, name: 'Corte de Barba', price: 4, duration_min: 30, emoji: '🪒' },
      { tenant_id: tenant.id, name: 'Corte + Barba', price: 9, duration_min: 60, emoji: '💈' },
    ])

    // Crear sesión de Stripe Checkout
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
    const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'
    const tenantUrl = appUrl.includes('localhost')
      ? `${appUrl}?tenant=${slug}`
      : `https://${slug}.${rootDomain}`

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      payment_method_types: ['card'],
      customer_email: body.email.trim(),
      line_items: [{ price: priceId, quantity: 1 }],
      subscription_data: {
        trial_period_days: 14,
        metadata: { tenant_id: tenant.id, slug },
      },
      metadata: { tenant_id: tenant.id, slug },
      success_url: `${appUrl}/onboard/success?tenant=${slug}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/onboard?canceled=1`,
    })

    return NextResponse.json({ url: session.url, tenant_url: tenantUrl })
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'Error desconocido'
    return NextResponse.json({ error: msg }, { status: 500 })
  }
}
