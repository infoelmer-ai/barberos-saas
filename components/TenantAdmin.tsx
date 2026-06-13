'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import { C } from '@/lib/constants'
import { S } from '@/lib/styles'
import type { Barber, Profile, Service, Tenant, Appointment } from '@/lib/supabase/types'
import BarberManager from './BarberManager'
import ServiceManager from './ServiceManager'

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
  const [tab, setTab] = useState<'dashboard' | 'citas' | 'barberos' | 'servicios'>('dashboard')
  const [barbers, setBarbers] = useState(barbersInit)
  const [services, setServices] = useState(servicesInit)

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

      <div style={S.wrap}>
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
              { v: 'citas', l: 'Citas' },
              { v: 'barberos', l: 'Barberos' },
              { v: 'servicios', l: 'Servicios' },
            ] as const
          ).map((x, i) => (
            <button
              key={x.v}
              onClick={() => setTab(x.v)}
              style={{
                padding: '9px 22px',
                background: tab === x.v ? `${C.gold}14` : C.bg2,
                borderTop: 'none',
                borderLeft: 'none',
                borderRight: i < 3 ? `1px solid ${C.border}` : 'none',
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
      </div>
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


