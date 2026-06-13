'use client'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { C, PLANS } from '@/lib/constants'
import { S } from '@/lib/styles'
import type { Tenant } from '@/lib/supabase/types'

const PLAN_PRICE: Record<string, number> = Object.fromEntries(PLANS.map((p) => [p.id, p.price]))

export default function SuperAdminView({
  tenants,
  aptCounts,
  adminEmail,
}: {
  tenants: Tenant[]
  aptCounts: Record<string, number>
  adminEmail: string
}) {
  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const active = tenants.filter((t) => t.status === 'active')
  const trial = tenants.filter((t) => t.status === 'trial')
  const cancelled = tenants.filter((t) => t.status === 'cancelled')
  const pastDue = tenants.filter((t) => t.status === 'past_due')
  const mrr = active.reduce((s, t) => s + (PLAN_PRICE[t.plan] || 0), 0)
  const totalApts = Object.values(aptCounts).reduce((s, n) => s + n, 0)

  const kpis = [
    { l: 'MRR', v: `$${mrr}`, c: C.green },
    { l: 'Activas', v: active.length, c: C.green },
    { l: 'En trial', v: trial.length, c: C.gold },
    { l: 'Pago pendiente', v: pastDue.length, c: '#E8A84C' },
    { l: 'Canceladas', v: cancelled.length, c: C.red },
    { l: 'Citas totales', v: totalApts, c: C.blue },
  ]

  const statusBadge = (s: string) => {
    const map: Record<string, [string, string]> = {
      active: [C.green, 'Activa'],
      trial: [C.gold, 'Trial'],
      past_due: ['#E8A84C', 'Pago pendiente'],
      cancelled: [C.red, 'Cancelada'],
    }
    const [col, label] = map[s] || [C.muted, s]
    return <span style={S.badge(col)}>{label}</span>
  }

  return (
    <div style={S.app}>
      <header style={S.hdr}>
        <Link
          href="/"
          style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: 20,
            fontWeight: 700,
            color: C.gold,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            textDecoration: 'none',
          }}
        >
          <span style={{ fontSize: 26 }}>💈</span>
          <div>
            <span>BarberOS</span>
            <span
              style={{
                display: 'block',
                fontSize: 8,
                letterSpacing: 4,
                color: C.muted,
                textTransform: 'uppercase',
                fontWeight: 600,
              }}
            >
              Super Admin
            </span>
          </div>
        </Link>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span style={{ fontSize: 11, color: C.muted }}>{adminEmail}</span>
          <button className="gh" style={{ ...S.btnSm, fontSize: 10 }} onClick={logout}>
            Salir
          </button>
        </div>
      </header>

      <div style={S.wrap}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 24 }}>
          <div>
            <h1 style={S.ttl}>Panel Maestro</h1>
            <p style={S.sub}>Todas tus barberías y suscripciones</p>
          </div>
        </div>

        {/* KPIs */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(6,1fr)', gap: 12, marginBottom: 28 }}>
          {kpis.map((k) => (
            <div key={k.l} style={{ background: C.bg2, border: `1px solid ${C.border}`, borderRadius: 9, padding: 16 }}>
              <div style={{ fontSize: 9, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 7, fontWeight: 700 }}>
                {k.l}
              </div>
              <div style={{ fontSize: 26, fontWeight: 700, color: k.c }}>{k.v}</div>
            </div>
          ))}
        </div>

        {/* Tabla de tenants */}
        <div style={S.card}>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700, marginBottom: 14 }}>
            Barberías ({tenants.length})
          </div>
          {tenants.length === 0 ? (
            <p style={{ color: C.muted, fontSize: 13 }}>Aún no hay barberías registradas.</p>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    {['Barbería', 'Dueño', 'Plan', 'Estado', 'Citas', 'Trial vence', 'Registrada', ''].map((h) => (
                      <th
                        key={h}
                        style={{
                          textAlign: 'left',
                          padding: '8px 10px',
                          fontSize: 9,
                          letterSpacing: 2,
                          color: C.muted,
                          textTransform: 'uppercase',
                          fontWeight: 700,
                          borderBottom: `1px solid ${C.border}`,
                          whiteSpace: 'nowrap',
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((t) => (
                    <tr key={t.id} className="row" style={{ borderBottom: `1px solid ${C.border}` }}>
                      <td style={{ padding: '10px' }}>
                        <div style={{ fontWeight: 700, color: C.cream }}>{t.name}</div>
                        <div style={{ fontSize: 10, color: C.muted, fontFamily: "'Courier New',monospace" }}>
                          {t.slug}
                        </div>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <div style={{ color: C.cream }}>{t.owner_name || '—'}</div>
                        <div style={{ fontSize: 10, color: C.muted }}>{t.owner_email}</div>
                      </td>
                      <td style={{ padding: '10px' }}>
                        <span style={S.badge(t.plan === 'pro' ? C.gold : t.plan === 'business' ? C.purple : C.blue)}>
                          {t.plan}
                        </span>
                      </td>
                      <td style={{ padding: '10px' }}>{statusBadge(t.status)}</td>
                      <td style={{ padding: '10px', textAlign: 'center', color: C.cream }}>
                        {aptCounts[t.id] || 0}
                      </td>
                      <td style={{ padding: '10px', color: C.muted, fontSize: 11 }}>
                        {t.status === 'trial' && t.trial_ends_at
                          ? new Date(t.trial_ends_at).toLocaleDateString('es-SV')
                          : '—'}
                      </td>
                      <td style={{ padding: '10px', color: C.muted, fontSize: 11 }}>
                        {new Date(t.created_at).toLocaleDateString('es-SV')}
                      </td>
                      <td style={{ padding: '10px' }}>
                        <Link
                          href={`/t/${t.slug}`}
                          target="_blank"
                          className="gh"
                          style={{ ...S.btnSm, fontSize: 10, textDecoration: 'none' }}
                        >
                          Ver ↗
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
