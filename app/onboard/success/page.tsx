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
  if (slug) {
    const supabase = createAdminClient()
    const { data } = await supabase.from('tenants').select('name').eq('slug', slug).single()
    if (data) tenantName = data.name
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
      <div style={{ ...S.wrap, textAlign: 'center', maxWidth: 560, margin: '0 auto' }}>
        <div style={{ fontSize: 70, marginBottom: 24 }}>🎉</div>
        <h1
          style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: 38,
            color: C.gold,
            marginBottom: 12,
          }}
        >
          ¡Listo!
        </h1>
        <p style={{ color: C.muted, fontSize: 15, marginBottom: 28, lineHeight: 1.7 }}>
          Tu barbería <strong style={{ color: C.cream }}>{tenantName}</strong> está configurada y
          tu subdominio ya está activo.
        </p>
        {tenantUrl && (
          <div
            style={{
              background: C.bg2,
              border: `1px solid ${C.border}`,
              borderRadius: 10,
              padding: 22,
              marginBottom: 22,
              fontFamily: "'Courier New',monospace",
              fontSize: 14,
              color: C.gold,
            }}
          >
            {tenantUrl.replace(/^https?:\/\//, '')}
          </div>
        )}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          {tenantUrl && (
            <a href={tenantUrl} style={{ ...S.btnG, textDecoration: 'none' }}>
              Ver mi barbería →
            </a>
          )}
          <Link href="/" style={{ ...S.btnGh, textDecoration: 'none' }} className="gh">
            Volver al inicio
          </Link>
        </div>
      </div>
    </div>
  )
}
