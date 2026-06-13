import { Resend } from 'resend'

// Cliente Resend con degradación elegante:
// si no hay RESEND_API_KEY, las funciones no hacen nada (no rompen el flujo).
const apiKey = process.env.RESEND_API_KEY
const resend = apiKey ? new Resend(apiKey) : null
const FROM = process.env.RESEND_FROM_EMAIL || 'BarberOS <onboarding@resend.dev>'

const GOLD = '#C9A84C'
const BG = '#13110E'
const CREAM = '#F0EAD8'
const MUTED = '#7A7060'

function shell(title: string, body: string, opts: { accent?: string; footer?: string } = {}) {
  const accent = opts.accent || GOLD
  const footer = opts.footer || 'Enviado por BarberOS · Sistema de agendamiento para barberías'
  return `<!doctype html><html><body style="margin:0;background:#0A0906;font-family:Arial,Helvetica,sans-serif;padding:24px">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:${BG};border:1px solid #2A2520;border-radius:12px;overflow:hidden">
    <tr><td style="padding:24px 28px;border-bottom:1px solid #2A2520">
      <span style="font-size:22px">💈</span>
      <span style="color:${accent};font-size:18px;font-weight:bold;vertical-align:middle;margin-left:6px">${title}</span>
    </td></tr>
    <tr><td style="padding:28px;color:${CREAM};font-size:14px;line-height:1.7">${body}</td></tr>
    <tr><td style="padding:16px 28px;border-top:1px solid #2A2520;color:${MUTED};font-size:11px">
      ${footer}
    </td></tr>
  </table></body></html>`
}

function row(label: string, value: string) {
  return `<tr><td style="color:${MUTED};padding:6px 0">${label}</td><td style="color:${CREAM};font-weight:bold;text-align:right;padding:6px 0">${value}</td></tr>`
}

interface BookingData {
  tenantName: string
  clientName: string
  clientEmail?: string | null
  ownerEmail: string
  barberName: string
  serviceName: string
  date: string
  time: string
  total: number
  bookingUrl: string
  brandColor?: string | null
  whiteLabel?: boolean
}

// Confirmación al cliente que reservó
export async function sendBookingConfirmation(d: BookingData) {
  if (!resend || !d.clientEmail) return
  const body = `
    <p style="margin:0 0 16px">¡Hola <strong>${d.clientName}</strong>! Tu cita en <strong>${d.tenantName}</strong> quedó confirmada. ✅</p>
    <table width="100%" style="font-size:13px;margin:8px 0 16px">
      ${row('✂️ Servicio', d.serviceName)}
      ${row('💈 Barbero', d.barberName)}
      ${row('📅 Fecha', d.date)}
      ${row('⏰ Hora', d.time)}
      ${row('💵 Total', '$' + d.total.toFixed(2))}
    </table>
    <p style="margin:0;color:${MUTED};font-size:12px">Para consultar o cancelar tu cita, usa tu número de teléfono en <a href="${d.bookingUrl}" style="color:${d.brandColor || GOLD}">la página de la barbería</a>. Recuerda: cancela con 24h de anticipación para no generar cargo.</p>`
  // Para barberías con marca blanca, el correo va sin mención a BarberOS.
  const footer = d.whiteLabel
    ? `Enviado por ${d.tenantName}`
    : 'Enviado por BarberOS · Sistema de agendamiento para barberías'
  try {
    await resend.emails.send({
      from: FROM,
      to: d.clientEmail,
      subject: `Cita confirmada en ${d.tenantName} — ${d.date} ${d.time}`,
      html: shell('Cita Confirmada', body, { accent: d.brandColor || GOLD, footer }),
    })
  } catch {
    // No romper el flujo de reserva si el correo falla
  }
}

