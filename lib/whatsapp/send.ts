// ─────────────────────────────────────────────────────────────────
// SEAM DE WHATSAPP — Meta WhatsApp Cloud API
// ─────────────────────────────────────────────────────────────────
// Envía mensajes por WhatsApp usando la API oficial de Meta.
// Hoy hace no-op si no están configuradas las variables (WHATSAPP_TOKEN,
// WHATSAPP_PHONE_ID). Cuando se conecte la cuenta de Meta + plantillas
// aprobadas, empieza a enviar automáticamente — sin tocar el resto del código.
//
// Modelo inicial: NÚMERO COMPARTIDO de BarberOS. El contenido del mensaje va
// marcado con el nombre de la barbería (ej: "Tu cita en Barbería X...").
// Más adelante: número propio por barbería vía Embedded Signup (Tech Provider).
//
// Plantillas a crear en Meta (categoría "Utility", idioma es):
//   - appointment_confirmation  → params: [cliente, barbería, servicio, fecha, hora, barbero]
//   - appointment_reminder      → params: [cliente, barbería, fecha, hora, barbero]
// ─────────────────────────────────────────────────────────────────

const GRAPH_VERSION = 'v21.0'

// Normaliza un teléfono a formato internacional sin "+" (lo que pide Meta).
// El Salvador: código 503, números locales de 8 dígitos.
export function normalizePhone(raw: string, countryCode = '503'): string | null {
  const digits = (raw || '').replace(/\D/g, '')
  if (!digits) return null
  if (digits.startsWith(countryCode)) return digits
  if (digits.length === 8) return countryCode + digits
  return digits
}

export async function sendWhatsAppTemplate(opts: {
  to: string
  template: string
  params: (string | number)[]
}): Promise<{ ok: boolean; skipped?: boolean; error?: string }> {
  const token = process.env.WHATSAPP_TOKEN
  const phoneId = process.env.WHATSAPP_PHONE_ID
  if (!token || !phoneId) {
    // Aún no configurado → no-op silencioso
    return { ok: false, skipped: true }
  }

  const num = normalizePhone(opts.to)
  if (!num) return { ok: false, error: 'teléfono inválido' }

  try {
    const res = await fetch(`https://graph.facebook.com/${GRAPH_VERSION}/${phoneId}/messages`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        messaging_product: 'whatsapp',
        to: num,
        type: 'template',
        template: {
          name: opts.template,
          language: { code: 'es' },
          components: [
            {
              type: 'body',
              parameters: opts.params.map((t) => ({ type: 'text', text: String(t) })),
            },
          ],
        },
      }),
    })
    if (!res.ok) {
      const txt = await res.text().catch(() => '')
      return { ok: false, error: `WhatsApp ${res.status}: ${txt.slice(0, 200)}` }
    }
    return { ok: true }
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'error' }
  }
}
