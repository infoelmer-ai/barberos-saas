'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { C, PLANS } from '@/lib/constants'
import { S } from '@/lib/styles'
import type { Barber, Profile, Service, Tenant, Appointment } from '@/lib/supabase/types'
import BarberManager from './BarberManager'
import ServiceManager from './ServiceManager'
import AdvancedAnalytics from './AdvancedAnalytics'
import BrandingManager from './BrandingManager'
import DepositManager from './DepositManager'
import NotificationsManager from './NotificationsManager'

interface Props {
  tenant: Tenant
  profile: Profile | null
  barbers: Barber[]
  services: Service[]
  appointments: Appointment[]
  demoMode?: boolean
}

export default function TenantAdmin({
  tenant,
  profile,
  barbers: barbersInit,
  services: servicesInit,
  appointments,
  demoMode = false,
}: Props) {
  const [tab, setTab] = useState<
    'dashboard' | 'analytics' | 'citas' | 'barberos' | 'servicios' | 'pagos' | 'marca'
  >('dashboard')
  const [barbers, setBarbers] = useState(barbersInit)
  const [services, setServices] = useState(servicesInit)
  const [showUpgrade, setShowUpgrade] = useState(false)
  const plan = tenant.plan
  const hasAnalytics = plan === 'pro' || plan === 'business'
  const hasWhiteLabel = plan === 'business'

  async function logout() {
    const supabase = createClient()
    await supabase.auth.signOut()
    window.location.href = '/'
  }

  const today = new Date().toISOString().split('T')[0]
  const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0]

  const active = appointments.filter((a) => a.status === 'confirmed')
  const todayApts = active.filter((a) => a.date === today)
  const weekApts = active.filter((a) => a.date >= weekAgo)
  const totalRev = active.reduce((s, a) => s + Number(a.total), 0)
  const weekRev = weekApts.reduce((s, a) => s + Number(a.total), 0)
  const pendingCharges = appointments.filter((a) => a.pending_charge).length
  const cancelled = appointments.filter((a) => a.status === 'cancelled').length

  const byBarber = useMemo(() => {
    return barbers.map((b) => {
      const list = active.filter((a) => a.barber_id === b.id)
      return {
        ...b,
        count: list.length,
        rev: list.reduce((s, a) => s + Number(a.total), 0),
      }
    })
  }, [active, barbers])

  const bySvc = useMemo(() => {
    return services.map((s) => {
      const list = active.filter((a) => a.service_id === s.id)
      return {
        ...s,
        count: list.length,
        rev: list.reduce((sm, a) => sm + Number(a.total), 0),
      }
    })
  }, [active, services])

  const barberMap = Object.fromEntries(barbers.map((b) => [b.id, b]))
  const svcMap = Object.fromEntries(services.map((s) => [s.id, s]))

  return (
    <div style={S.app}>
      {demoMode && (
        <div
          style={{
            background: `linear-gradient(90deg,${C.gold}22,${C.gold}11)`,
            borderBottom: `1px solid ${C.goldDm}`,
            padding: '10px 28px',
            fontSize: 12,
            color: C.gold,
            textAlign: 'center',
            fontWeight: 600,
            letterSpacing: 1,
          }}
        >
          ⭐ MODO DEMO · estás viendo el panel de una barbería ficticia con datos de ejemplo ·{' '}
          <Link
            href="/onboard"
            style={{ color: C.goldLt, textDecoration: 'underline', marginLeft: 4 }}
          >
            Crear mi propia barbería →
          </Link>
        </div>
      )}
      {/* Header */}
      <header style={S.hdr}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <Link
            href="/"
            style={{ textDecoration: 'none', fontSize: 24 }}
            title="Volver al inicio"
          >
            💈
          </Link>
          <div>
            <div
              style={{
                fontFamily: "'Playfair Display',serif",
                fontWeight: 700,
                fontSize: 18,
                color: C.gold,
              }}
            >
              {tenant.name}
            </div>
            <div
              style={{
                fontSize: 10,
                color: C.muted,
                fontFamily: "'Courier New',monospace",
                letterSpacing: 1,
              }}
            >
              Panel del dueño · {profile?.full_name || tenant.owner_name || 'Owner'}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <span
            style={S.badge(
              tenant.status === 'active' ? C.green : tenant.status === 'trial' ? C.gold : C.red
            )}
          >
            {tenant.status === 'active'
              ? 'Activa'
              : tenant.status === 'trial'
                ? 'Trial'
                : tenant.status === 'past_due'
                  ? 'Pago pendiente'
                  : 'Cancelada'}
          </span>
          {plan !== 'business' && (
            <button
              style={{
                ...S.btnSm,
                fontSize: 10,
                color: C.bg,
                background: `linear-gradient(135deg,${C.gold},${C.goldLt})`,
                border: 'none',
                fontWeight: 700,
              }}
              onClick={() => setShowUpgrade(true)}
            >
              ⬆ Mejorar plan
            </button>
          )}
          <Link
            href={`/t/${tenant.slug}`}
            target="_blank"
            className="gh"
            style={{ ...S.btnSm, fontSize: 10, textDecoration: 'none' }}
          >
            Ver pública ↗
          </Link>
          {!demoMode && (
            <button className="gh" style={{ ...S.btnSm, fontSize: 10 }} onClick={logout}>
              Salir
            </button>
          )}
        </div>
      </header>

      {tenant.status === 'trial' && tenant.trial_ends_at && (
        <div
          style={{
            background: `${C.gold}12`,
            borderBottom: `1px solid ${C.goldDm}`,
            padding: '10px 28px',
            fontSize: 12,
            color: C.gold,
            textAlign: 'center',
            fontWeight: 600,
          }}
        >
          🎁 Prueba gratis · te quedan{' '}
          <strong>
            {Math.max(0, Math.ceil((new Date(tenant.trial_ends_at).getTime() - Date.now()) / 86400000))} días
          </strong>{' '}
          · al terminar se activará tu plan {plan}
        </div>
      )}

      {tenant.status === 'past_due' && (
        <div
          style={{
            background: '#2B1A0D',
            borderBottom: `1px solid #8B6F32`,
            padding: '10px 28px',
            fontSize: 12,
            color: '#E8A84C',
            textAlign: 'center',
            fontWeight: 600,
          }}
        >
          ⚠️ Tu prueba terminó. Reactiva tu cuenta agregando tu método de pago para seguir recibiendo
          reservas.
        </div>
      )}

      <div style={S.wrap}>
        {showUpgrade ? (
          <UpgradePanel
            currentPlan={plan}
            demoMode={demoMode}
            onClose={() => setShowUpgrade(false)}
          />
        ) : (
          <>
        {/* Tabs */}
        <div
          style={{
            display: 'flex',
            gap: 0,
            borderRadius: 6,
            overflow: 'hidden',
            border: `1px solid ${C.border}`,
            marginBottom: 28,
            width: 'fit-content',
          }}
        >
          {(
            [
              { v: 'dashboard', l: 'Dashboard' },
              { v: 'analytics', l: 'Analíticas' },
              { v: 'citas', l: 'Citas' },
              { v: 'barberos', l: 'Barberos' },
              { v: 'servicios', l: 'Servicios' },
              { v: 'pagos', l: 'Ajustes' },
              { v: 'marca', l: 'Marca' },
            ] as const
          ).map((x, i, arr) => (
            <button
              key={x.v}
              onClick={() => setTab(x.v)}
              style={{
                padding: '9px 22px',
                background: tab === x.v ? `${C.gold}14` : C.bg2,
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: i < arr.length - 1 ? `1px solid ${C.border}` : 'none',
                borderBottom: `2px solid ${tab === x.v ? C.gold : C.border}`,
                color: tab === x.v ? C.gold : C.muted,
                cursor: 'pointer',
                fontSize: 11,
                fontWeight: 700,
                letterSpacing: 1.5,
                textTransform: 'uppercase',
                fontFamily: 'inherit',
              }}
            >
              {x.l}
              {((x.v === 'analytics' && !hasAnalytics) || (x.v === 'marca' && !hasWhiteLabel)) && (
                <span style={{ marginLeft: 5, fontSize: 9 }}>🔒</span>
              )}
            </button>
          ))}
        </div>

        {tab === 'dashboard' && (
          <Dashboard
            todayApts={todayApts}
            weekApts={weekApts}
            active={active}
            totalRev={totalRev}
            weekRev={weekRev}
            cancelled={cancelled}
            pendingCharges={pendingCharges}
            byBarber={byBarber}
            bySvc={bySvc}
          />
        )}

        {tab === 'analytics' &&
          (hasAnalytics ? (
            <AdvancedAnalytics
              appointments={appointments}
              barbers={barbers}
              services={services}
              tenantSlug={tenant.slug}
            />
          ) : (
            <AnalyticsUpsell onUpgrade={() => setShowUpgrade(true)} />
          ))}

        {tab === 'citas' && (
          <CitasTable
            appointments={appointments}
            barberMap={barberMap}
            svcMap={svcMap}
          />
        )}

        {tab === 'barberos' && (
          <BarberManager barbers={barbers} setBarbers={setBarbers} demoMode={demoMode} />
        )}
        {tab === 'servicios' && (
          <ServiceManager services={services} setServices={setServices} demoMode={demoMode} />
        )}

        {tab === 'pagos' && (
          <>
            <DepositManager tenant={tenant} services={services} demoMode={demoMode} />
            <NotificationsManager tenant={tenant} demoMode={demoMode} />
          </>
        )}

        {tab === 'marca' &&
          (hasWhiteLabel ? (
            <BrandingManager tenant={tenant} demoMode={demoMode} />
          ) : (
            <WhiteLabelUpsell onUpgrade={() => setShowUpgrade(true)} />
          ))}
          </>
        )}
      </div>
    </div>
  )
}

