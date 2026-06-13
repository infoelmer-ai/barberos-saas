'use client'

import { useMemo, useState } from 'react'
import { C, TIME_SLOTS } from '@/lib/constants'
import { S } from '@/lib/styles'
import { fmtDate, getAvailableSlots, pad2 } from '@/lib/utils'
import type { Barber, Service, Tenant } from '@/lib/supabase/types'

// Botón primario tematizado con el color de marca (variable CSS --brand,
// definida en el contenedor raíz a partir de tenant.brand_color).
const btnBrand = { ...S.btnG, background: 'var(--brand)', color: '#fff' }

type ServiceSlim = { duration_min: number; name: string; emoji: string | null }

interface AppointmentLite {
  id: string
  barber_id: string
  service_id: string
  date: string
  time: string
  status: string
  client_phone: string
  client_name: string
  total: number
  pending_charge: boolean
  // Supabase devuelve esto como array u objeto según la inferencia; normalizamos al usarlo
  services: ServiceSlim | ServiceSlim[] | null
}

function svc(a: AppointmentLite): ServiceSlim | null {
  if (!a.services) return null
  return Array.isArray(a.services) ? a.services[0] ?? null : a.services
}

interface Props {
  tenant: Tenant
  barbers: Barber[]
  services: Service[]
  appointments: AppointmentLite[]
}

