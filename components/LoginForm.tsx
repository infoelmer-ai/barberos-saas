'use client'

import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { C } from '@/lib/constants'
import { S } from '@/lib/styles'

export default function LoginForm({
  next,
  initialEmail,
}: {
  next?: string
  initialEmail?: string
}) {
  const [email, setEmail] = useState(initialEmail || '')
  const [sent, setSent] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim()) return
    setLoading(true)
    setError(null)

    const supabase = createClient()
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin
    const redirectTo = `${appUrl}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`

    const { error: err } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: { emailRedirectTo: redirectTo },
    })

    setLoading(false)
    if (err) {
      setError(err.message)
    } else {
      setSent(true)
    }
  }

  return (
    <div style={{ maxWidth: 440, margin: '40px auto' }}>
      <div style={{ textAlign: 'center', marginBottom: 36 }}>
        <div style={{ fontSize: 50, marginBottom: 12 }}>💈</div>
        <h1 style={{ ...S.ttl, fontSize: 32 }}>Acceso al panel</h1>
        <p style={S.sub}>Te enviamos un enlace mágico a tu correo. Sin contraseñas.</p>
      </div>

      {sent ? (
        <div
          style={{
            background: `${C.green}10`,
            border: `1px solid ${C.green}44`,
            borderRadius: 8,
            padding: 24,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 40, marginBottom: 12 }}>📧</div>
          <h3 style={{ color: C.green, fontSize: 18, marginBottom: 8 }}>Revisa tu correo</h3>
          <p style={{ color: C.muted, fontSize: 13, lineHeight: 1.6 }}>
            Enviamos un enlace a <strong style={{ color: C.cream }}>{email}</strong>. Haz click ahí
            para entrar a tu panel.
          </p>
          <p style={{ color: C.muted2, fontSize: 11, marginTop: 16 }}>
            ¿No lo ves? Revisa spam. El enlace expira en 1 hora.
          </p>
        </div>
      ) : (
        <form onSubmit={submit}>
          <label style={S.lbl}>Correo del dueño</label>
          <input
            type="email"
            required
            style={S.inp}
            placeholder="tu@correo.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          {error && (
            <div
              style={{
                background: '#2B1010',
                border: `1px solid ${C.red}44`,
                color: C.red,
                padding: '10px 14px',
                borderRadius: 6,
                marginTop: 14,
                fontSize: 12,
              }}
            >
              {error}
            </div>
          )}
          <button
            type="submit"
            disabled={loading || !email.trim()}
            style={{
              ...S.btnG,
              width: '100%',
              marginTop: 18,
              opacity: loading || !email.trim() ? 0.5 : 1,
              cursor: loading || !email.trim() ? 'not-allowed' : 'pointer',
            }}
          >
            {loading ? 'Enviando...' : 'Enviar enlace mágico →'}
          </button>
          <p
            style={{
              color: C.muted2,
              fontSize: 11,
              textAlign: 'center',
              marginTop: 18,
              lineHeight: 1.6,
            }}
          >
            Solo el correo con el que registraste tu barbería puede entrar.
          </p>
        </form>
      )}
    </div>
  )
}
