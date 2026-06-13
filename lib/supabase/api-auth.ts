import { getCurrentUserAndTenant } from './auth-helpers'
import type { Tenant } from './types'

// Para usar en API route handlers que mutan datos del tenant.
// Devuelve el tenant del usuario autenticado, o null si no está autorizado.
export async function requireTenantOwner(): Promise<Tenant | null> {
  const session = await getCurrentUserAndTenant()
  if (!session?.user || !session.tenant) return null
  return session.tenant
}