export default function TenantBooking({
  tenant,
  barbers,
  services,
  appointments: initialApts,
}: Props) {
  const [step, setStep] = useState(0)
  const [apts, setApts] = useState(initialApts)
  const [bk, setBk] = useState({
    barber_id: '',
    service_id: '',
    date: '',
    time: '',
    client_name: '',
    client_phone: '',
    client_email: '',
  })
  const [lk, setLk] = useState<{ phone: string; results: AppointmentLite[] | null; msg: string }>({
    phone: '',
    results: null,
    msg: '',
  })
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const today = new Date().toISOString().split('T')[0]
  const selSvc = bk.service_id ? services.find((s) => s.id === bk.service_id) : null
  const selBarber = bk.barber_id ? barbers.find((b) => b.id === bk.barber_id) : null

  const aptsForAvail = useMemo(
    () =>
      apts.map((a) => ({
        barber_id: a.barber_id,
        date: a.date,
        time: a.time.slice(0, 5),
        status: a.status,
        duration_min: svc(a)?.duration_min || 30,
      })),
    [apts]
  )

  const avail = useMemo(
    () =>
      bk.barber_id && bk.date && selSvc
        ? getAvailableSlots(aptsForAvail, bk.barber_id, bk.date, selSvc.duration_min)
        : [],
    [aptsForAvail, bk.barber_id, bk.date, selSvc]
  )

  const ok = {
    1: !!bk.barber_id,
    2: !!bk.service_id,
    3: !!bk.date && !!bk.time,
    4: bk.client_name.trim() && bk.client_phone.trim(),
  }

  async function confirmBooking() {
    setSubmitting(true)
    setError(null)
    try {
      const res = await fetch('/api/appointments', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          tenant_id: tenant.id,
          barber_id: bk.barber_id,
          service_id: bk.service_id,
          date: bk.date,
          time: bk.time,
          client_name: bk.client_name,
          client_phone: bk.client_phone,
          client_email: bk.client_email || null,
        }),
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'No se pudo crear la cita')
      setApts((p) => [...p, json.appointment])
      setStep(6)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Error desconocido')
    } finally {
      setSubmitting(false)
    }
  }

  async function lookup() {
    setLk((l) => ({ ...l, msg: '' }))
    const res = await fetch(`/api/appointments?phone=${encodeURIComponent(lk.phone)}&tenant_id=${tenant.id}`)
    const json = await res.json()
    setLk((l) => ({ ...l, results: json.appointments || [] }))
  }

  async function cancelApt(id: string) {
    const apt = (lk.results || []).find((a) => a.id === id)
    if (!apt) return
    const diff = (new Date(apt.date + 'T' + apt.time + ':00').getTime() - Date.now()) / 3600000
    const late = diff < 24
    const res = await fetch(`/api/appointments/${id}`, {
      method: 'DELETE',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ pending_charge: late }),
    })
    if (!res.ok) return
    const msg = late
      ? '⚠️ Cancelación registrada. Se cobrará en tu próxima visita.'
      : '✅ Cita cancelada sin cargo.'
    setLk((l) => ({
      ...l,
      results: l.results?.map((a) => (a.id === id ? { ...a, status: 'cancelled', pending_charge: late } : a)) || null,
      msg,
    }))
  }

  const brand = tenant.brand_color || C.gold
  const logoUrl = tenant.logo_url
  const isBusiness = tenant.plan === 'business'

  return (
    <div style={{ ...S.app, ['--brand' as string]: brand } as React.CSSProperties}>
      {/* Header del tenant */}
      <header style={S.hdr}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {logoUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logoUrl} alt={tenant.name} style={{ height: 38, maxWidth: 120, objectFit: 'contain' }} />
          ) : (
            <span style={{ fontSize: 26 }}>💈</span>
          )}
          <div>
            <div
              style={{
                fontFamily: "'Playfair Display',serif",
                fontWeight: 700,
                fontSize: 20,
                color: 'var(--brand)',
              }}
            >
              {tenant.name}
            </div>
            {!isBusiness && (
              <div
                style={{
                  fontSize: 9,
                  color: C.muted,
                  fontFamily: "'Courier New',monospace",
                  letterSpacing: 1,
                }}
              >
                {tenant.slug}.barberos.com
              </div>
            )}
          </div>
        </div>
      </header>

      <div style={S.wrap}>
        {step === 0 && (
          <BookHome
            services={services}
            onStart={() => setStep(1)}
            lk={lk}
            setLk={setLk}
            onLookup={lookup}
            onCancel={cancelApt}
            barbers={barbers}
          />
        )}

        {step >= 1 && step <= 5 && (
          <div>
            <Progress step={step} />
            {step === 1 && (
              <Step1 barbers={barbers} value={bk.barber_id} onChange={(v) => setBk((x) => ({ ...x, barber_id: v, time: '' }))} onNext={() => ok[1] && setStep(2)} ok={ok[1]} />
            )}
            {step === 2 && (
              <Step2 services={services} value={bk.service_id} onChange={(v) => setBk((x) => ({ ...x, service_id: v, time: '' }))} onBack={() => setStep(1)} onNext={() => ok[2] && setStep(3)} ok={ok[2]} />
            )}
            {step === 3 && selSvc && selBarber && (
              <Step3
                today={today}
                barber={selBarber}
                service={selSvc}
                date={bk.date}
                time={bk.time}
                avail={avail}
                onDate={(v) => setBk((x) => ({ ...x, date: v, time: '' }))}
                onTime={(v) => setBk((x) => ({ ...x, time: v }))}
                onBack={() => setStep(2)}
                onNext={() => ok[3] && setStep(4)}
                ok={!!ok[3]}
              />
            )}
            {step === 4 && (
              <Step4
                data={bk}
                onChange={(patch) => setBk((x) => ({ ...x, ...patch }))}
                onBack={() => setStep(3)}
                onNext={() => ok[4] && setStep(5)}
                ok={!!ok[4]}
              />
            )}
            {step === 5 && selBarber && selSvc && (
              <Step5
                barber={selBarber}
                service={selSvc}
                bk={bk}
                onBack={() => setStep(4)}
                onConfirm={confirmBooking}
                submitting={submitting}
                error={error}
                depositPercent={tenant.deposit_enabled ? tenant.deposit_percent || 0 : 0}
              />
            )}
          </div>
        )}

        {step === 6 && selBarber && selSvc && (
          <BookDone
            barber={selBarber}
            service={selSvc}
            bk={bk}
            onAgain={() => {
              setStep(0)
              setBk({ barber_id: '', service_id: '', date: '', time: '', client_name: '', client_phone: '', client_email: '' })
            }}
          />
        )}
      </div>
    </div>
  )
}

// ─── Sub-components ─────────────────────────────────────────────────

