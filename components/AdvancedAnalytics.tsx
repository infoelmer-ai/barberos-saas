'use client'

import { useMemo, useState } from 'react'
import { C } from '@/lib/constants'
import { S } from '@/lib/styles'
import { fmtDate } from '@/lib/utils'
import type { Appointment, Barber, Service } from '@/lib/supabase/types'

const WEEKDAYS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const MONTHS = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic']

const isoOf = (d: Date) => d.toISOString().split('T')[0]
const addDays = (s: string, n: number) => {
  const d = new Date(s + 'T12:00:00')
  d.setDate(d.getDate() + n)
  return isoOf(d)
}
const diffDays = (from: string, to: string) =>
  Math.round((new Date(to + 'T12:00:00').getTime() - new Date(from + 'T12:00:00').getTime()) / 86400000) + 1

type Preset = '7d' | '30d' | 'thisMonth' | 'lastMonth' | '90d' | 'all' | 'custom'

const PRESETS: { id: Preset; label: string }[] = [
  { id: '7d', label: '7 días' },
  { id: '30d', label: '30 días' },
  { id: '90d', label: '90 días' },
  { id: 'thisMonth', label: 'Este mes' },
  { id: 'lastMonth', label: 'Mes pasado' },
  { id: 'all', label: 'Todo' },
]

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
  const today = isoOf(new Date())
  const earliest = useMemo(
    () => appointments.reduce((m, a) => (a.date < m ? a.date : m), today),
    [appointments, today]
  )

  const [preset, setPreset] = useState<Preset>('30d')
  const [from, setFrom] = useState(addDays(today, -29))
  const [to, setTo] = useState(today)

  function applyPreset(p: Preset) {
    setPreset(p)
    const now = new Date()
    if (p === '7d') {
      setFrom(addDays(today, -6))
      setTo(today)
    } else if (p === '30d') {
      setFrom(addDays(today, -29))
      setTo(today)
    } else if (p === '90d') {
      setFrom(addDays(today, -89))
      setTo(today)
    } else if (p === 'thisMonth') {
      setFrom(isoOf(new Date(now.getFullYear(), now.getMonth(), 1)))
      setTo(today)
    } else if (p === 'lastMonth') {
      setFrom(isoOf(new Date(now.getFullYear(), now.getMonth() - 1, 1)))
      setTo(isoOf(new Date(now.getFullYear(), now.getMonth(), 0)))
    } else if (p === 'all') {
      setFrom(earliest)
      setTo(today)
    }
  }

  const barberMap = useMemo(() => Object.fromEntries(barbers.map((b) => [b.id, b])), [barbers])
  const svcMap = useMemo(() => Object.fromEntries(services.map((s) => [s.id, s])), [services])

  const filtered = useMemo(
    () => appointments.filter((a) => a.date >= from && a.date <= to),
    [appointments, from, to]
  )
  const confirmed = useMemo(() => filtered.filter((a) => a.status === 'confirmed'), [filtered])

  // ── Comparativa: período seleccionado vs período anterior de igual duración ──
  const period = useMemo(() => {
    const len = diffDays(from, to)
    const prevTo = addDays(from, -1)
    const prevFrom = addDays(prevTo, -(len - 1))
    const prev = appointments.filter(
      (a) => a.status === 'confirmed' && a.date >= prevFrom && a.date <= prevTo
    )
    const revThis = confirmed.reduce((s, a) => s + Number(a.total), 0)
    const revPrev = prev.reduce((s, a) => s + Number(a.total), 0)
    const pct = revPrev > 0 ? Math.round(((revThis - revPrev) / revPrev) * 100) : null
    return { revThis, revPrev, citThis: confirmed.length, citPrev: prev.length, pct, len }
  }, [appointments, confirmed, from, to])

  // ── Tendencia adaptativa (día / semana / mes) ──
  const trend = useMemo(() => {
    const len = diffDays(from, to)
    const buckets: { label: string; rev: number }[] = []
    const sumRange = (a: string, b: string) =>
      confirmed.filter((x) => x.date >= a && x.date <= b).reduce((s, x) => s + Number(x.total), 0)

    if (len <= 31) {
      for (let d = from; d <= to; d = addDays(d, 1)) {
        buckets.push({ label: d.slice(8, 10), rev: sumRange(d, d) })
      }
    } else if (len <= 120) {
      for (let start = from; start <= to; start = addDays(start, 7)) {
        const end = addDays(start, 6) > to ? to : addDays(start, 6)
        buckets.push({ label: `${start.slice(8, 10)}/${start.slice(5, 7)}`, rev: sumRange(start, end) })
      }
    } else {
      // mensual
      const seen: Record<string, number> = {}
      confirmed.forEach((a) => {
        const key = a.date.slice(0, 7)
        seen[key] = (seen[key] || 0) + Number(a.total)
      })
      // Recorrer meses del rango en orden
      const start = new Date(from + 'T12:00:00')
      const end = new Date(to + 'T12:00:00')
      const cur = new Date(start.getFullYear(), start.getMonth(), 1)
      while (cur <= end) {
        const key = `${cur.getFullYear()}-${String(cur.getMonth() + 1).padStart(2, '0')}`
        buckets.push({ label: MONTHS[cur.getMonth()], rev: seen[key] || 0 })
        cur.setMonth(cur.getMonth() + 1)
      }
    }
    return buckets
  }, [confirmed, from, to])
  const maxTrend = Math.max(...trend.map((b) => b.rev), 1)
  const trendMode = period.len <= 31 ? 'por día' : period.len <= 120 ? 'por semana' : 'por mes'

  // ── Horas pico ──
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
      wd[new Date(a.date + 'T12:00:00').getDay()]++
    })
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

  // ── Cancelación ──
  const cancel = useMemo(() => {
    const cancelled = filtered.filter((a) => a.status === 'cancelled').length
    const total = confirmed.length + cancelled
    return { cancelled, pct: total ? Math.round((cancelled / total) * 100) : 0 }
  }, [filtered, confirmed])

  function exportCSV() {
    const headers = ['Fecha', 'Hora', 'Cliente', 'Telefono', 'Barbero', 'Servicio', 'Monto', 'Estado']
    const rows = [...filtered]
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
    link.download = `citas-${tenantSlug}-${from}_a_${to}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const sectionTitle: React.CSSProperties = {
    fontSize: 10,
    color: C.muted,
    letterSpacing: 2,
    textTransform: 'uppercase',
    fontWeight: 700,
    marginBottom: 16,
  }

  return (
    <div>
      {/* Selector de rango */}
      <div style={{ ...S.card, marginBottom: 18 }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center', marginBottom: 14 }}>
          {PRESETS.map((p) => {
            const on = preset === p.id
            return (
              <button
                key={p.id}
                onClick={() => applyPreset(p.id)}
                style={{
                  ...S.btnSm,
                  fontSize: 11,
                  border: `1px solid ${on ? C.gold : C.border2}`,
                  color: on ? C.gold : C.muted,
                  background: on ? `${C.gold}14` : 'transparent',
                }}
              >
                {p.label}
              </button>
            )
          })}
        </div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, alignItems: 'flex-end' }}>
          <div>
            <label style={S.lbl}>Desde</label>
            <input
              type="date"
              style={{ ...S.inp, width: 'auto' }}
              value={from}
              max={to}
              onChange={(e) => {
                setFrom(e.target.value)
                setPreset('custom')
              }}
            />
          </div>
          <div>
            <label style={S.lbl}>Hasta</label>
            <input
              type="date"
              style={{ ...S.inp, width: 'auto' }}
              value={to}
              min={from}
              max={today}
              onChange={(e) => {
                setTo(e.target.value)
                setPreset('custom')
              }}
            />
          </div>
          <div style={{ flex: 1 }} />
          <button style={{ ...S.btnSm, color: C.gold, borderColor: C.goldDm }} onClick={exportCSV}>
            ⬇ Exportar período a Excel (CSV)
          </button>
        </div>
        <div style={{ fontSize: 11, color: C.muted, marginTop: 10 }}>
          Mostrando <strong style={{ color: C.cream }}>{fmtDate(from)}</strong> a{' '}
          <strong style={{ color: C.cream }}>{fmtDate(to)}</strong> · {period.len} día
          {period.len !== 1 ? 's' : ''} · {confirmed.length} citas confirmadas
        </div>
      </div>

      {/* Comparativa */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12, marginBottom: 18 }}>
        <div style={{ ...S.card, padding: 18 }}>
          <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
            Ingresos del período
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: C.green }}>${period.revThis.toFixed(0)}</div>
          {period.pct !== null && (
            <div style={{ fontSize: 11, color: period.pct >= 0 ? C.green : C.red, marginTop: 4 }}>
              {period.pct >= 0 ? '▲' : '▼'} {Math.abs(period.pct)}% vs período anterior (${period.revPrev.toFixed(0)})
            </div>
          )}
        </div>
        <div style={{ ...S.card, padding: 18 }}>
          <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
            Citas del período
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: C.gold }}>{period.citThis}</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{period.citPrev} en el período anterior</div>
        </div>
        <div style={{ ...S.card, padding: 18 }}>
          <div style={{ fontSize: 9, color: C.muted, letterSpacing: 1.5, textTransform: 'uppercase', fontWeight: 700, marginBottom: 8 }}>
            Tasa de cancelación
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: cancel.pct > 20 ? C.red : C.cream }}>{cancel.pct}%</div>
          <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>{cancel.cancelled} canceladas</div>
        </div>
      </div>

      {/* Tendencia */}
      <div style={{ ...S.card, marginBottom: 18 }}>
        <div style={sectionTitle}>Ingresos · {trendMode}</div>
        {trend.length === 0 ? (
          <p style={{ fontSize: 13, color: C.muted }}>Sin datos en este período.</p>
        ) : (
          <div style={{ display: 'flex', alignItems: 'flex-end', gap: trend.length > 20 ? 3 : 6, height: 130 }}>
            {trend.map((b, i) => (
              <div key={i} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4, minWidth: 0 }}>
                {trend.length <= 16 && (
                  <div style={{ fontSize: 9, color: C.muted, whiteSpace: 'nowrap' }}>
                    {b.rev > 0 ? `$${b.rev.toFixed(0)}` : ''}
                  </div>
                )}
                <div
                  style={{
                    width: '100%',
                    height: `${Math.max((b.rev / maxTrend) * 95, b.rev > 0 ? 4 : 0)}px`,
                    background: `linear-gradient(180deg,${C.gold},${C.goldDm})`,
                    borderRadius: '3px 3px 0 0',
                  }}
                />
                <div style={{ fontSize: 8, color: C.muted2, whiteSpace: 'nowrap', overflow: 'hidden' }}>{b.label}</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Horas + Días pico */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 18, marginBottom: 18 }}>
        <div style={S.card}>
          <div style={sectionTitle}>Horas pico</div>
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
          <div style={sectionTitle}>Días más ocupados</div>
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
        <div style={sectionTitle}>Retención de clientes</div>
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
