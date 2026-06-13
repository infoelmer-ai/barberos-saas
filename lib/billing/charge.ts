import type { Tenant } from '@/lib/supabase/types'
import { PLAN_PRICES } from '@/lib/stripe/server'

export interface ChargeResult {
  ok: boolean
  needsPayment?: boolean
  error?: string
}

// ─────────────────────────────────────────────────────────────────
// PUNTO DE INTEGRACIÓN DEL COBRO
// ─────────────────────────────────────────────────────────────────
// Hoy es un stub seguro. Cuando llegue el sandbox de n1co, aquí se cobra
// el plan del tenant usando tenant.payment_token (el token de tarjeta que
// se captura con el widget de n1co al registrarse).
//
// El cron de trial llama a esta función cuando el período de prueba vence.
//   - Devuelve { ok: true }            → el cron marca el tenant como 'active'
//   - Devuelve { ok: false, needsPayment } → el cron marca 'past_due' + email
// ─────────────────────────────────────────────────────────────────
export async function chargeTenant(tenant: Tenant): Promise<ChargeResult> {
  const amount = PLAN_PRICES[tenant.plan] // monto mensual del plan

  if (!tenant.payment_token) {
    // Sin método de pago guardado → no se puede cobrar todavía
    return { ok: false, needsPayment: true }
  }

  // TODO(n1co): reemplazar por la llamada real a la API de n1co.
  // Ejemplo de cómo quedará:
  //
  //   const res = await fetch('https://api.n1co.com/v3/charges', {
  //     method: 'POST',
  //     headers: { Authorization: `Bearer ${process.env.N1CO_SECRET_KEY}`, 'content-type': 'application/json' },
  //     body: JSON.stringify({ token: tenant.payment_token, amount, currency: 'USD', description: `BarberOS ${tenant.plan}` }),
  //   })
  //   if (res.ok) return { ok: true }
  //   return { ok: false, error: 'Cobro rechazado' }

  void amount
  return { ok: false, error: 'Procesador de pagos aún no configurado (n1co pendiente de sandbox)' }
}

// ─────────────────────────────────────────────────────────────────
// COBRO DE ANTICIPO AL CLIENTE FINAL (anti no-show)
// ─────────────────────────────────────────────────────────────────
// Cobra el anticipo al CLIENTE de la barbería al momento de reservar.
// Requiere n1co (cobro a consumidor con tarjeta en la página pública).
// Hoy es stub: devuelve no-configurado. Cuando n1co esté listo, aquí se
// genera el cobro/link de pago por `amount` y se confirma la cita solo si
// el pago es exitoso.
// ─────────────────────────────────────────────────────────────────
export async function chargeDeposit(_opts: {
  tenantId: string
  amount: number
  cardToken?: string
  description: string
}): Promise<ChargeResult> {
  // TODO(n1co): cobrar el anticipo con la API de n1co.
  return { ok: false, error: 'Cobro de anticipo aún no disponible (n1co pendiente)' }
}