// Notificación al dueño de una reserva nueva
export async function sendOwnerNotification(d: BookingData) {
  if (!resend) return
  const body = `
    <p style="margin:0 0 16px">Tienes una <strong>nueva cita</strong> en ${d.tenantName}. 🎉</p>
    <table width="100%" style="font-size:13px;margin:8px 0 16px">
      ${row('👤 Cliente', d.clientName)}
      ${row('✂️ Servicio', d.serviceName)}
      ${row('💈 Barbero', d.barberName)}
      ${row('📅 Fecha', d.date)}
      ${row('⏰ Hora', d.time)}
      ${row('💵 Total', '$' + d.total.toFixed(2))}
    </table>
    <p style="margin:0;color:${MUTED};font-size:12px">Ve todas tus citas en tu panel de BarberOS.</p>`
  try {
    await resend.emails.send({
      from: FROM,
      to: d.ownerEmail,
      subject: `Nueva cita: ${d.clientName} — ${d.date} ${d.time}`,
      html: shell('Nueva Cita', body),
    })
  } catch {
    /* noop */
  }
}

// Bienvenida al dueño tras registrarse
export async function sendWelcome(opts: {
  ownerEmail: string
  ownerName: string
  tenantName: string
  bookingUrl: string
  adminUrl: string
}) {
  if (!resend) return
  const body = `
    <p style="margin:0 0 16px">¡Bienvenido <strong>${opts.ownerName}</strong>! Tu barbería <strong>${opts.tenantName}</strong> ya está activa en BarberOS con 14 días de prueba gratis. 🎉</p>
    <p style="margin:0 0 8px;color:${CREAM}"><strong>1. Tu página pública</strong> (compártela con tus clientes):</p>
    <p style="margin:0 0 16px"><a href="${opts.bookingUrl}" style="color:${GOLD}">${opts.bookingUrl.replace(/^https?:\/\//, '')}</a></p>
    <p style="margin:0 0 8px;color:${CREAM}"><strong>2. Tu panel de control</strong> (entra con este correo):</p>
    <p style="margin:0 0 16px"><a href="${opts.adminUrl}" style="color:${GOLD}">Abrir mi panel →</a></p>
    <p style="margin:0;color:${MUTED};font-size:12px">Desde tu panel puedes agregar barberos, configurar tus servicios y precios, y ver tus ingresos.</p>`
  try {
    await resend.emails.send({
      from: FROM,
      to: opts.ownerEmail,
      subject: `¡Bienvenido a BarberOS, ${opts.ownerName}!`,
      html: shell('Bienvenido a BarberOS', body),
    })
  } catch {
    /* noop */
  }
}

// Recordatorio: faltan X días para que termine la prueba
export async function sendTrialReminder(opts: {
  ownerEmail: string
  ownerName: string
  tenantName: string
  daysLeft: number
  adminUrl: string
}) {
  if (!resend) return
  const d = opts.daysLeft
  const when = d <= 1 ? 'mañana' : `en ${d} días`
  const body = `
    <p style="margin:0 0 16px">Hola <strong>${opts.ownerName || 'barbero'}</strong>, tu prueba gratis de <strong>${opts.tenantName}</strong> termina <strong style="color:${GOLD}">${when}</strong>.</p>
    <p style="margin:0 0 16px;color:${CREAM}">Para no perder el acceso a tu agenda y tus citas, agrega tu método de pago. Tus datos y tu configuración se conservan.</p>
    <p style="margin:0 0 16px"><a href="${opts.adminUrl}" style="color:${GOLD}">Ir a mi panel →</a></p>
    <p style="margin:0;color:${MUTED};font-size:12px">¿Dudas? Responde a este correo y te ayudamos.</p>`
  try {
    await resend.emails.send({
      from: FROM,
      to: opts.ownerEmail,
      subject:
        d <= 1
          ? `⏰ Tu prueba de ${opts.tenantName} termina mañana`
          : `Tu prueba de ${opts.tenantName} termina en ${d} días`,
      html: shell('Tu prueba está por terminar', body),
    })
  } catch {
    /* noop */
  }
}