function Progress({ step }: { step: number }) {
  return (
    <div
      style={{
        display: 'flex',
        borderRadius: 6,
        overflow: 'hidden',
        border: `1px solid ${C.border}`,
        marginBottom: 30,
      }}
    >
      {['Barbero', 'Servicio', 'Fecha & Hora', 'Contacto', 'Confirmar'].map((l, i) => {
        const on = step > i + 1 || step === i + 1
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
              borderRight: i < 4 ? `1px solid ${C.border}` : 'none',
            }}
          >
            {step > i + 1 ? '✓ ' : ''}
            {l}
          </div>
        )
      })}
    </div>
  )
}

function BookHome({
  services,
  onStart,
  lk,
  setLk,
  onLookup,
  onCancel,
  barbers,
}: {
  services: Service[]
  barbers: Barber[]
  onStart: () => void
  lk: { phone: string; results: AppointmentLite[] | null; msg: string }
  setLk: (v: typeof lk) => void
  onLookup: () => void
  onCancel: (id: string) => void
}) {
  return (
    <div>
      <div style={{ textAlign: 'center', padding: '40px 0 36px' }}>
        <h1
          style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: 46,
            fontWeight: 800,
            lineHeight: 1.1,
            margin: '0 0 16px',
            background: `linear-gradient(135deg,${C.cream} 40%,var(--brand))`,
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
          }}
        >
          Tu Barbería de Confianza
        </h1>
        <p style={{ color: C.muted, fontSize: 14, maxWidth: 400, margin: '0 auto 30px' }}>
          Agenda tu cita en minutos. Elige barbero, servicio y horario.
        </p>
        <button style={btnBrand} onClick={onStart}>
          Agendar Cita Ahora
        </button>
      </div>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(services.length || 1, 3)},1fr)`,
          gap: 16,
          marginBottom: 36,
        }}
      >
        {services.map((s) => (
          <div
            key={s.id}
            style={{
              background: C.bg2,
              border: `1px solid ${C.border}`,
              borderRadius: 9,
              padding: 24,
              textAlign: 'center',
            }}
          >
            <div style={{ fontSize: 38, marginBottom: 12 }}>{s.emoji || '✂️'}</div>
            <div style={{ fontFamily: "'Playfair Display',serif", fontSize: 17, marginBottom: 6 }}>
              {s.name}
            </div>
            <div style={{ fontSize: 30, fontWeight: 700, color: 'var(--brand)', marginBottom: 4 }}>
              ${s.price}
            </div>
            <div style={{ fontSize: 11, color: C.muted }}>⏱ {s.duration_min} min</div>
          </div>
        ))}
      </div>
      <div
        style={{
          background: C.bg2,
          border: `1px solid ${C.border}`,
          borderRadius: 9,
          padding: 24,
        }}
      >
        <h3 style={{ fontFamily: "'Playfair Display',serif", fontSize: 19, margin: '0 0 5px' }}>
          Consultar mis citas
        </h3>
        <p style={{ color: C.muted, fontSize: 12, margin: '0 0 14px' }}>
          Busca por número de teléfono
        </p>
        <div style={{ display: 'flex', gap: 10, marginBottom: 14 }}>
          <input
            style={{ ...S.inp, flex: 1 }}
            placeholder="0000-0000"
            value={lk.phone}
            onChange={(e) => setLk({ ...lk, phone: e.target.value })}
            onKeyDown={(e) => e.key === 'Enter' && onLookup()}
          />
          <button style={btnBrand} onClick={onLookup}>
            Buscar
          </button>
        </div>
        {lk.msg && (
          <div
            style={{
              padding: '10px 14px',
              borderRadius: 6,
              marginBottom: 12,
              fontSize: 12,
              background: lk.msg.includes('✅') ? '#0D2B1A' : '#2B1A0D',
              border: `1px solid ${lk.msg.includes('✅') ? '#2D6B4A' : '#8B6F32'}`,
              color: lk.msg.includes('✅') ? C.green : C.gold,
            }}
          >
            {lk.msg}
          </div>
        )}
        {lk.results &&
          (lk.results.length === 0 ? (
            <p style={{ color: C.muted, fontSize: 12 }}>Sin citas para ese número.</p>
          ) : (
            lk.results.map((apt) => {
              const barber = barbers.find((b) => b.id === apt.barber_id)
              const diff =
                (new Date(apt.date + 'T' + apt.time + ':00').getTime() - Date.now()) / 3600000
              return (
                <div
                  key={apt.id}
                  className="row"
                  style={{
                    background: C.bg3,
                    border: `1px solid ${apt.status === 'cancelled' ? '#222' : C.border}`,
                    borderRadius: 6,
                    padding: '12px 16px',
                    marginBottom: 8,
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    opacity: apt.status === 'cancelled' ? 0.5 : 1,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 13, marginBottom: 3 }}>
                      {svc(apt)?.name} con {barber?.name}
                    </div>
                    <div style={{ fontSize: 11, color: C.muted }}>
                      {apt.date} · {apt.time.slice(0, 5)} ·{' '}
                      <span style={{ color: 'var(--brand)', fontWeight: 700 }}>${apt.total}</span>
                    </div>
                    {apt.pending_charge && (
                      <div style={{ fontSize: 10, color: 'var(--brand)', marginTop: 3 }}>
                        ⚠️ Cargo pendiente
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <span style={S.badge(apt.status === 'confirmed' ? C.green : '#555')}>
                      {apt.status === 'confirmed' ? 'Confirmada' : 'Cancelada'}
                    </span>
                    {apt.status === 'confirmed' && (
                      <button
                        className="hov"
                        style={{
                          ...S.btnSm,
                          color: C.red,
                          borderColor: `${C.red}44`,
                          fontSize: 10,
                        }}
                        onClick={() => onCancel(apt.id)}
                      >
                        {diff < 24 ? 'Cancelar ⚠' : 'Cancelar'}
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          ))}
      </div>
    </div>
  )
}

function Step1({
  barbers,
  value,
  onChange,
  onNext,
  ok,
}: {
  barbers: Barber[]
  value: string
  onChange: (v: string) => void
  onNext: () => void
  ok: boolean
}) {
  return (
    <div>
      <p style={S.step}>Paso 1 · Elige tu barbero</p>
      <h2 style={S.ttl}>¿Con quién deseas pasar?</h2>
      <p style={S.sub}>Selecciona el barbero de tu preferencia</p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: `repeat(${Math.min(barbers.length || 1, 5)},1fr)`,
          gap: 14,
          marginBottom: 30,
        }}
      >
        {barbers.map((b) => {
          const sel = value === b.id
          return (
            <div
              key={b.id}
              className="nb"
              style={{
                background: sel ? `${C.gold}10` : C.bg3,
                border: `1px solid ${sel ? C.gold : C.border}`,
                borderRadius: 9,
                padding: 20,
                cursor: 'pointer',
                textAlign: 'center',
                transition: 'all 0.2s',
                position: 'relative',
              }}
              onClick={() => onChange(b.id)}
            >
              {sel && (
                <div
                  style={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    width: 18,
                    height: 18,
                    borderRadius: '50%',
                    background: C.gold,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 10,
                    color: C.bg,
                    fontWeight: 700,
                  }}
                >
                  ✓
                </div>
              )}
              <div
                style={{
                  width: 66,
                  height: 66,
                  borderRadius: '50%',
                  margin: '0 auto 12px',
                  background: `linear-gradient(135deg,${b.color},${b.color}55)`,
                  border: `2px solid ${sel ? C.gold : C.border2}`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 18,
                  fontWeight: 700,
                  color: '#fff',
                  boxShadow: sel ? `0 0 16px ${C.gold}30` : 'none',
                }}
              >
                {b.initials || b.name.slice(0, 2).toUpperCase()}
              </div>
              <div
                style={{
                  fontWeight: 700,
                  fontSize: 13,
                  marginBottom: 4,
                  color: sel ? C.gold : C.cream,
                }}
              >
                {b.name}
              </div>
              <div style={{ fontSize: 10, color: C.muted }}>{b.specialty}</div>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <button
          style={{ ...btnBrand, opacity: ok ? 1 : 0.35, cursor: ok ? 'pointer' : 'not-allowed' }}
          onClick={onNext}
        >
          Continuar →
        </button>
      </div>
    </div>
  )
}

function Step2({
  services,
  value,
  onChange,
  onBack,
  onNext,
  ok,
}: {
  services: Service[]
  value: string
  onChange: (v: string) => void
  onBack: () => void
  onNext: () => void
  ok: boolean
}) {
  return (
    <div>
      <p style={S.step}>Paso 2 · Servicio</p>
      <h2 style={S.ttl}>¿Qué servicio deseas?</h2>
      <div style={{ display: 'flex', gap: 18, marginBottom: 30, flexWrap: 'wrap' }}>
        {services.map((s) => {
          const sel = value === s.id
          return (
            <div
              key={s.id}
              style={{
                flex: '1 1 200px',
                background: sel ? `${C.gold}10` : C.bg3,
                border: `2px solid ${sel ? C.gold : C.border}`,
                borderRadius: 9,
                padding: 26,
                cursor: 'pointer',
                transition: 'all 0.2s',
                position: 'relative',
              }}
              onClick={() => onChange(s.id)}
            >
              {sel && (
                <div
                  style={{
                    position: 'absolute',
                    top: 14,
                    right: 14,
                    width: 22,
                    height: 22,
                    borderRadius: '50%',
                    background: C.gold,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    color: C.bg,
                    fontWeight: 700,
                  }}
                >
                  ✓
                </div>
              )}
              <div style={{ fontSize: 40, marginBottom: 14 }}>{s.emoji || '✂️'}</div>
              <div
                style={{
                  fontFamily: "'Playfair Display',serif",
                  fontSize: 20,
                  color: sel ? C.gold : C.cream,
                  marginBottom: 6,
                }}
              >
                {s.name}
              </div>
              <div style={{ fontSize: 32, fontWeight: 700, color: 'var(--brand)' }}>${s.price}</div>
              <div style={{ fontSize: 11, color: C.muted, marginTop: 4 }}>⏱ {s.duration_min} min</div>
            </div>
          )
        })}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button className="gh" style={S.btnGh} onClick={onBack}>
          ← Volver
        </button>
        <button
          style={{ ...btnBrand, opacity: ok ? 1 : 0.35, cursor: ok ? 'pointer' : 'not-allowed' }}
          onClick={onNext}
        >
          Continuar →
        </button>
      </div>
    </div>
  )
}

function Step3({
  today,
  barber,
  service,
  date,
  time,
  avail,
  onDate,
  onTime,
  onBack,
  onNext,
  ok,
}: {
  today: string
  barber: Barber
  service: Service
  date: string
  time: string
  avail: string[]
  onDate: (v: string) => void
  onTime: (v: string) => void
  onBack: () => void
  onNext: () => void
  ok: boolean
}) {
  return (
    <div>
      <p style={S.step}>Paso 3 · Fecha y hora</p>
      <h2 style={S.ttl}>¿Cuándo nos visitas?</h2>
      <p style={S.sub}>
        {barber.name} · {service.name} · {service.duration_min} min
      </p>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '260px 1fr',
          gap: 24,
          marginBottom: 30,
        }}
      >
        <div>
          <label style={S.lbl}>Fecha</label>
          <input
            type="date"
            style={S.inp}
            value={date}
            min={today}
            onChange={(e) => onDate(e.target.value)}
          />
          {date && <p style={{ fontSize: 11, color: C.muted, marginTop: 6 }}>{fmtDate(date)}</p>}
        </div>
        <div>
          <label style={S.lbl}>Horario disponible</label>
          {!date ? (
            <p style={{ color: C.muted, fontSize: 12 }}>Selecciona fecha primero</p>
          ) : avail.length === 0 ? (
            <p style={{ color: C.red, fontSize: 12 }}>
              Sin horarios disponibles. Prueba otra fecha.
            </p>
          ) : (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 7 }}>
              {TIME_SLOTS.map((slot) => {
                const a = avail.includes(slot)
                const sel = time === slot
                return (
                  <button
                    key={slot}
                    className="slot"
                    disabled={!a}
                    onClick={() => a && onTime(slot)}
                    style={{
                      padding: '7px 11px',
                      borderRadius: 4,
                      fontSize: 11,
                      fontFamily: 'inherit',
                      cursor: a ? 'pointer' : 'not-allowed',
                      border: `1px solid ${sel ? C.gold : a ? C.border2 : '#1A1714'}`,
                      background: sel ? C.gold : a ? 'transparent' : '#0D0C0A',
                      color: sel ? C.bg : a ? C.cream : C.muted2,
                      fontWeight: sel ? 700 : 400,
                    }}
                  >
                    {slot}
                  </button>
                )
              })}
            </div>
          )}
        </div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button className="gh" style={S.btnGh} onClick={onBack}>
          ← Volver
        </button>
        <button
          style={{ ...btnBrand, opacity: ok ? 1 : 0.35, cursor: ok ? 'pointer' : 'not-allowed' }}
          onClick={onNext}
        >
          Continuar →
        </button>
      </div>
    </div>
  )
}

function Step4({
  data,
  onChange,
  onBack,
  onNext,
  ok,
}: {
  data: { client_name: string; client_phone: string; client_email: string }
  onChange: (patch: Partial<{ client_name: string; client_phone: string; client_email: string }>) => void
  onBack: () => void
  onNext: () => void
  ok: boolean
}) {
  return (
    <div>
      <p style={S.step}>Paso 4 · Datos de contacto</p>
      <h2 style={S.ttl}>¿Cómo te contactamos?</h2>
      <p style={S.sub}>Nombre y teléfono requeridos · Correo opcional</p>
      <div style={{ maxWidth: 480, display: 'grid', gap: 16, marginBottom: 18 }}>
        <div>
          <label style={S.lbl}>Nombre *</label>
          <input
            style={S.inp}
            placeholder="Tu nombre completo"
            value={data.client_name}
            onChange={(e) => onChange({ client_name: e.target.value })}
          />
        </div>
        <div>
          <label style={S.lbl}>Teléfono *</label>
          <input
            style={S.inp}
            placeholder="0000-0000"
            value={data.client_phone}
            onChange={(e) => onChange({ client_phone: e.target.value })}
          />
        </div>
        <div>
          <label style={S.lbl}>Correo (opcional)</label>
          <input
            style={S.inp}
            placeholder="tu@correo.com"
            value={data.client_email}
            onChange={(e) => onChange({ client_email: e.target.value })}
          />
        </div>
      </div>
      <div
        style={{
          background: '#1A1400',
          border: '1px solid #3D3000',
          borderRadius: 6,
          padding: '12px 16px',
          maxWidth: 480,
          marginBottom: 24,
          fontSize: 11,
          color: 'var(--brand)',
          lineHeight: 1.6,
        }}
      >
        📋 <strong>Política de cancelación:</strong> Cancela con 24h de anticipación sin costo.
        Cancelaciones tardías generan un cargo en tu próxima visita.
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <button className="gh" style={S.btnGh} onClick={onBack}>
          ← Volver
        </button>
        <button
          style={{ ...btnBrand, opacity: ok ? 1 : 0.35, cursor: ok ? 'pointer' : 'not-allowed' }}
          onClick={onNext}
        >
          Revisar →
        </button>
      </div>
    </div>
  )
}

function Step5({
  barber,
  service,
  bk,
  onBack,
  onConfirm,
  submitting,
  error,
  depositPercent,
}: {
  barber: Barber
  service: Service
  bk: { date: string; time: string; client_name: string; client_phone: string }
  onBack: () => void
  onConfirm: () => void
  submitting: boolean
  error: string | null
  depositPercent: number
}) {
  const deposit = depositPercent > 0 ? (Number(service.price) * depositPercent) / 100 : 0
  return (
    <div>
      <p style={S.step}>Paso 5 · Confirmar</p>
      <h2 style={S.ttl}>Resumen de tu cita</h2>
      <div
        style={{
          maxWidth: 480,
          background: C.bg2,
          border: `1px solid ${C.border}`,
          borderRadius: 9,
          overflow: 'hidden',
          marginBottom: 20,
        }}
      >
        <div
          style={{
            background: `${C.gold}0D`,
            borderBottom: `1px solid ${C.border}`,
            padding: '16px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                background: `linear-gradient(135deg,${barber.color},${barber.color}55)`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 16,
                fontWeight: 700,
                color: '#fff',
              }}
            >
              {barber.initials || barber.name.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 15 }}>{barber.name}</div>
              <div style={{ fontSize: 11, color: C.muted }}>{barber.specialty}</div>
            </div>
          </div>
          <div style={{ fontSize: 28, fontWeight: 700, color: 'var(--brand)' }}>${service.price}</div>
        </div>
        <div style={{ padding: '18px 20px', display: 'grid', gap: 11 }}>
          {[
            ['✂️ Servicio', service.name],
            ['📅 Fecha', fmtDate(bk.date)],
            ['⏰ Hora', bk.time],
            ['👤 Cliente', bk.client_name],
            ['📱 Teléfono', bk.client_phone],
          ].map(([k, v]) => (
            <div key={k} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
              <span style={{ color: C.muted }}>{k}</span>
              <span style={{ fontWeight: 600 }}>{v}</span>
            </div>
          ))}
        </div>
      </div>

      {deposit > 0 && (
        <div
          style={{
            maxWidth: 480,
            background: 'var(--brand)',
            borderRadius: 9,
            padding: '14px 18px',
            marginBottom: 16,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            color: '#fff',
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 14 }}>💳 Anticipo para reservar</div>
            <div style={{ fontSize: 11, opacity: 0.9 }}>
              {depositPercent}% del servicio · se abona a tu corte
            </div>
          </div>
          <div style={{ fontSize: 24, fontWeight: 700 }}>${deposit.toFixed(2)}</div>
        </div>
      )}

      {error && (
        <div
          style={{
            maxWidth: 480,
            background: '#2B1010',
            border: `1px solid ${C.red}44`,
            color: C.red,
            padding: '10px 14px',
            borderRadius: 6,
            marginBottom: 12,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}
      <div style={{ display: 'flex', justifyContent: 'space-between', maxWidth: 480 }}>
        <button className="gh" style={S.btnGh} onClick={onBack} disabled={submitting}>
          ← Editar
        </button>
        <button style={btnBrand} onClick={onConfirm} disabled={submitting}>
          {submitting ? 'Confirmando...' : deposit > 0 ? '✓ Confirmar y reservar' : '✓ Confirmar Cita'}
        </button>
      </div>
    </div>
  )
}

function BookDone({
  barber,
  service,
  bk,
  onAgain,
}: {
  barber: Barber
  service: Service
  bk: { date: string; time: string; client_name: string }
  onAgain: () => void
}) {
  return (
    <div style={{ textAlign: 'center', padding: '54px 0' }}>
      <div style={{ fontSize: 64, marginBottom: 20 }}>✅</div>
      <h2 style={{ fontFamily: "'Playfair Display',serif", fontSize: 36, color: 'var(--brand)', marginBottom: 10 }}>
        ¡Cita Confirmada!
      </h2>
      <p style={{ color: C.muted, fontSize: 14, marginBottom: 22 }}>
        Usa tu teléfono para consultar o cancelar tu cita.
      </p>
      <div
        style={{
          background: C.bg2,
          border: `1px solid ${C.border}`,
          borderRadius: 9,
          padding: 24,
          maxWidth: 380,
          margin: '0 auto 22px',
          textAlign: 'left',
        }}
      >
        <div
          style={{
            display: 'flex',
            gap: 12,
            alignItems: 'center',
            paddingBottom: 14,
            marginBottom: 14,
            borderBottom: `1px solid ${C.border}`,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: '50%',
              background: `linear-gradient(135deg,${barber.color},${barber.color}55)`,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 14,
              fontWeight: 700,
              color: '#fff',
            }}
          >
            {barber.initials || barber.name.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <div style={{ fontWeight: 700 }}>{barber.name}</div>
            <div style={{ fontSize: 11, color: C.muted }}>{barber.specialty}</div>
          </div>
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>
          {service.emoji} {service.name}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>
          📅 {bk.date} · {bk.time}
        </div>
        <div style={{ fontSize: 12, color: C.muted, marginBottom: 6 }}>👤 {bk.client_name}</div>
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            marginTop: 14,
            paddingTop: 14,
            borderTop: `1px solid ${C.border}`,
          }}
        >
          <span style={{ color: C.muted, fontSize: 12 }}>Total</span>
          <span style={{ fontSize: 24, fontWeight: 700, color: 'var(--brand)' }}>${service.price}</span>
        </div>
      </div>
      <button style={btnBrand} onClick={onAgain}>
        Agendar otra cita
      </button>
    </div>
  )
}
