'use client'

import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { C, PLANS } from '@/lib/constants'
import { S } from '@/lib/styles'
import type { Tenant } from '@/lib/supabase/types'

const PLAN_PRICE: Record<string, number> = Object.fromEntries(PLANS.map((p) => [p.id, p.price]))

interface Metrics {
  bookingsThisMonth: number
  estEmailsThisMonth: number
  totalRows: number
  totalAppointments: number
  projectRef: string
}

export default function SuperAdminView({
  tenants,
  aptCounts,
  adminEmail,
  metrics,
}: {
  tenants: Tenant[]
  aptCounts: Record<string, number>
  adminEmail: string
  metrics: Metrics
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

        {/* Tablero de capacidad */}
        <CapacityPanel metrics={metrics} activeCount={active.length} tenantCount={tenants.length} />

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

// ─── Tablero de capacidad ─────────────────────────────────────
function CapacityPanel({
  metrics,
  activeCount,
  tenantCount,
}: {
  metrics: Metrics
  activeCount: number
  tenantCount: number
}) {
  const EMAIL_LIMIT = 3000 // Resend free / mes
  const emailPct = Math.min(100, Math.round((metrics.estEmailsThisMonth / EMAIL_LIMIT) * 100))
  const emailColor = emailPct >= 90 ? C.red : emailPct >= 70 ? '#E8A84C' : C.green

  const supabaseUrl = `https://supabase.com/dashboard/project/${metrics.projectRef}`
  const resendUrl = 'https://resend.com/emails'
  const vercelUrl = 'https://vercel.com/dashboard'

  return (
    <div style={{ ...S.card, marginBottom: 24 }}>
      <div
        style={{
          fontSize: 10,
          color: C.muted,
          letterSpacing: 2,
          textTransform: 'uppercase',
          fontWeight: 700,
          marginBottom: 16,
        }}
      >
        Capacidad y límites (plan gratuito)
      </div>

      {/* Gauge correos */}
      <div style={{ marginBottom: 18 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 6 }}>
          <span style={{ color: C.cream }}>Correos este mes (estimado)</span>
          <span>
            <span style={{ color: emailColor, fontWeight: 700 }}>{metrics.estEmailsThisMonth}</span>
            <span style={{ color: C.muted }}> / {EMAIL_LIMIT.toLocaleString()}</span>
          </span>
        </div>
        <div style={{ height: 8, background: C.bg3, borderRadius: 4 }}>
          <div
            style={{
              height: '100%',
              width: `${emailPct}%`,
              background: emailColor,
              borderRadius: 4,
              transition: 'width 0.4s',
            }}
          />
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>
          {emailPct}% del tope mensual · límite diario 100/día. Estimado = 1 aviso al dueño por cita +
          confirmación si el cliente dejó correo. Si pasas 70%, considera Resend Pro (~$20/mes).
        </div>
      </div>

      {/* Stats rápidos */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 18 }}>
        {[
          { l: 'Barberías activas', v: activeCount, hint: `${tenantCount} en total` },
          { l: 'Citas este mes', v: metrics.bookingsThisMonth, hint: 'genera correos' },
          { l: 'Citas totales', v: metrics.totalAppointments, hint: 'histórico' },
          { l: 'Registros en DB', v: metrics.totalRows, hint: 'crece el espacio' },
        ].map((s) => (
          <div key={s.l} style={{ background: C.bg3, border: `1px solid ${C.border}`, borderRadius: 8, padding: 14 }}>
            <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
              {s.l}
            </div>
            <div style={{ fontSize: 22, fontWeight: 700, color: C.cream }}>{s.v}</div>
            <div style={{ fontSize: 10, color: C.muted2, marginTop: 2 }}>{s.hint}</div>
          </div>
        ))}
      </div>

      {/* Cuándo pagar */}
      <div
        style={{
          background: '#1A1400',
          border: '1px solid #3D3000',
          borderRadius: 8,
          padding: '12px 16px',
          marginBottom: 16,
        }}
      >
        <div style={{ fontSize: 11, color: C.gold, fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>
          ⏱ CUÁNDO SUBIR DE PLAN
        </div>
        {[
          ['Vercel Pro ($20/mes)', 'Al cobrar tu 1er cliente (uso comercial + subdominios)'],
          ['Resend Pro ($20/mes)', 'Si la barra de correos pasa 70% o topas 100/día'],
          ['Supabase Pro ($25/mes)', 'Con ~10 clientes de pago (respaldos + sin pausas)'],
        ].map(([k, v]) => (
          <div key={k} style={{ display: 'flex', gap: 10, fontSize: 12, marginBottom: 4 }}>
            <span style={{ color: C.cream, fontWeight: 600, minWidth: 165 }}>{k}</span>
            <span style={{ color: C.muted }}>{v}</span>
          </div>
        ))}
      </div>

      {/* Enlaces a uso real */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <a href={resendUrl} target="_blank" rel="noopener noreferrer" className="gh" style={{ ...S.btnSm, textDecoration: 'none' }}>
          Uso real de correos (Resend) ↗
        </a>
        <a href={supabaseUrl} target="_blank" rel="noopener noreferrer" className="gh" style={{ ...S.btnSm, textDecoration: 'none' }}>
          Uso de base de datos (Supabase) ↗
        </a>
        <a href={vercelUrl} target="_blank" rel="noopener noreferrer" className="gh" style={{ ...S.btnSm, textDecoration: 'none' }}>
          Uso de hosting (Vercel) ↗
        </a>
      </div>
    </div>
  )
}
