'use client'

import { useRef, useState } from 'react'
import { C } from '@/lib/constants'
import { S } from '@/lib/styles'
import type { Tenant } from '@/lib/supabase/types'

const COLORS = ['#C9A84C', '#4A8FBF', '#3A8B5C', '#8B3A8B', '#E05252', '#B5651D', '#2A7A7A', '#1F2937']

// Redimensiona una imagen a máx 240px y devuelve un data URL liviano.
function resizeImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const max = 240
        let { width, height } = img
        if (width > height && width > max) {
          height = Math.round((height * max) / width)
          width = max
        } else if (height > max) {
          width = Math.round((width * max) / height)
          height = max
        }
        const canvas = document.createElement('canvas')
        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        if (!ctx) return reject(new Error('No se pudo procesar la imagen'))
        ctx.drawImage(img, 0, 0, width, height)
        resolve(canvas.toDataURL('image/png'))
      }
      img.onerror = () => reject(new Error('Imagen inválida'))
      img.src = reader.result as string
    }
    reader.onerror = () => reject(new Error('No se pudo leer el archivo'))
    reader.readAsDataURL(file)
  })
}

export default function BrandingManager({
  tenant,
  demoMode,
}: {
  tenant: Tenant
  demoMode: boolean
}) {
  const [logo, setLogo] = useState<string | null>(tenant.logo_url)
  const [color, setColor] = useState(tenant.brand_color || '#C9A84C')
  const [busy, setBusy] = useState(false)
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      const dataUrl = await resizeImage(file)
      setLogo(dataUrl)
      setMsg(null)
    } catch {
      setMsg({ ok: false, text: 'No se pudo procesar la imagen' })
    }
  }

  async function save() {
    setBusy(true)
    setMsg(null)
    const res = await fetch('/api/branding', {
      method: 'PATCH',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ logo_url: logo, brand_color: color }),
    })
    const json = await res.json()
    setBusy(false)
    if (!res.ok) setMsg({ ok: false, text: json.error || 'Error al guardar' })
    else setMsg({ ok: true, text: '✅ Marca actualizada. Mira tu página pública.' })
  }

  return (
    <div style={S.card}>
      <div style={{ fontSize: 10, color: C.muted, letterSpacing: 2, textTransform: 'uppercase', fontWeight: 700, marginBottom: 6 }}>
        Marca blanca
      </div>
      <p style={{ fontSize: 13, color: C.muted, marginBottom: 22 }}>
        Personaliza tu página pública con tu logo y color. Tus clientes verán tu marca, no la de
        BarberOS.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* Logo */}
        <div>
          <label style={S.lbl}>Logo</label>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 16,
              background: C.bg3,
              border: `1px solid ${C.border2}`,
              borderRadius: 8,
              padding: 16,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 12,
                background: C.bg,
                border: `1px solid ${C.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                overflow: 'hidden',
                flexShrink: 0,
              }}
            >
              {logo ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={logo} alt="logo" style={{ maxWidth: '100%', maxHeight: '100%' }} />
              ) : (
                <span style={{ fontSize: 28 }}>💈</span>
              )}
            </div>
            <div style={{ flex: 1 }}>
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                onChange={onFile}
                style={{ display: 'none' }}
                disabled={demoMode}
              />
              <button
                style={{ ...S.btnSm, color: C.gold, borderColor: C.goldDm }}
                onClick={() => fileRef.current?.click()}
                disabled={demoMode}
              >
                {logo ? 'Cambiar logo' : 'Subir logo'}
              </button>
              {logo && (
                <button
                  style={{ ...S.btnSm, marginLeft: 8, color: C.red, borderColor: `${C.red}44` }}
                  onClick={() => setLogo(null)}
                  disabled={demoMode}
                >
                  Quitar
                </button>
              )}
              <p style={{ fontSize: 11, color: C.muted, marginTop: 8 }}>PNG o JPG. Se ajusta automáticamente.</p>
            </div>
          </div>
        </div>

        {/* Color */}
        <div>
          <label style={S.lbl}>Color principal</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            {COLORS.map((c) => (
              <button
                key={c}
                onClick={() => setColor(c)}
                disabled={demoMode}
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: '50%',
                  background: c,
                  border: color.toLowerCase() === c.toLowerCase() ? `3px solid ${C.cream}` : '3px solid transparent',
                  cursor: demoMode ? 'not-allowed' : 'pointer',
                }}
                aria-label={c}
              />
            ))}
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <input
              type="color"
              value={color}
              onChange={(e) => setColor(e.target.value)}
              disabled={demoMode}
              style={{ width: 44, height: 36, background: 'none', border: 'none', cursor: 'pointer' }}
            />
            <span style={{ fontFamily: "'Courier New',monospace", fontSize: 13, color: C.cream }}>{color}</span>
          </div>
        </div>
      </div>

      {/* Vista previa */}
      <div style={{ marginTop: 24 }}>
        <label style={S.lbl}>Vista previa</label>
        <div
          style={{
            background: C.bg,
            border: `1px solid ${C.border}`,
            borderRadius: 10,
            padding: 20,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {logo ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={logo} alt="logo" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            ) : (
              <span style={{ fontSize: 28 }}>💈</span>
            )}
            <span style={{ fontFamily: "'Playfair Display',serif", fontWeight: 700, fontSize: 18, color }}>
              {tenant.name}
            </span>
          </div>
          <span
            style={{
              background: `linear-gradient(135deg,${color},${color}cc)`,
              color: '#fff',
              padding: '10px 22px',
              borderRadius: 5,
              fontSize: 12,
              fontWeight: 700,
              letterSpacing: 1.5,
              textTransform: 'uppercase',
            }}
          >
            Agendar cita
          </span>
        </div>
      </div>

      {msg && (
        <div
          style={{
            marginTop: 16,
            padding: '10px 14px',
            borderRadius: 6,
            fontSize: 12,
            background: msg.ok ? '#0D2B1A' : '#2B1010',
            border: `1px solid ${msg.ok ? '#2D6B4A' : `${C.red}44`}`,
            color: msg.ok ? C.green : C.red,
          }}
        >
          {msg.text}
        </div>
      )}

      {!demoMode && (
        <div style={{ marginTop: 18, display: 'flex', justifyContent: 'flex-end' }}>
          <button style={{ ...S.btnG, opacity: busy ? 0.5 : 1 }} onClick={save} disabled={busy}>
            {busy ? 'Guardando...' : 'Guardar marca'}
          </button>
        </div>
      )}
      {demoMode && (
        <p style={{ fontSize: 11, color: C.muted2, marginTop: 18, textAlign: 'center' }}>
          En modo demo no se puede guardar. Regístrate en el plan Business para tu marca blanca.
        </p>
      )}
    </div>
  )
}
