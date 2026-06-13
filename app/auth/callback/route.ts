import { NextResponse } from 'next/server'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Maneja el callback del magic link de Supabase.
// Supabase puede mandar el enlace en dos formatos según configuración:
//   1. PKCE:  ?code=...            → exchangeCodeForSession
//   2. OTP:   ?token_hash=&type=   → verifyOtp
// Manejamos ambos para que el login sea robusto.
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next')

  const supabase = await createClient()

  let userId: string | undefined
  let email: string | undefined

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error || !data.user) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error?.message || 'invalid')}`
      )
    }
    userId = data.user.id
    email = data.user.email ?? undefined
  } else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error || !data.user) {
      return NextResponse.redirect(
        `${origin}/login?error=${encodeURIComponent(error?.message || 'invalid')}`
      )
    }
    userId = data.user.id
    email = data.user.email ?? undefined
  } else {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  if (!userId || !email) {
    return NextResponse.redirect(`${origin}/login?error=no_email`)
  }

  // Vincular usuario → tenant por owner_email
  const admin = createAdminClient()
  const { data: tenant } = await admin
    .from('tenants')
    .select('id, slug')
    .eq('owner_email', email)
    .maybeSingle()

  if (tenant) {
    await admin.from('profiles').upsert(
      {
        id: userId,
        tenant_id: tenant.id,
        role: 'owner',
      },
      { onConflict: 'id' }
    )
    return NextResponse.redirect(`${origin}${next || `/t/${tenant.slug}/admin`}`)
  }

  // Sin tenant para este correo → puede ser super-admin (allowlist) o usuario sin barbería
  return NextResponse.redirect(`${origin}${next || '/'}?error=no_tenant_for_email`)
}