// ─── Upsell de marca blanca (planes < Business) ───────────────
function WhiteLabelUpsell({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div style={{ ...S.card, textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>🏷️</div>
      <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: C.gold, marginBottom: 10 }}>
        Marca blanca
      </h3>
      <p style={{ color: C.muted, fontSize: 14, maxWidth: 440, margin: '0 auto 20px', lineHeight: 1.7 }}>
        Pon tu propio logo y color en tu página de reservas. Tus clientes verán tu marca, sin
        mención a BarberOS. Disponible en el plan <strong style={{ color: C.cream }}>Business</strong>.
      </p>
      <button style={S.btnG} onClick={onUpgrade}>
        ⬆ Mejorar a Business
      </button>
    </div>
  )
}

// ─── Upsell de analíticas (plan Starter) ──────────────────────
function AnalyticsUpsell({ onUpgrade }: { onUpgrade: () => void }) {
  return (
    <div style={{ ...S.card, textAlign: 'center', padding: '48px 24px' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>📈</div>
      <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 24, color: C.gold, marginBottom: 10 }}>
        Analíticas avanzadas
      </h3>
      <p style={{ color: C.muted, fontSize: 14, maxWidth: 440, margin: '0 auto 20px', lineHeight: 1.7 }}>
        Tendencia de ingresos, horas y días pico, retención de clientes, comparativa mensual y
        exportación a Excel. Disponible en los planes <strong style={{ color: C.cream }}>Pro</strong> y{' '}
        <strong style={{ color: C.cream }}>Business</strong>.
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(2,1fr)',
          gap: 10,
          maxWidth: 420,
          margin: '0 auto',
          textAlign: 'left',
        }}
      >
        {['📊 Tendencia de ingresos', '⏰ Horas y días pico', '🔁 Retención de clientes', '📥 Exportar a Excel'].map(
          (f) => (
            <div
              key={f}
              style={{
                background: C.bg3,
                border: `1px solid ${C.border}`,
                borderRadius: 8,
                padding: '10px 14px',
                fontSize: 12,
                color: C.cream,
              }}
            >
              {f}
            </div>
          )
        )}
      </div>
      <button style={{ ...S.btnG, marginTop: 22 }} onClick={onUpgrade}>
        ⬆ Mejorar mi plan
      </button>
    </div>
  )
}

