import { NextResponse } from 'next/server'
import type Stripe from 'stripe'
import { stripe } from '@/lib/stripe/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: Request) {
  const sig = req.headers.get('stripe-signature')
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!sig || !secret) return NextResponse.json({ error: 'Missing signature' }, { status: 400 })

  const body = await req.text()
  let event: Stripe.Event
  try {
    event = stripe.webhooks.constructEvent(body, sig, secret)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'invalid'
    return NextResponse.json({ error: `Webhook signature failed: ${msg}` }, { status: 400 })
  }

  const supabase = createAdminClient()

  try {
    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object as Stripe.Checkout.Session
        const tenantId = session.metadata?.tenant_id
        if (tenantId) {
          await supabase
            .from('tenants')
            .update({
              stripe_customer_id: (session.customer as string) || null,
              stripe_subscription_id: (session.subscription as string) || null,
              status: 'trial',
            })
            .eq('id', tenantId)
        }
        break
      }
      case 'customer.subscription.updated':
      case 'customer.subscription.created': {
        const sub = event.data.object as Stripe.Subscription
        const tenantId = sub.metadata?.tenant_id
        const status = mapSubStatus(sub.status)
        if (tenantId) {
          await supabase
            .from('tenants')
            .update({
              status,
              stripe_subscription_id: sub.id,
              stripe_customer_id: (sub.customer as string) || null,
            })
            .eq('id', tenantId)
        }
        break
      }
      case 'customer.subscription.deleted': {
        const sub = event.data.object as Stripe.Subscription
        const tenantId = sub.metadata?.tenant_id
        if (tenantId) {
          await supabase.from('tenants').update({ status: 'cancelled' }).eq('id', tenantId)
        }
        break
      }
      case 'invoice.payment_failed': {
        const inv = event.data.object as Stripe.Invoice & {
          subscription?: string | Stripe.Subscription
        }
        const subRaw = inv.subscription
        const subId = typeof subRaw === 'string' ? subRaw : subRaw?.id || null
        if (subId) {
          await supabase
            .from('tenants')
            .update({ status: 'past_due' })
            .eq('stripe_subscription_id', subId)
        }
        break
      }
    }
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : 'error'
    return NextResponse.json({ error: msg }, { status: 500 })
  }

  return NextResponse.json({ received: true })
}

function mapSubStatus(s: Stripe.Subscription.Status): 'trial' | 'active' | 'past_due' | 'cancelled' {
  if (s === 'trialing') return 'trial'
  if (s === 'active') return 'active'
  if (s === 'past_due' || s === 'unpaid') return 'past_due'
  return 'cancelled'
}
