import { createClient } from './server'
import { createAdminClient } from './admin'

// Devuelve el usuario actual + su tenant, o null si no está autenticado.
// Para usar en server components / server actions.
export async function getCurrentUserAndTenant() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return null

  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (!profile?.tenant_id) return { user, profile: null, tenant: null }

  const { data: tenant } = await admin
    .from('tenants')
    .select('*')
    .eq('id', profile.tenant_id)
    .single()

  return { user, profile, tenant }
}