// ─── Panel de mejora de plan ──────────────────────────────────
function UpgradePanel({
  currentPlan,
  demoMode,
  onClose,
}: {
  currentPlan: string
  demoMode: boolean
  onClose: () => void
}) {
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function changePlan(plan: string) {
    if (demoMode) return
    setBusy(plan)
    setError(null)
    const res = await fetch('/api/plan', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ plan }),
    })
    const json = await res.json()
    if (!res.ok) {
      setError(json.error || 'No se pudo cambiar el plan')
      setBusy(null)
      return
    }
    // Recargar para reflejar las nuevas funciones desbloqueadas
    window.location.reload()
  }

  const order: Record<string, number> = { starter: 0, pro: 1, business: 2 }

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <h2 style={S.ttl}>Elige tu plan</h2>
          <p style={{ ...S.sub, marginBottom: 0 }}>
            El cambio desbloquea las funciones al instante. Durante tu prueba no se cobra nada.
          </p>
        </div>
        <button className="gh" style={S.btnGh} onClick={onClose}>
          ← Volver
        </button>
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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        {PLANS.map((p) => {
          const isCurrent = p.id === currentPlan
          const isUpgrade = order[p.id] > order[currentPlan]
          const features = [
            p.barbers >= 99 ? 'Barberos ilimitados' : `Hasta ${p.barbers} barberos`,
            `${p.locations > 1 ? 'ubicaciones' : 'ubicación'}: ${p.locations}`,
            'Agendamiento + panel',
            ...(p.analytics ? ['Analíticas avanzadas'] : []),
            ...(p.whiteLabel ? ['Marca blanca'] : []),
          ]
          return (
            <div
              key={p.id}
              style={{
                background: isCurrent ? `${C.gold}0C` : C.bg2,
                border: `2px solid ${isCurrent ? C.gold : C.border}`,
                borderRadius: 10,
                padding: 24,
                position: 'relative',
              }}
            >
              {isCurrent && (
                <div
                  style={{
                    position: 'absolute',
                    top: -11,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: C.gold,
                    color: C.bg,
                    fontSize: 9,
                    fontWeight: 700,
                    letterSpacing: 1.5,
                    textTransform: 'uppercase',
                    padding: '3px 12px',
                    borderRadius: 20,
                    whiteSpace: 'nowrap',
                  }}
                >
                  Tu plan actual
                </div>
              )}
              <div style={{ fontSize: 11, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 600, marginBottom: 8 }}>
                {p.name}
              </div>
              <div style={{ fontSize: 38, fontWeight: 700, color: isCurrent ? C.gold : C.cream, marginBottom: 12 }}>
                ${p.price}
                <span style={{ fontSize: 13, color: C.muted, fontWeight: 400 }}>/mes</span>
              </div>
              <div style={{ display: 'grid', gap: 7, marginBottom: 20 }}>
                {features.map((f) => (
                  <div key={f} style={{ display: 'flex', gap: 7, fontSize: 12, alignItems: 'center' }}>
                    <span style={{ color: C.green }}>✓</span>
                    <span style={{ color: C.cream }}>{f}</span>
                  </div>
                ))}
              </div>
              {isCurrent ? (
                <button style={{ ...S.btnGh, width: '100%', cursor: 'default', opacity: 0.6 }} disabled>
                  Plan actual
                </button>
              ) : (
                <button
                  style={{
                    ...(isUpgrade ? S.btnG : S.btnGh),
                    width: '100%',
                    opacity: busy ? 0.5 : 1,
                  }}
                  onClick={() => changePlan(p.id)}
                  disabled={!!busy || demoMode}
                >
                  {busy === p.id ? 'Cambiando...' : isUpgrade ? `Mejorar a ${p.name}` : `Cambiar a ${p.name}`}
                </button>
              )}
            </div>
          )
        })}
      </div>

      {demoMode ? (
        <p style={{ fontSize: 11, color: C.muted2, marginTop: 18, textAlign: 'center' }}>
          En modo demo no se puede cambiar de plan.
        </p>
      ) : (
        <p style={{ fontSize: 11, color: C.muted, marginTop: 18, textAlign: 'center' }}>
          El plan que elijas es el que se cobrará al terminar tu prueba de 14 días.
        </p>
      )}
    </div>
  )
}

