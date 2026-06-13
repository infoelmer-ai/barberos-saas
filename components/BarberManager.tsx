'use client'

import { useState } from 'react'
import { C } from '@/lib/constants'
import { S } from '@/lib/styles'
import type { Barber } from '@/lib/supabase/types'

const COLORS = ['#8B6F32', '#3A8B5C', '#3A6B8B', '#8B3A3A', '#7A3A8B', '#C9A84C', '#B5651D', '#2A7A7A']

interface Props {
  barbers: Barber[]
  setBarbers: (b: Barber[]) => void
  demoMode: boolean
}

export default function BarberManager({ barbers, setBarbers, demoMode }: Props) {
  const [adding, setAdding] = useState(false)
  const [editId, setEditId] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState({ name: '', specialty: '', color: COLORS[0] })

  function resetForm() {
    setForm({ name: '', specialty: '', color: COLORS[0] })
    setAdding(false)
    setEditId(null)
    setError(null)
  }

  async function create() {
    if (!form.name.trim()) return
    setBusy(true)
    setError(null)
    const res = await fetch('/api/barbers', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    setBusy(false)
    if (!res.ok) return setError(json.error || 'Error')
    setBarbers([...barbers, json.barber])
    resetForm()
  }

  async function save(id: string) {
    setBusy(true)
    setError(null)
    const res = await fetch(`/api/barbers/${id}`, {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(form),
    })
    const json = await res.json()
    setBusy(false)
    if (!res.ok) return setError(json.error || 'Error')
    setBarbers(barbers.map((b) => (b.id === id ? json.barber : b)))
    resetForm()
  }

  async function remove(id: string) {
    if (!confirm('¿Eliminar este barbero? Sus citas pasadas se conservan.')) return
    setBusy(true)
    const res = await fetch(`/api/barbers/${id}`, { method: 'DELETE' })
    setBusy(false)
    if (res.ok) setBarbers(barbers.filter((b) => b.id !== id))
  }

  function startEdit(b: Barber) {
    setEditId(b.id)
    setAdding(false)
    setForm({ name: b.name, specialty: b.specialty || '', color: b.color })
  }

  return (
    <div style={S.card}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: 16,
        }}
      >
        <div
          style={{
            fontSize: 10,
            color: C.muted,
            letterSpacing: 2,
            textTransform: 'uppercase',
            fontWeight: 700,
          }}
        >
          Barberos ({barbers.length})
        </div>
        {!demoMode && !adding && !editId && (
          <button style={{ ...S.btnSm, color: C.gold, borderColor: C.goldDm }} onClick={() => setAdding(true)}>
            + Agregar barbero
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
        <BarberForm
          form={form}
          setForm={setForm}
          busy={busy}
          onSave={create}
          onCancel={resetForm}
          saveLabel="Crear"
        />
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill,minmax(220px,1fr))', gap: 12, marginTop: adding ? 14 : 0 }}>
        {barbers.map((b) =>
          editId === b.id ? (
            <div key={b.id} style={{ gridColumn: '1 / -1' }}>
              <BarberForm
                form={form}
                setForm={setForm}
                busy={busy}
                onSave={() => save(b.id)}
                onCancel={resetForm}
                saveLabel="Guardar"
              />
            </div>
          ) : (
            <div
              key={b.id}
              style={{
                background: C.bg3,
                border: `1px solid ${C.border}`,
                borderRadius: 9,
                padding: 18,
                textAlign: 'center',
                position: 'relative',
              }}
            >
              <div
                style={{
                  width: 56,
                  height: 56,
                  borderRadius: '50%',
                  margin: '0 auto 12px',
                  background: `linear-gradient(135deg,${b.color},${b.color}55)`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                  fontWeight: 700,
                  color: '#fff',
                }}
              >
                {b.initials || b.name.slice(0, 2).toUpperCase()}
              </div>
              <div style={{ fontWeight: 700, fontSize: 14, color: C.cream, marginBottom: 4 }}>{b.name}</div>
              <div style={{ fontSize: 10, color: C.muted, marginBottom: 12 }}>{b.specialty || '—'}</div>
              {!demoMode && (
                <div style={{ display: 'flex', gap: 6, justifyContent: 'center' }}>
                  <button style={{ ...S.btnSm, fontSize: 10 }} onClick={() => startEdit(b)} disabled={busy}>
                    Editar
                  </button>
                  <button
                    style={{ ...S.btnSm, fontSize: 10, color: C.red, borderColor: `${C.red}44` }}
                    onClick={() => remove(b.id)}
                    disabled={busy}
                  >
                    Eliminar
                  </button>
                </div>
              )}
            </div>
          )
        )}
      </div>

      {demoMode && (
        <p style={{ fontSize: 11, color: C.muted2, marginTop: 18, textAlign: 'center' }}>
          En modo demo no se pueden editar barberos. Regístrate para gestionar los tuyos.
        </p>
      )}
    </div>
  )
}

function BarberForm({
  form,
  setForm,
  busy,
  onSave,
  onCancel,
  saveLabel,
}: {
  form: { name: string; specialty: string; color: string }
  setForm: (f: { name: string; specialty: string; color: string }) => void
  busy: boolean
  onSave: () => void
  onCancel: () => void
  saveLabel: string
}) {
  return (
    <div style={{ background: C.bg3, border: `1px solid ${C.goldDm}`, borderRadius: 9, padding: 18, marginBottom: 14 }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 12 }}>
        <div>
          <label style={S.lbl}>Nombre *</label>
          <input
            style={S.inp}
            placeholder="Ej: Carlos Mendoza"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
          />
        </div>
        <div>
          <label style={S.lbl}>Especialidad</label>
          <input
            style={S.inp}
            placeholder="Ej: Fade & Degradado"
            value={form.specialty}
            onChange={(e) => setForm({ ...form, specialty: e.target.value })}
          />
        </div>
      </div>
      <label style={S.lbl}>Color</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14 }}>
        {COLORS.map((c) => (
          <button
            key={c}
            onClick={() => setForm({ ...form, color: c })}
            style={{
              width: 28,
              height: 28,
              borderRadius: '50%',
              background: c,
              border: form.color === c ? `2px solid ${C.cream}` : `2px solid transparent`,
              cursor: 'pointer',
            }}
            aria-label={`Color ${c}`}
          />
        ))}
      </div>
      <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
        <button className="gh" style={S.btnSm} onClick={onCancel} disabled={busy}>
          Cancelar
        </button>
        <button
          style={{ ...S.btnSm, color: C.gold, borderColor: C.goldDm, opacity: busy || !form.name.trim() ? 0.5 : 1 }}
          onClick={onSave}
          disabled={busy || !form.name.trim()}
        >
          {busy ? '...' : saveLabel}
        </button>
      </div>
    </div>
  )
}
