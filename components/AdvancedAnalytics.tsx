'use client'

import { useMemo } from 'react'
import { C } from '@/lib/constants'
import { S } from '@/lib/styles'
import { pad2 } from '@/lib/utils'
import type { Appointment, Barber, Service } from '@/lib/supabase/types'

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']

export default function AdvancedAnalytics({
  appointments,
  barbers,
  services,
  tenantSlug,
}: {
  appointments: Appointment[]
  barbers: Barber[]
  services: Service[]
  tenantSlug: string
}) {
  const barberMap = useMemo(() => Object.fromEntries(barbers.map((b) => [b.id, b])), [barbers])
  const svcMap = useMemo(() => Object.fromEntries(services.map((s) => [s.id, s])), [services])
  const confirmed = useMemo(() => appointments.filter((a) => a.status === 'confirmed'), [appointments])

  // ── Tendencia: últimos 14 días ──
  const revByDay = useMemo(() => {
    const days: { date: string; label: string; rev: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      const ds = d.toISOString().split('T')[0]
      const rev = confirmed
        .filter((a) => a.date === ds)
        .reduce((s, a) => s + Number(a.total), 0)
      days.push({ date: ds, label: `${d.getDate()}`, rev })
    }
    return days
  }, [confirmed])
  const maxDayRev = Math.max(...revByDay.map((d) => d.rev), 1)

  // ── Comparativa de período: este mes vs anterior ──
  const period = useMemo(() => {
    const now = new Date()
    const thisKey = `${now.getFullYear()}-${pad2(now.getMonth() + 1)}`
    const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const lastKey = `${lm.getFullYear()}-${pad2(lm.getMonth() + 1)}`
    const thisM = confirmed.filter((a) => a.date.startsWith(thisKey))
    const lastM = confirmed.filter((a) => a.date.startsWith(lastKey))
    const revThis = thisM.reduce((s, a) => s + Number(a.total), 0)
    const revLast = lastM.reduce((s, a) => s + Number(a.total), 0)
    const pct = revLast > 0 ? Math.round(((revThis - revLast) / revLast) * 100) : null
    return { revThis, revLast, citThis: thisM.length, citLast: lastM.length, pct }
  }, [confirmed])

  // ── Horas pico (9-17) ──
  const byHour = useMemo(() => {
    const map: Record<number, number> = {}
    for (let h = 9; h <= 17; h++) map[h] = 0
    confirmed.forEach((a) => {
      const h = Number(a.time.slice(0, 2))
      if (h in map) map[h]++
    })
    return Object.entries(map).map(([h, n]) => ({ hour: Number(h), n }))
  }, [confirmed])
  const maxHour = Math.max(...byHour.map((h) => h.n), 1)

  // ── Días pico ──
  const byWeekday = useMemo(() => {
    const wd = [0, 0, 0, 0, 0, 0, 0]
    confirmed.forEach((a) => {
      const day = new Date(a.date + 'T12:00:00').getDay()
      wd[day]++
    })
    // Orden Lun..Dom
    return [1, 2, 3, 4, 5, 6, 0].map((i) => ({ label: WEEKDAYS[i], n: wd[i] }))
  }, [confirmed])
  const maxWd = Math.max(...byWeekday.map((d) => d.n), 1)

  // ── Retención ──
  const retention = useMemo(() => {
    const byPhone: Record<string, number> = {}
    confirmed.forEach((a) => {
      byPhone[a.client_phone] = (byPhone[a.client_phone] || 0) + 1
    })
    const unique = Object.keys(byPhone).length
    const returning = Object.values(byPhone).filter((n) => n >= 2).length
    return { unique, returning, nuevos: unique - returning, pct: unique ? Math.round((returning / unique) * 100) : 0 }
  }, [confirmed])

  // ── Tasa de cancelación ──
  const cancel = useMemo(() => {
    const cancelled = appointments.filter((a) => a.status === 'cancelled').length
    const total = confirmed.length + cancelled
    return { cancelled, pct: total ? Math.round((cancelled / total) * 100) : 0 }
  }, [appointments, confirmed])

  function exportCSV() {
    const headers = ['Fecha', 'Hora', 'Cliente', 'Telefono', 'Barbero', 'Servicio', 'Monto', 'Estado']
    const rows = [...appointments]
      .sort((a, b) => b.date.localeCompare(a.date) || a.time.localeCompare(b.time))
      .map((a) => [
        a.date,
        a.time.slice(0, 5),
        a.client_name,
        a.client_phone,
        barberMap[a.barber_id]?.name || '',
        svcMap[a.service_id]?.name || '',
        Number(a.total).toFixed(2),
        a.status,
      ])
    const csv = [headers, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n')
    const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `citas-${tenantSlug}-${new Date().toISOString().split('T')[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const sectionTitle = (t: string): React.CSSProperties => ({
    fontSize: 10,
    color: C.muted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: 700,
    marginBottom: 16,
  })

  return (
    <div>
      {/* Header + export */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
        <div style={{ fontSize: 13, color: C.muted }}>
          Métricas basadas en {confirmed.length} citas confirmadas
        </div>
        <button style={{ ...S.btnSm, color: C.gold, borderColor: C.goldDm }} onClick={exportCSV}>
          ⬇ Exportar a Excel (CSV)
        </button>
      </div>

      {/* Comparativa de período */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 18 }}>
        <div style={{ ...S.card, padding: 18 }}>
          <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
            Ingresos este mes
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: C.green }}>${period.revThis.toFixed(0)}</div>
          {period.pct !== null && (
            <div style={{ fontSize: 11, color: period.pct >= 0 ? C.green : C.red, marginTop: 4 }}>
              {period.pct >= 0 ? '▲' : '▼'} {Math.abs(period.pct)}% vs mes pasado (${period.revLast.toFixed(0)})
            </div>
          )}
        </div>
        <div style={{ ...S.card, padding: 18 }}>
          <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
            Citas este mes
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: C.gold }}>{period.citThis}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{period.citLast} el mes pasado</div>
        </div>
        <div style={{ ...S.card, padding: 18 }}>
          <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
            Tasa de cancelación
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: cancel.pct > 20 ? C.red : C.cream }}>{cancel.pct}%</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{cancel.cancelled} canceladas</div>
        </div>
      </div>

      {/* Tendencia de ingresos 14 días */}
      <div style={{ ...S.card, marginBottom: 18 }}>
        <div style={sectionTitle('t')}>Ingresos · últimos 14 días</div>
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 6, height: 120 }}>
          {revByDay.map((d) => (
            <div key={d.date} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}>
              <div style={{ fontSize: 9, color: C.muted }}>{d.rev > 0 ? `$${d.rev.toFixed(0)}` : ''}</div>
              <div
                style={{
                  width: '100%',
                  height: `${Math.max((d.rev / maxDayRev) * 90, d.rev > 0 ? 4 : 0)}px`,
                  background: `linear-gradient(180deg,${C.gold},${C.goldDm})`,
                  borderRadius: '3px 3px 0 0',
                  minHeight: d.rev > 0 ? 4 : 0,
                }}
              />
              <div style={{ fontSize: 9, color: C.muted2 }}>{d.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Horas pico + Días pico */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
        <div style={S.card}>
          <div style={sectionTitle('t')}>Horas pico</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 5, height: 100 }}>
            {byHour.map((h) => (
              <div key={h.hour} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div
                  style={{
                    width: '100%',
                    height: `${Math.max((h.n / maxHour) * 78, h.n > 0 ? 4 : 0)}px`,
                    background: h.n === maxHour && h.n > 0 ? C.gold : C.goldDm,
                    borderRadius: '3px 3px 0 0',
                  }}
                />
                <div style={{ fontSize: 9, color: C.muted2 }}>{h.hour}h</div>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 10 }}>
            Tu hora más ocupada te dice cuándo necesitas más barberos.
          </div>
        </div>

        <div style={S.card}>
          <div style={sectionTitle('t')}>Días más ocupados</div>
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: 8, height: 100 }}>
            {byWeekday.map((d) => (
              <div key={d.label} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3 }}>
                <div style={{ fontSize: 9, color: C.muted }}>{d.n > 0 ? d.n : ''}</div>
                <div
                  style={{
                    width: '100%',
                    height: `${Math.max((d.n / maxWd) * 64, d.n > 0 ? 4 : 0)}px`,
                    background: d.n === maxWd && d.n > 0 ? C.gold : C.goldDm,
                    borderRadius: '3px 3px 0 0',
                  }}
                />
                <div style={{ fontSize: 9, color: C.muted2 }}>{d.label}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Retención */}
      <div style={S.card}>
        <div style={sectionTitle('t')}>Retención de clientes</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 36, fontWeight: 700, color: C.gold }}>{retention.pct}%</div>
            <div style={{ fontSize: 11, color: C.muted }}>clientes que vuelven</div>
          </div>
          <div style={{ flex: 1, minWidth: 220 }}>
            <div style={{ display: 'flex', height: 14, borderRadius: 7, overflow: 'hidden', marginBottom: 8 }}>
              <div style={{ width: `${retention.pct}%`, background: C.gold }} />
              <div style={{ width: `${100 - retention.pct}%`, background: C.bg4 }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12 }}>
              <span style={{ color: C.cream }}>
                <span style={{ color: C.gold, fontWeight: 700 }}>{retention.returning}</span> recurrentes
              </span>
              <span style={{ color: C.cream }}>
                <span style={{ fontWeight: 700 }}>{retention.nuevos}</span> nuevos
              </span>
              <span style={{ color: C.muted }}>{retention.unique} clientes únicos</span>
            </div>
          </div>
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 14 }}>
          Un cliente que vuelve vale mucho más que uno nuevo. Si este % es bajo, enfócate en
          recordatorios y promociones de regreso.
        </div>
      </div>
    </div>
  )
}
