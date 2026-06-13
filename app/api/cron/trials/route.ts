import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { chargeTenant } from '@/lib/billing/charge'
import { sendTrialReminder, sendTrialEnded, sendAppointmentReminder } from '@/lib/email/resend'
import type { Tenant } from '@/lib/supabase/types'

// Recordatorios a clientes con cita mañana (reduce no-shows). Best-effort.
async function sendDayBeforeReminders(admin: ReturnType<typeof createAdminClient>, appUrl: string) {
  const tomorrow = new Date()
  tomorrow.setDate(tomorrow.getDate() + 1)
  const tomorrowISO = tomorrow.toISOString().split('T')[0]

  const { data: apts } = await admin
    .from('appointments')
    .select(
      'id, date, time, client_name, client_email, tenants(name, slug, brand_color, plan), barbers(name), services(name)'
    )
    .eq('status', 'confirmed')
    .eq('date', tomorrowISO)
    .eq('reminder_sent', false)
    .not('client_email', 'is', null)

  let sent = 0
  for (const a of apts || []) {
    // Supabase embebe las relaciones como objeto o array según la inferencia
    const pick = <T,>(v: T | T[] | null): T | null => (Array.isArray(v) ? v[0] ?? null : v)
    const t = pick(a.tenants as unknown)
    const b = pick(a.barbers as unknown)
    const s = pick(a.services as unknown)
    const tenant = t as { name: string; slug: string; brand_color: string | null; plan: string } | null
    const barber = b as { name: string } | null
    const service = s as { name: string } | null
    if (!tenant || !a.client_email) continue

    await sendAppointmentReminder({
      clientEmail: a.client_email,
      clientName: a.client_name,
      tenantName: tenant.name,
      barberName: barber?.name || 'tu barbero',
      serviceName: service?.name || 'tu servicio',
      date: a.date,
      time: String(a.time).slice(0, 5),
      bookingUrl: `${appUrl}/t/${tenant.slug}`,
      brandColor: tenant.brand_color,
      whiteLabel: tenant.plan === 'business',
    })
    await admin.from('appointments').update({ reminder_sent: true }).eq('id', a.id)
    sent++
  }
  return sent
}

export const dynamic = 'force-dynamic'

// Cron diario (configurado en vercel.json). Gestiona el trial de 14 días:
//  - recordatorios a 3 días y 1 día del vencimiento
//  - al vencer, intenta cobrar (n1co) → active; si no se puede → past_due + email
//
// Se ejecuta también con: GET /api/cron/trials  con header
//   Authorization: Bearer <CRON_SECRET>
export async function GET(req: Request) {
  const auth = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || auth !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
  }

  const admin = createAdminClient()
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const now = new Date()

  // Trials gestionados por nosotros (los de Stripe los maneja Stripe).
  const { data: trials } = await admin
    .from('tenants')
    .select('*')
    .eq('status', 'trial')
    .is('stripe_subscription_id', null)

  const summary = { processed: (trials || []).length, reminders: 0, converted: 0, pastDue: 0 }

  for (const t of (trials || []) as Tenant[]) {
    if (!t.trial_ends_at) continue
    const ends = new Date(t.trial_ends_at)
    const msLeft = ends.getTime() - now.getTime()
    const daysLeft = Math.ceil(msLeft / 86400000)
    const adminUrl = `${appUrl}/t/${t.slug}/admin`
    const firstName = (t.owner_name || '').split(' ')[0] || ''

    if (msLeft <= 0) {
      // Trial vencido → intentar cobrar
      const result = await chargeTenant(t)
      if (result.ok) {
        await admin.from('tenants').update({ status: 'active' }).eq('id', t.id)
        summary.converted++
      } else {
        await admin.from('tenants').update({ status: 'past_due' }).eq('id', t.id)
        if (!t.trial_ended_notified) {
          await sendTrialEnded({ ownerEmail: t.owner_email, ownerName: firstName, tenantName: t.name, adminUrl })
          await admin.from('tenants').update({ trial_ended_notified: true }).eq('id', t.id)
        }
        summary.pastDue++
      }
    } else if (daysLeft <= 1 && !t.trial_reminder_1d_sent) {
      await sendTrialReminder({ ownerEmail: t.owner_email, ownerName: firstName, tenantName: t.name, daysLeft: 1, adminUrl })
      // Marca también el de 3 días para no mandarlo después
      await admin
        .from('tenants')
        .update({ trial_reminder_1d_sent: true, trial_reminder_3d_sent: true })
        .eq('id', t.id)
      summary.reminders++
    } else if (daysLeft <= 3 && !t.trial_reminder_3d_sent && !t.trial_reminder_1d_sent) {
      await sendTrialReminder({ ownerEmail: t.owner_email, ownerName: firstName, tenantName: t.name, daysLeft, adminUrl })
      await admin.from('tenants').update({ trial_reminder_3d_sent: true }).eq('id', t.id)
      summary.reminders++
    }
  }

  // Recordatorios a clientes con cita mañana
  const reminders24h = await sendDayBeforeReminders(admin, appUrl)

  return NextResponse.json({ ok: true, ...summary, reminders24h })
}
