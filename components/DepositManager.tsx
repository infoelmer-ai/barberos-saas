'use client'

import { useState } from 'react'
import { C } from '@/lib/constants'
import { S } from '@/lib/styles'
import type { Service, Tenant } from '@/lib/supabase/types'

export default function DepositManager({
  tenant,
  services,
  demoMode,
}: {
  tenant: Tenant
  services: Service[]
  demoMode: boolean
}) {
  const [enabled, setEnabled] = useState(tenant.deposit_enabled)
  const [percent, setPercent] = useState(tenant.deposit_percent ?? 50)
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)

  async function save() {
    if (demoMode) return
    setBusy(true)
    setMsg(null)
    const res = await fetch('/api/deposit', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ deposit_enabled: enabled, deposit_percent: percent }),
    })
    const json = await res.json()
    setBusy(false)
    if (!res.ok) setMsg({ ok: false, text: json.error || 'Error al guardar' })
    else setMsg({ ok: true, text: '✅ Configuración guardada.' })
  }

  const sample = services[0]
  const sampleDeposit = sample ? (Number(sample.price) * percent) / 100 : 0

  return (
    <div style={S.card}>
      <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
        Anticipo · anti no-show
      </div>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 20, lineHeight: 1.7 }}>
        Pide a tus clientes un anticipo al reservar para que no falten. Si llegan, se les abona al
        corte; si no llegan, te quedas el anticipo.
      </p>

      {/* Toggle */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          background: C.bg3,
          border: `1px solid ${C.border2}`,
          borderRadius: 8,
          padding: '14px 18px',
          marginBottom: 18,
        }}
      >
        <div>
          <div style={{ fontWeight: 700, fontSize: 14, color: C.cream }}>Requerir anticipo</div>
          <div style={{ fontSize: 12, color: C.muted }}>Al activarlo, el cliente paga un % por adelantado</div>
        </div>
        <button
          onClick={() => setEnabled((v) => !v)}
          disabled={demoMode}
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
          aria-label="Activar anticipo"
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

      {/* Porcentaje */}
      <div style={{ opacity: enabled ? 1 : 0.45, pointerEvents: enabled ? 'auto' : 'none' }}>
        <label style={S.lbl}>Porcentaje del servicio a cobrar como anticipo</label>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 8 }}>
          <input
            type="range"
            min={10}
            max={100}
            step={5}
            value={percent}
            onChange={(e) => setPercent(Number(e.target.value))}
            disabled={demoMode}
            style={{ flex: 1, accentColor: C.gold }}
          />
          <div
            style={{
              minWidth: 64,
              textAlign: 'center',
              background: C.bg3,
              border: `1px solid ${C.border2}`,
              borderRadius: 6,
              padding: '8px 10px',
              fontWeight: 700,
              color: C.gold,
            }}
          >
            {percent}%
          </div>
        </div>
        {sample && (
          <p style={{ fontSize: 12, color: C.muted }}>
            Ejemplo: un <strong style={{ color: C.cream }}>{sample.name}</strong> de ${sample.price} →
            anticipo de <strong style={{ color: C.gold }}>${sampleDeposit.toFixed(2)}</strong>
          </p>
        )}
      </div>

      {/* Aviso n1co */}
      <div
        style={{
          background: '#1A1400',
          border: '1px solid #3D3000',
          borderRadius: 8,
          padding: '12px 16px',
          marginTop: 18,
          fontSize: 12,
          color: C.gold,
          lineHeight: 1.6,
        }}
      >
        💳 <strong>Cobro en línea:</strong> el anticipo se mostrará a tus clientes al reservar. El
        cobro automático con tarjeta se activa en cuanto conectemos el procesador de pagos (en
        proceso). Mientras tanto puedes usarlo como acuerdo informativo o cobrar en persona.
      </div>

      {msg && (
        <div
          style={{
            marginTop: 16,
            padding: '10px 14px',
            borderRadius: 6,
            fontSize: 12,
            background: msg.ok ? '#0D2B1A' : '#2B1010',
            border: `1px solid ${msg.ok ? '#2D6B4A' : `${C.red}44`}`,
            color: msg.ok ? C.green : C.red,
          }}
        >
          {msg.text}
        </div>
      )}

      {!demoMode ? (
        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
          <button style={{ ...S.btnG, opacity: busy ? 0.5 : 1 }} onClick={save} disabled={busy}>
            {busy ? 'Guardando...' : 'Guardar'}
          </button>
        </div>
      ) : (
        <p style={{ fontSize: 11, color: C.muted2, marginTop: 18, textAlign: 'center' }}>
          En modo demo no se puede guardar.
        </p>
      )}
    </div>
  )
}