// Aviso: la prueba terminó y se necesita método de pago
export async function sendTrialEnded(opts: {
  ownerEmail: string
  ownerName: string
  tenantName: string
  adminUrl: string
}) {
  if (!resend) return
  const body = `
    <p style="margin:0 0 16px">Hola <strong>${opts.ownerName || 'barbero'}</strong>, tu prueba gratis de <strong>${opts.tenantName}</strong> ha terminado.</p>
    <p style="margin:0 0 16px;color:${CREAM}">Tu barbería sigue guardada con todos tus barberos, servicios y citas. Para reactivar tu cuenta y seguir recibiendo reservas, agrega tu método de pago.</p>
    <p style="margin:0 0 16px"><a href="${opts.adminUrl}" style="color:${GOLD}">Reactivar mi cuenta →</a></p>
    <p style="margin:0;color:${MUTED};font-size:12px">¿Necesitas ayuda? Responde a este correo.</p>`
  try {
    await resend.emails.send({
      from: FROM,
      to: opts.ownerEmail,
      subject: `Tu prueba de ${opts.tenantName} terminó — reactiva tu cuenta`,
      html: shell('Tu prueba terminó', body),
    })
  } catch {
    /* noop */
  }
}

// Recordatorio al cliente ~24h antes de su cita (reduce no-shows)
export async function sendAppointmentReminder(opts: {
  clientEmail: string
  clientName: string
  tenantName: string
  barberName: string
  serviceName: string
  date: string
  time: string
  bookingUrl: string
  brandColor?: string | null
  whiteLabel?: boolean
}) {
  if (!resend) return
  const accent = opts.brandColor || GOLD
  const footer = opts.whiteLabel
    ? `Enviado por ${opts.tenantName}`
    : 'Enviado por BarberOS · Sistema de agendamiento para barberías'
  const body = `
    <p style="margin:0 0 16px">Hola <strong>${opts.clientName}</strong>, te recordamos tu cita en <strong>${opts.tenantName}</strong> <strong style="color:${accent}">mañana</strong>. 💈</p>
    <table width="100%" style="font-size:13px;margin:8px 0 16px">
      ${row('✂️ Servicio', opts.serviceName)}
      ${row('💈 Barbero', opts.barberName)}
      ${row('📅 Fecha', opts.date)}
      ${row('⏰ Hora', opts.time)}
    </table>
    <p style="margin:0;color:${MUTED};font-size:12px">¿No podrás asistir? Cancela con tiempo desde <a href="${opts.bookingUrl}" style="color:${accent}">la página de la barbería</a> (usa tu teléfono). Cancelar con menos de 24h puede generar un cargo.</p>`
  try {
    await resend.emails.send({
      from: FROM,
      to: opts.clientEmail,
      subject: `Recordatorio: tu cita en ${opts.tenantName} es mañana a las ${opts.time}`,
      html: shell('Recordatorio de tu cita', body, { accent, footer }),
    })
  } catch {
    /* noop */
  }
}

// Confirmación + felicitación al mejorar de plan
export async function sendPlanUpgraded(opts: {
  ownerEmail: string
  ownerName: string
  tenantName: string
  planName: string
  planPrice: number
  unlocked: string[]
  adminUrl: string
}) {
  if (!resend) return
  const list = opts.unlocked
    .map(
      (f) =>
        `<tr><td style="padding:6px 0;color:${CREAM};font-size:14px"><span style="color:${GOLD};font-weight:bold">✓</span> ${f}</td></tr>`
    )
    .join('')
  const body = `
    <p style="margin:0 0 16px">🎉 ¡Felicidades <strong>${opts.ownerName || 'barbero'}</strong>! Mejoraste <strong>${opts.tenantName}</strong> al plan <strong style="color:${GOLD}">${opts.planName}</strong> ($${opts.planPrice}/mes).</p>
    <p style="margin:0 0 10px;color:${CREAM}"><strong>Esto es lo que acabas de desbloquear:</strong></p>
    <table width="100%" style="margin:0 0 18px">${list}</table>
    <p style="margin:0 0 16px"><a href="${opts.adminUrl}" style="color:${GOLD}">Ir a explorar mis nuevas funciones →</a></p>
    <p style="margin:0;color:${MUTED};font-size:12px">Las funciones ya están activas en tu panel. ¡Gracias por crecer con nosotros!</p>`
  try {
    await resend.emails.send({
      from: FROM,
      to: opts.ownerEmail,
      subject: `🎉 ¡Felicidades! Mejoraste al plan ${opts.planName}`,
      html: shell('¡Mejoraste tu plan!', body),
    })
  } catch {
    /* noop */
  }
}
