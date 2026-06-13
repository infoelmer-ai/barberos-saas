import { NextResponse, type NextRequest } from 'next/server'
import { createServerClient, type CookieOptions } from '@supabase/ssr'
import type { EmailOtpType } from '@supabase/supabase-js'
import { createAdminClient } from '@/lib/supabase/admin'

// Callback del magic link. Maneja PKCE (?code=) y OTP (?token_hash=&type=).
// CLAVE: las cookies de sesión se escriben DIRECTAMENTE en la respuesta de
// redirección. Si se usara el store global de cookies() y luego se devolviera
// un NextResponse.redirect nuevo, las cookies no llegarían al navegador y el
// panel rebotaría al login.
export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const tokenHash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const next = searchParams.get('next')

  // Acumulamos las cookies que el cliente Supabase quiere setear.
  const pending: { name: string; value: string; options: CookieOptions }[] = []

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          pending.push(...cookiesToSet)
        },
      },
    }
  )

  function fail(reason: string) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(reason)}`)
  }

  let userId: string | undefined
  let email: string | undefined

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (error || !data.user) return fail(error?.message || 'exchange')
    userId = data.user.id
    email = data.user.email ?? undefined
  } else if (tokenHash && type) {
    const { data, error } = await supabase.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error || !data.user) return fail(error?.message || 'verify')
    userId = data.user.id
    email = data.user.email ?? undefined
  } else {
    return fail('no_code')
  }

  if (!userId || !email) return fail('no_email')

  // Resolver destino: tenant del dueño, o super-admin si está en la allowlist.
  const admin = createAdminClient()
  const { data: tenant } = await admin
    .from('tenants')
    .select('id, slug')
    .eq('owner_email', email)
    .maybeSingle()

  const allow = (process.env.SUPERADMIN_EMAILS || '')
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean)

  let dest: string
  if (tenant) {
    await admin
      .from('profiles')
      .upsert({ id: userId, tenant_id: tenant.id, role: 'owner' }, { onConflict: 'id' })
    dest = next || `/t/${tenant.slug}/admin`
  } else if (allow.includes(email.toLowerCase())) {
    dest = next || '/superadmin'
  } else {
    dest = '/?error=no_tenant_for_email'
  }

  // Respuesta final con las cookies de sesión adjuntas.
  const response = NextResponse.redirect(`${origin}${dest}`)
  for (const c of pending) {
    response.cookies.set(c.name, c.value, c.options)
  }
  return response
}
