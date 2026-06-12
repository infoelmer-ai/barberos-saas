import Link from 'next/link'
import Navbar from '@/components/Navbar'
import { createAdminClient } from '@/lib/supabase/admin'
import { C } from '@/lib/constants'
import { S } from '@/lib/styles'

export default async function SuccessPage({
  searchParams,
}: {
  searchParams: Promise<{ tenant?: string }>
}) {
  const sp = await searchParams
  const slug = sp.tenant

  let tenantName = 'Tu barbería'
  let ownerEmail = ''
  if (slug) {
    const supabase = createAdminClient()
    const { data } = await supabase
      .from('tenants')
      .select('name, owner_email')
      .eq('slug', slug)
      .single()
    if (data) {
      tenantName = data.name
      ownerEmail = data.owner_email
    }
  }

  const rootDomain = process.env.NEXT_PUBLIC_ROOT_DOMAIN || 'localhost:3000'
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000'
  const isCustomDomain = !rootDomain.includes('vercel.app') && !rootDomain.includes('localhost')
  const tenantUrl = slug
    ? isCustomDomain
      ? `https://${slug}.${rootDomain}`
      : `${appUrl}/t/${slug}`
    : null

  return (
    <div style={S.app}>
      <Navbar />
      <div style={{ ...S.wrap, textAlign: 'center', maxWidth: 600, margin: '0 auto' }}>
        <div style={{ fontSize: 70, marginBottom: 24 }}>🎉</div>
        <h1
          style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: 38,
            color: C.gold,
            marginBottom: 12,
          }}
        >
          ¡Bienvenido a BarberOS!
        </h1>
        <p style={{ color: C.muted, fontSize: 15, marginBottom: 28, lineHeight: 1.7 }}>
          Tu barbería <strong style={{ color: C.cream }}>{tenantName}</strong> está activa con 14
          días de prueba gratis.
        </p>

        <div
          style={{
            background: C.bg2,
            border: `1px solid ${C.border}`,
            borderRadius: 12,
            padding: 26,
            marginBottom: 22,
            textAlign: 'left',
          }}
        >
          <div
            style={{
              fontSize: 10,
              color: C.muted,
              letterSpacing: 2.5,
              textTransform: 'uppercase',
              fontWeight: 700,
              marginBottom: 14,
            }}
          >
            Lo siguiente
          </div>

          <div style={{ marginBottom: 18 }}>
            <div style={{ display: 'flex', gap: 12, marginBottom: 6 }}>
              <span style={{ fontSize: 18 }}>1️⃣</span>
              <div>
                <div style={{ fontWeight: 700, color: C.cream, marginBottom: 3 }}>
                  Tu página pública
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
                  Aquí van tus clientes a agendar citas. Compártela en redes y WhatsApp.
                </div>
                {tenantUrl && (
                  <div
                    style={{
                      background: C.bg3,
                      border: `1px solid ${C.border2}`,
                      borderRadius: 6,
                      padding: '8px 12px',
                      fontFamily: "'Courier New',monospace",
                      fontSize: 12,
                      color: C.gold,
                      wordBreak: 'break-all',
                    }}
                  >
                    {tenantUrl.replace(/^https?:\/\//, '')}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', gap: 12 }}>
              <span style={{ fontSize: 18 }}>2️⃣</span>
              <div>
                <div style={{ fontWeight: 700, color: C.cream, marginBottom: 3 }}>
                  Tu panel de control
                </div>
                <div style={{ fontSize: 12, color: C.muted, marginBottom: 8 }}>
                  Para ver citas, ingresos y métricas. Entras con tu correo (sin contraseña — te
                  enviamos un enlace mágico).
                </div>
                {ownerEmail && (
                  <div style={{ fontSize: 11, color: C.muted2 }}>
                    Tu correo de acceso:{' '}
                    <strong style={{ color: C.cream }}>{ownerEmail}</strong>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {tenantUrl && (
            <a href={tenantUrl} target="_blank" style={{ ...S.btnGh, textDecoration: 'none' }} className="gh">
              Ver mi página ↗
            </a>
          )}
          <Link
            href={`/login${ownerEmail ? `?email=${encodeURIComponent(ownerEmail)}&next=${encodeURIComponent(`/t/${slug}/admin`)}` : ''}`}
            style={{ ...S.btnG, textDecoration: 'none' }}
          >
            Entrar al panel →
          </Link>
        </div>
      </div>
    </div>
  )
}
