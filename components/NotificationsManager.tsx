'use client'

import { useState } from 'react'
import { C } from '@/lib/constants'
import { S } from '@/lib/styles'
import type { Tenant } from '@/lib/supabase/types'

export default function NotificationsManager({
  tenant,
  demoMode,
}: {
  tenant: Tenant
  demoMode: boolean
}) {
  const [enabled, setEnabled] = useState(tenant.whatsapp_enabled !== false)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<string | null>(null)

  async function toggle() {
    if (demoMode) return
    const next = !enabled
    setEnabled(next)
    setBusy(true)
    setMsg(null)
    const res = await fetch('/api/notifications', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ whatsapp_enabled: next }),
    })
    setBusy(false)
    if (!res.ok) {
      setEnabled(!next)
      setMsg('No se pudo guardar')
    }
  }

  return (
    <div style={{ ...S.card, marginTop: 18 }}>
      <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
        Notificaciones por WhatsApp
      </div>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 18, lineHeight: 1.7 }}>
        Tus clientes reciben la confirmación de su cita y el recordatorio del día anterior por
        WhatsApp — donde de verdad los ves. 💬
      </p>

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: C.bg3,
          border: `1px solid ${C.border2}`,
          borderRadius: 8,
          padding: '14px 18px',
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.cream }}>
            Confirmaciones y recordatorios por WhatsApp
          </div>
          <div style={{ fontSize: 12, color: C.muted }}>Al teléfono que deja el cliente al reservar</div>
        </div>
        <button
          onClick={toggle}
          disabled={demoMode || busy}
          style={{
            width: 50,
            height: 28,
            borderRadius: 14,
            border: 'none',
            background: enabled ? C.green : C.border2,
            position: 'relative',
            cursor: demoMode ? 'not-allowed' : 'pointer',
            transition: 'background 0.2s',
          }}
          aria-label="Activar WhatsApp"
        >
          <span
            style={{
              position: 'absolute',
              top: 3,
              left: enabled ? 25 : 3,
              width: 22,
              height: 22,
              borderRadius: '50%',
              background: '#fff',
              transition: 'left 0.2s',
            }}
          />
        </button>
      </div>

      <div
        style={{
          background: '#1A1400',
          border: '1px solid #3D3000',
          borderRadius: 8,
          padding: '12px 16px',
          marginTop: 16,
          fontSize: 12,
          color: C.gold,
          lineHeight: 1.6,
        }}
      >
        💬 <strong>En proceso:</strong> el envío automático por WhatsApp se activa en cuanto
        conectemos la cuenta oficial de WhatsApp Business. Tu preferencia queda guardada y empezará a
        funcionar sin que hagas nada más.
      </div>

      {msg && (
        <div style={{ marginTop: 12, fontSize: 12, color: C.red }}>{msg}</div>
      )}
      {demoMode && (
        <p style={{ fontSize: 11, color: C.muted2, marginTop: 14, textAlign: 'center' }}>
          En modo demo no se puede cambiar.
        </p>
      )}
    </div>
  )
}
