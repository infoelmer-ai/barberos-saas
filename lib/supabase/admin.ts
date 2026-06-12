import { createClient } from '@supabase/supabase-js'

// Cliente con service role — usa SOLO en server-side (route handlers, server actions).
// Bypasses RLS. NUNCA exponer al cliente.
export function createAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: { persistSession: false, autoRefreshToken: false },
    }
  )
}
