import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { chargeTenant } from '@/lib/billing/charge'
import { sendTrialReminder, sendTrialEnded } from '@/lib/email/resend'
import type { Tenant } from '@/lib/supabase/types'

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

  return NextResponse.json({ ok: true, ...summary })
}
