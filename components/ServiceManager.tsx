'use client'

import { useState } from 'react'
import { C } from '@/lib/constants'
import { S } from '@/lib/styles'
import type { Service } from '@/lib/supabase/types'

const EMOJIS = ['✂️', '🪒', '💈', '🧔', '💇', '✨', '🔥', '👑']

interface Props {
  services: Service[]
  setServices: (s: Service[]) => void
  demoMode: boolean
}

interface Form {
  name: string
  price: string
  duration_min: string
  emoji: string
}

const empty: Form = { name: '', price: '', duration_min: '30', emoji: '✂️' }

export default function ServiceManager({ services, setServices, demoMode }: Props) {
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<Form>(empty)

  function reset() {
    setForm(empty)
    setAdding(false)
    setEditId(null)
    setError(null)
  }

  async function create() {
    setBusy(true)
    setError(null)
    const res = await fetch('/api/services', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...form, price: Number(form.price), duration_min: Number(form.duration_min) }),
    })
    const json = await res.json()
    setBusy(false)
    if (!res.ok) return setError(json.error || 'Error')
    setServices([...services, json.service])
    reset()
  }

  async function save(id: string) {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/services/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ ...form, price: Number(form.price), duration_min: Number(form.duration_min) }),
    })
    const json = await res.json()
    setBusy(false)
    if (!res.ok) return setError(json.error || 'Error')
    setServices(services.map((s) => (s.id === id ? json.service : s)))
    reset()
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar este servicio? Las citas pasadas se conservan.')) return
    setBusy(true)
    const res = await fetch(`/api/services/${id}`, { method: 'DELETE' })
    setBusy(false)
    if (res.ok) setServices(services.filter((s) => s.id !== id))
  }

  function startEdit(s: Service) {
    setEditId(s.id)
    setAdding(false)
    setForm({ name: s.name, price: String(s.price), duration_min: String(s.duration_min), emoji: s.emoji || '✂️' })
  }

  return (
    <div style={S.card}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700 }}>
          Servicios ({services.length})
        </div>
        {!demoMode && !adding && !editId && (
          <button style={{ ...S.btnSm, color: C.gold, borderColor: C.goldDm }} onClick={() => setAdding(true)}>
            + Agregar servicio
          </button>
        )}
      </div>

      {error && (
        <div
          style={{
            background: '#2B1010',
            border: `1px solid ${C.red}44`,
            color: C.red,
            padding: '8px 12px',
            borderRadius: 6,
            marginBottom: 12,
            fontSize: 12,
          }}
        >
          {error}
        </div>
      )}

      {adding && (
        <ServiceForm form={form} setForm={setForm} busy={busy} onSave={create} onCancel={reset} saveLabel="Crear" />
      )}

      <div style={{ display: 'grid', gap: 10, marginTop: adding ? 14 : 0 }}>
        {services.map((s) =>
          editId === s.id ? (
            <ServiceForm
              key={s.id}
              form={form}
              setForm={setForm}
              busy={busy}
              onSave={() => save(s.id)}
              onCancel={reset}
              saveLabel="Guardar"
            />
          ) : (
            <div
              key={s.id}
              style={{
                background: C.bg3,
                border: `1px solid ${C.border}`,
                borderRadius: 9,
                padding: '14px 18px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: 28 }}>{s.emoji || '✂️'}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15, color: C.cream }}>{s.name}</div>
                  <div style={{ fontSize: 11, color: C.muted }}>{s.duration_min} min</div>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{ fontSize: 22, fontWeight: 700, color: C.gold }}>${s.price}</div>
                {!demoMode && (
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button style={{ ...S.btnSm, fontSize: 10 }} onClick={() => startEdit(s)} disabled={busy}>
                      Editar
                    </button>
                    <button
                      style={{ ...S.btnSm, fontSize: 10, color: C.red, borderColor: `${C.red}44` }}
                      onClick={() => remove(s.id)}
                      disabled={busy}
                    >
                      Eliminar
                    </button>
                  </div>
                )}
              </div>
            </div>
          )
        )}
      </div>

      {demoMode && (
        <p style={{ fontSize: 11, color: C.muted2, marginTop: 18, textAlign: 'center' }}>
          En modo demo no se pueden editar servicios. Regístrate para gestionar los tuyos.
        </p>
      )}
    </div>
  )
}

function ServiceForm({
  form,
  setForm,
  busy,
  onSave,
  onCancel,
  saveLabel,
}: {
  form: Form
  setForm: (f: Form) => void
  busy: boolean
  onSave: () => void
  onCancel: () => void
  saveLabel: string
}) {
  return (
    <div style={{ background: C.bg3, border: `1px solid ${C.goldDm}`, borderRadius: 9, padding: 18, marginBottom: 10 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={S.lbl}>Nombre *</label>
          <input
            style={S.inp}
            placeholder="Ej: Corte de Pelo"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label style={S.lbl}>Precio (USD) *</label>
          <input
            style={S.inp}
            type="number"
            min="0"
            step="0.5"
            placeholder="5"
            value={form.price}
            onChange={(e) => setForm({ ...form, price: e.target.value })}
          />
        </div>
        <div>
          <label style={S.lbl}>Duración</label>
          <select
            style={{ ...S.inp, appearance: 'auto' }}
            value={form.duration_min}
            onChange={(e) => setForm({ ...form, duration_min: e.target.value })}
          >
            <option value="30">30 min</option>
            <option value="60">60 min</option>
            <option value="90">90 min</option>
            <option value="120">120 min</option>
          </select>
        </div>
      </div>
      <label style={S.lbl}>Icono</label>
      <div style={{ display: 'flex', gap: 6, marginBottom: 14, flexWrap: 'wrap' }}>
        {EMOJIS.map((e) => (
          <button
            key={e}
            onClick={() => setForm({ ...form, emoji: e })}
            style={{
              width: 36,
              height: 36,
              borderRadius: 6,
              fontSize: 18,
              background: form.emoji === e ? `${C.gold}22` : C.bg2,
              border: form.emoji === e ? `1px solid ${C.gold}` : `1px solid ${C.border2}`,
              cursor: 'pointer',
            }}
          >
            {e}
          </button>
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="gh" style={S.btnSm} onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
        <button
          style={{
            ...S.btnSm,
            color: C.gold,
            borderColor: C.goldDm,
            opacity: busy || !form.name.trim() || form.price === '' ? 0.5 : 1,
          }}
          onClick={onSave}
          disabled={busy || !form.name.trim() || form.price === ''}
        >
          {busy ? '...' : saveLabel}
        </button>
      </div>
    </div>
  )
}
