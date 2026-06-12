import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Maneja el callback del magic link de Supabase.
// 1. Intercambia el code por una sesión
// 2. Asegura que exista un profile para el usuario (vinculado al tenant por email)
// 3. Redirige al admin del tenant del owner
export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next')

  if (!code) {
    return NextResponse.redirect(`${origin}/login?error=no_code`)
  }

  const supabase = await createClient()
  const { data: session, error } = await supabase.auth.exchangeCodeForSession(code)
  if (error || !session.user) {
    return NextResponse.redirect(`${origin}/login?error=${encodeURIComponent(error?.message || 'invalid')}`)
  }

  const userId = session.user.id
  const email = session.user.email
  if (!email) {
    return NextResponse.redirect(`${origin}/login?error=no_email`)
  }

  // Buscar tenant por owner_email y crear profile si no existe
  const admin = createAdminClient()
  const { data: tenant } = await admin
    .from('tenants')
    .select('id, slug')
    .eq('owner_email', email)
    .maybeSingle()

  if (tenant) {
    // Upsert del profile vinculando al tenant
    await admin.from('profiles').upsert(
      {
        id: userId,
        tenant_id: tenant.id,
        role: 'owner',
        full_name: session.user.user_metadata?.full_name || null,
      },
      { onConflict: 'id' }
    )

    // Si nos pasaron ?next, respetarlo; sino mandar al admin del tenant
    return NextResponse.redirect(`${origin}${next || `/t/${tenant.slug}/admin`}`)
  }

  // Si no encontramos tenant para este email, mandar al inicio con aviso
  return NextResponse.redirect(`${origin}/?error=no_tenant_for_email`)
}
