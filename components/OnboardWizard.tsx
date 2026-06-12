'use client'

import { useState } from 'react'
import { C, PLANS } from '@/lib/constants'
import { S } from '@/lib/styles'
import { slugify } from '@/lib/utils'

type Plan = 'starter' | 'pro' | 'business'

interface FormData {
  name: string
  slug: string
  owner: string
  email: string
  phone: string
  plan: Plan
}

export default function OnboardWizard({ initialPlan }: { initialPlan: Plan }) {
  const [step, setStep] = useState(1)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data, setData] = useState<FormData>({
    name: '',
    slug: '',
    owner: '',
    email: '',
    phone: '',
    plan: initialPlan,
  })

  async function submit() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/stripe/checkout', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(data),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Error al iniciar el checkout')
      window.location.href = json.url
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Error desconocido'
      setError(msg)
      setSubmitting(false)
    }
  }

  const plan = PLANS.find((p) => p.id === data.plan)!

  return (
    <div style={{ maxWidth: 680, margin: '0 auto' }}>
      {/* Progress */}
      <div
        style={{
          display: 'flex',
          gap: 0,
          borderRadius: 6,
          overflow: 'hidden',
          border: `1px solid ${C.border}`,
          marginBottom: 36,
        }}
      >
        {['Negocio', 'Plan', 'Cuenta', 'Pago'].map((l, i) => {
          const on = step > i || step === i + 1
          return (
            <div
              key={l}
              style={{
                flex: 1,
                padding: '9px 0',
                textAlign: 'center',
                fontSize: 10,
                letterSpacing: 1.5,
                fontWeight: 700,
                background: on ? `${C.gold}14` : C.bg2,
                color: on ? C.gold : C.muted2,
                borderBottom: `2px solid ${on ? C.gold : C.border}`,
                textTransform: 'uppercase',
                borderRight: i < 3 ? `1px solid ${C.border}` : 'none',
              }}
            >
              {step > i + 1 ? '✓ ' : ''}
              {l}
            </div>
          )
        })}
      </div>

      {step === 1 && (
        <div>
          <p style={S.step}>Paso 1 · Tu negocio</p>
          <h2 style={S.ttl}>Cuéntanos sobre tu barbería</h2>
          <p style={S.sub}>Esta información aparecerá en tu plataforma y subdominio.</p>
          <div style={{ display: 'grid', gap: 18, marginBottom: 28 }}>
            <div>
              <label style={S.lbl}>Nombre de la barbería *</label>
              <input
                style={S.inp}
                placeholder="Ej: Barber King"
                value={data.name}
                onChange={(e) => {
                  const name = e.target.value
                  setData((d) => ({ ...d, name, slug: slugify(name) }))
                }}
              />
            </div>
            {data.name && (
              <div>
                <label style={S.lbl}>Tu subdominio (auto-generado)</label>
                <div
                  style={{
                    background: C.bg3,
                    border: `1px solid ${C.border2}`,
                    borderRadius: 6,
                    padding: '11px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <span
                    style={{
                      color: C.gold,
                      fontWeight: 700,
                      fontFamily: "'Courier New',monospace",
                      fontSize: 14,
                    }}
                  >
                    {data.slug}
                  </span>
                  <span
                    style={{
                      color: C.muted,
                      fontFamily: "'Courier New',monospace",
                      fontSize: 14,
                    }}
                  >
                    .barberos.com
                  </span>
                </div>
                <p style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
                  Puedes personalizar esto después desde tu panel.
                </p>
              </div>
            )}
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
            <button
              style={{
                ...S.btnG,
                opacity: data.name.trim() ? 1 : 0.35,
                cursor: data.name.trim() ? 'pointer' : 'not-allowed',
              }}
              onClick={() => data.name.trim() && setStep(2)}
            >
              Continuar →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div>
          <p style={S.step}>Paso 2 · Elige tu plan</p>
          <h2 style={S.ttl}>¿Qué plan se adapta mejor?</h2>
          <p style={S.sub}>14 días gratis en todos los planes. Sin tarjeta de crédito.</p>
          <div style={{ display: 'grid', gap: 14, marginBottom: 28 }}>
            {PLANS.map((p) => {
              const sel = data.plan === p.id
              return (
                <div
                  key={p.id}
                  className="card-hov"
                  style={{
                    background: sel ? `${C.gold}0C` : C.bg3,
                    border: `2px solid ${sel ? C.gold : C.border}`,
                    borderRadius: 8,
                    padding: '18px 22px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    transition: 'all 0.2s',
                  }}
                  onClick={() => setData((d) => ({ ...d, plan: p.id }))}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
                    <div
                      style={{
                        width: 20,
                        height: 20,
                        borderRadius: '50%',
                        border: `2px solid ${sel ? C.gold : C.border2}`,
                        background: sel ? C.gold : 'transparent',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 11,
                        color: C.bg,
                        fontWeight: 700,
                        flexShrink: 0,
                      }}
                    >
                      {sel ? '✓' : ''}
                    </div>
                    <div>
                      <div
                        style={{
                          fontWeight: 700,
                          fontSize: 15,
                          color: sel ? C.gold : C.cream,
                          marginBottom: 2,
                        }}
                      >
                        {p.name}
                      </div>
                      <div style={{ fontSize: 12, color: C.muted }}>
                        {p.barbers >= 99 ? 'Barberos ilimitados' : `Hasta ${p.barbers} barberos`} ·{' '}
                        {p.locations} {p.locations > 1 ? 'ubicaciones' : 'ubicación'}
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontSize: 24, fontWeight: 700, color: sel ? C.gold : C.cream }}>
                      ${p.price}
                      <span style={{ fontSize: 12, color: C.muted, fontWeight: 400 }}>/mes</span>
                    </div>
                    <div style={{ fontSize: 10, color: C.green }}>14 días gratis</div>
                  </div>
                </div>
              )
            })}
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="gh" style={S.btnGh} onClick={() => setStep(1)}>
              ← Volver
            </button>
            <button style={S.btnG} onClick={() => setStep(3)}>
              Continuar →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div>
          <p style={S.step}>Paso 3 · Tu cuenta</p>
          <h2 style={S.ttl}>Crea tu cuenta de administrador</h2>
          <p style={S.sub}>Con estos datos accederás al panel de tu barbería.</p>
          <div style={{ display: 'grid', gap: 18, marginBottom: 28 }}>
            <div>
              <label style={S.lbl}>Nombre completo *</label>
              <input
                style={S.inp}
                placeholder="Tu nombre"
                value={data.owner}
                onChange={(e) => setData((d) => ({ ...d, owner: e.target.value }))}
              />
            </div>
            <div>
              <label style={S.lbl}>Correo electrónico *</label>
              <input
                type="email"
                style={S.inp}
                placeholder="tu@correo.com"
                value={data.email}
                onChange={(e) => setData((d) => ({ ...d, email: e.target.value }))}
              />
            </div>
            <div>
              <label style={S.lbl}>Teléfono</label>
              <input
                style={S.inp}
                placeholder="0000-0000"
                value={data.phone}
                onChange={(e) => setData((d) => ({ ...d, phone: e.target.value }))}
              />
            </div>
            <div
              style={{
                background: '#1A1400',
                border: '1px solid #3D3000',
                borderRadius: 7,
                padding: '12px 16px',
              }}
            >
              <p style={{ fontSize: 12, color: C.gold, lineHeight: 1.6, margin: 0 }}>
                🔒 Pasamos a Stripe para iniciar tu prueba gratuita de 14 días en el plan{' '}
                <strong>{plan.name}</strong> (${plan.price}/mes). Durante el trial no se cobra nada.
              </p>
            </div>
          </div>
          {error && (
            <div
              style={{
                background: '#2B1010',
                border: `1px solid ${C.red}44`,
                color: C.red,
                padding: '10px 14px',
                borderRadius: 6,
                marginBottom: 16,
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <button className="gh" style={S.btnGh} onClick={() => setStep(2)}>
              ← Volver
            </button>
            <button
              style={{
                ...S.btnG,
                opacity: data.owner.trim() && data.email.trim() && !submitting ? 1 : 0.35,
                cursor:
                  data.owner.trim() && data.email.trim() && !submitting ? 'pointer' : 'not-allowed',
              }}
              onClick={() => {
                if (data.owner.trim() && data.email.trim() && !submitting) submit()
              }}
            >
              {submitting ? 'Procesando...' : 'Ir al pago →'}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