// ─── Dashboard ─────────────────────────────────────────────────
function Dashboard({
  todayApts,
  weekApts,
  active,
  totalRev,
  weekRev,
  cancelled,
  pendingCharges,
  byBarber,
  bySvc,
}: {
  todayApts: Appointment[]
  weekApts: Appointment[]
  active: Appointment[]
  totalRev: number
  weekRev: number
  cancelled: number
  pendingCharges: number
  byBarber: (Barber & { count: number; rev: number })[]
  bySvc: (Service & { count: number; rev: number })[]
}) {
  const kpis = [
    { l: 'Citas hoy', v: todayApts.length, c: C.gold },
    { l: 'Citas (7 días)', v: weekApts.length, c: C.blue },
    { l: 'Ingresos (7 días)', v: `$${weekRev.toFixed(0)}`, c: C.green },
    { l: 'Ingresos totales', v: `$${totalRev.toFixed(0)}`, c: C.green },
    { l: 'Canceladas', v: cancelled, c: C.red },
    { l: 'Cargos pendientes', v: pendingCharges, c: '#E8A84C' },
  ]

  const maxRev = Math.max(...byBarber.map((b) => b.rev), 1)
  const maxSvcRev = Math.max(...bySvc.map((s) => s.rev), 1)

  return (
    <div>
      {/* KPIs */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(6,1fr)',
          gap: 12,
          marginBottom: 24,
        }}
      >
        {kpis.map((k) => (
          <div
            key={k.l}
            style={{
              background: C.bg2,
              border: `1px solid ${C.border}`,
              borderRadius: 9,
              padding: 16,
            }}
          >
            <div
              style={{
                fontSize: 9,
                color: C.muted,
                letterSpacing: 2,
                textTransform: 'uppercase',
                marginBottom: 7,
                fontWeight: 700,
              }}
            >
              {k.l}
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: k.c }}>{k.v}</div>
          </div>
        ))}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 18,
          marginBottom: 22,
        }}
      >
        <div style={S.card}>
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
            Ingresos por Barbero
          </div>
          {byBarber.length === 0 ? (
            <p style={{ fontSize: 13, color: C.muted }}>Aún no tienes barberos.</p>
          ) : (
            byBarber.map((b) => (
              <div key={b.id} style={{ marginBottom: 14 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    marginBottom: 5,
                    alignItems: 'center',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                    <div
                      style={{
                        width: 22,
                        height: 22,
                        borderRadius: '50%',
                        background: b.color,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 8,
                        fontWeight: 700,
                        color: '#fff',
                      }}
                    >
                      {b.initials || b.name.slice(0, 2).toUpperCase()}
                    </div>
                    <span style={{ color: C.cream }}>{b.name}</span>
                  </div>
                  <span>
                    <span style={{ color: C.gold, fontWeight: 700 }}>${b.rev.toFixed(0)}</span>{' '}
                    <span style={{ color: C.muted, fontSize: 11 }}>{b.count} citas</span>
                  </span>
                </div>
                <div style={{ height: 5, background: C.bg3, borderRadius: 3 }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(b.rev / maxRev) * 100}%`,
                      background: `linear-gradient(90deg,${C.goldDm},${C.gold})`,
                      borderRadius: 3,
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>

        <div style={S.card}>
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
            Ingresos por Servicio
          </div>
          {bySvc.length === 0 ? (
            <p style={{ fontSize: 13, color: C.muted }}>Aún no tienes servicios.</p>
          ) : (
            bySvc.map((s) => (
              <div key={s.id} style={{ marginBottom: 14 }}>
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    fontSize: 12,
                    marginBottom: 5,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>{s.emoji || '✂️'}</span>
                    <span style={{ color: C.cream }}>{s.name}</span>
                  </div>
                  <span>
                    <span style={{ color: C.gold, fontWeight: 700 }}>${s.rev.toFixed(0)}</span>{' '}
                    <span style={{ color: C.muted, fontSize: 11 }}>{s.count} citas</span>
                  </span>
                </div>
                <div style={{ height: 5, background: C.bg3, borderRadius: 3 }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${(s.rev / maxSvcRev) * 100}%`,
                      background: `linear-gradient(90deg,${C.goldDm},${C.gold})`,
                      borderRadius: 3,
                    }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Próximas citas hoy */}
      <div style={S.card}>
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
          Citas de Hoy ({todayApts.length})
        </div>
        {todayApts.length === 0 ? (
          <p style={{ color: C.muted, fontSize: 13 }}>Sin citas hoy.</p>
        ) : (
          <div style={{ display: 'grid', gap: 10 }}>
            {todayApts
              .sort((a, b) => a.time.localeCompare(b.time))
              .map((apt) => (
                <div
                  key={apt.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    background: C.bg3,
                    borderRadius: 6,
                    padding: '10px 14px',
                    fontSize: 13,
                  }}
                >
                  <div>
                    <strong style={{ color: C.cream }}>{apt.time.slice(0, 5)}</strong> · {apt.client_name}
                  </div>
                  <div style={{ color: C.gold, fontWeight: 700 }}>${Number(apt.total).toFixed(2)}</div>
                </div>
              ))}
          </div>
        )}
        {active.length > todayApts.length && (
          <p style={{ fontSize: 11, color: C.muted, marginTop: 16, textAlign: 'center' }}>
            Total de citas confirmadas: {active.length}. Ve la pestaña "Citas" para verlas todas.
          </p>
        )}
      </div>
    </div>
  )
}

// ─── Citas table ──────────────────────────────────────────────
function CitasTable({
  appointments,
  barberMap,
  svcMap,
}: {
  appointments: Appointment[]
  barberMap: Record<string, Barber>
  svcMap: Record<string, Service>
}) {
  return (
    <div style={S.card}>
      <div
        style={{
          fontSize: 10,
          color: C.muted,
          letterSpacing: 2,
          textTransform: 'uppercase',
          fontWeight: 700,
          marginBottom: 14,
        }}
      >
        Todas las Citas ({appointments.length})
      </div>
      {appointments.length === 0 ? (
        <p style={{ color: C.muted, fontSize: 13 }}>Aún no hay citas. Comparte tu enlace público.</p>
      ) : (
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr>
                {['Cliente', 'Barbero', 'Servicio', 'Fecha', 'Hora', 'Monto', 'Estado'].map((h) => (
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
              {appointments.map((apt) => {
                const barber = barberMap[apt.barber_id]
                const svc = svcMap[apt.service_id]
                return (
                  <tr
                    key={apt.id}
                    className="row"
                    style={{
                      borderBottom: `1px solid ${C.border}`,
                      opacity: apt.status === 'cancelled' ? 0.5 : 1,
                    }}
                  >
                    <td style={{ padding: '10px' }}>
                      <div style={{ fontWeight: 600, color: C.cream }}>{apt.client_name}</div>
                      <div style={{ fontSize: 10, color: C.muted }}>{apt.client_phone}</div>
                    </td>
                    <td style={{ padding: '10px' }}>
                      {barber ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <div
                            style={{
                              width: 20,
                              height: 20,
                              borderRadius: '50%',
                              background: barber.color,
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: 8,
                              fontWeight: 700,
                              color: '#fff',
                            }}
                          >
                            {barber.initials || barber.name.slice(0, 2).toUpperCase()}
                          </div>
                          {barber.name}
                        </div>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td style={{ padding: '10px' }}>
                      {svc?.emoji} {svc?.name || '—'}
                    </td>
                    <td style={{ padding: '10px', whiteSpace: 'nowrap' }}>{apt.date}</td>
                    <td style={{ padding: '10px' }}>{apt.time.slice(0, 5)}</td>
                    <td style={{ padding: '10px', color: C.gold, fontWeight: 700 }}>
                      ${Number(apt.total).toFixed(2)}
                    </td>
                    <td style={{ padding: '10px' }}>
                      <span style={S.badge(apt.status === 'confirmed' ? C.green : '#555')}>
                        {apt.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                      </span>
                      {apt.pending_charge && (
                        <span style={{ display: 'block', fontSize: 9, color: C.gold, marginTop: 3 }}>
                          ⚠️ Cargo pendiente
                        </span>
                      )}
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}


