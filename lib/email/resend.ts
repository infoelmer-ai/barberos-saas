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
