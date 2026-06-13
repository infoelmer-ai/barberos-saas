// Seed del tenant demo con datos ricos.
// Uso: node scripts/seed-demo.mjs (requiere .env.local con keys de Supabase)
import { createClient } from '@supabase/supabase-js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { dirname, join } from 'node:path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const envText = readFileSync(join(__dirname, '..', '.env.local'), 'utf8')
const env = Object.fromEntries(
  envText
    .split('\n')
    .filter((l) => l.includes('=') && !l.startsWith('#'))
    .map((l) => {
      const idx = l.indexOf('=')
      return [l.slice(0, idx).trim(), l.slice(idx + 1).trim()]
    })
)

const url = env.NEXT_PUBLIC_SUPABASE_URL
const key = env.SUPABASE_SERVICE_ROLE_KEY
if (!url || !key) {
  console.error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
  process.exit(1)
}

const supabase = createClient(url, key, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const fmtDate = (offset) => {
  const d = new Date()
  d.setDate(d.getDate() + offset)
  return d.toISOString().split('T')[0]
}

async function main() {
  console.log('🧹 Limpiando demo previo...')
  await supabase.from('tenants').delete().eq('slug', 'demo')

  console.log('🏪 Creando tenant demo...')
  const { data: tenant, error: te } = await supabase
    .from('tenants')
    .insert({
      slug: 'demo',
      name: 'Barbería El Maestro',
      plan: 'business',
      status: 'active',
      owner_email: 'demo@barberos.com',
      owner_name: 'Carlos Mendoza',
      owner_phone: '7890-0000',
    })
    .select()
    .single()
  if (te) throw te

  console.log('💈 Insertando 5 barberos...')
  const { data: barbers, error: be } = await supabase
    .from('barbers')
    .insert([
      { tenant_id: tenant.id, name: 'Carlos Mendoza', specialty: 'Cortes Clásicos', initials: 'CM', color: '#8B6F32' },
      { tenant_id: tenant.id, name: 'Diego Herrera', specialty: 'Fade & Degradado', initials: 'DH', color: '#3A8B5C' },
      { tenant_id: tenant.id, name: 'Andrés López', specialty: 'Barba Artesanal', initials: 'AL', color: '#3A6B8B' },
      { tenant_id: tenant.id, name: 'Miguel Torres', specialty: 'Cortes Modernos', initials: 'MT', color: '#8B3A3A' },
      { tenant_id: tenant.id, name: 'Raúl Vargas', specialty: 'Estilos Urbanos', initials: 'RV', color: '#7A3A8B' },
    ])
    .select()
  if (be) throw be

  console.log('✂️  Insertando 3 servicios...')
  const { data: services, error: se } = await supabase
    .from('services')
    .insert([
      { tenant_id: tenant.id, name: 'Corte de Pelo', price: 5, duration_min: 30, emoji: '✂️' },
      { tenant_id: tenant.id, name: 'Corte de Barba', price: 4, duration_min: 30, emoji: '🪒' },
      { tenant_id: tenant.id, name: 'Corte + Barba', price: 9, duration_min: 60, emoji: '💈' },
    ])
    .select()
  if (se) throw se

  const b = Object.fromEntries(barbers.map((x) => [x.name, x.id]))
  const s = Object.fromEntries(services.map((x) => [x.name, { id: x.id, price: x.price }]))

  console.log('📅 Insertando citas...')
  const apts = [
    // Hoy
    [0, '09:00', 'Carlos Mendoza', 'Corte de Pelo', 'Juan Pérez', '7890-1234'],
    [0, '10:00', 'Carlos Mendoza', 'Corte + Barba', 'Pedro Ramírez', '7123-4567'],
    [0, '09:30', 'Diego Herrera', 'Corte de Barba', 'Roberto Gómez', '7234-5678'],
    [0, '11:00', 'Andrés López', 'Corte de Pelo', 'Luis García', '7345-6789'],
    [0, '14:00', 'Diego Herrera', 'Corte + Barba', 'Mario Flores', '7456-7890'],
    [0, '15:30', 'Miguel Torres', 'Corte de Pelo', 'Daniel Cruz', '7567-8901'],
    // Mañana
    [1, '09:30', 'Carlos Mendoza', 'Corte + Barba', 'Sergio Martínez', '7678-9012'],
    [1, '11:00', 'Raúl Vargas', 'Corte de Pelo', 'Alex Castillo', '7789-0123'],
    [1, '14:30', 'Andrés López', 'Corte de Barba', 'Iván Rodríguez', '7890-1235'],
    // En 2 días
    [2, '10:30', 'Miguel Torres', 'Corte + Barba', 'Felipe Ruiz', '7901-2346'],
    [2, '16:00', 'Diego Herrera', 'Corte de Pelo', 'Eduardo Núñez', '7012-3457'],
    // En 3 días
    [3, '09:00', 'Raúl Vargas', 'Corte de Pelo', 'Marco Antonio', '7123-4568'],
    [3, '11:30', 'Carlos Mendoza', 'Corte + Barba', 'Bryan Méndez', '7234-5679'],
    // Historial
    [-2, '10:00', 'Carlos Mendoza', 'Corte de Pelo', 'Histórico Uno', '7345-0001'],
    [-2, '14:00', 'Diego Herrera', 'Corte + Barba', 'Histórico Dos', '7345-0002'],
    [-1, '11:00', 'Andrés López', 'Corte de Barba', 'Histórico Tres', '7345-0003'],
    // Clientes que REGRESAN (mismo teléfono) → para que la retención se vea real
    [4, '10:00', 'Diego Herrera', 'Corte + Barba', 'Juan Pérez', '7890-1234'],
    [5, '11:00', 'Carlos Mendoza', 'Corte de Pelo', 'Pedro Ramírez', '7123-4567'],
    [6, '09:30', 'Andrés López', 'Corte de Barba', 'Roberto Gómez', '7234-5678'],
    [-3, '15:00', 'Miguel Torres', 'Corte de Pelo', 'Luis García', '7345-6789'],
    [-5, '16:00', 'Carlos Mendoza', 'Corte + Barba', 'Juan Pérez', '7890-1234'],
  ]
  const rows = apts.map(([day, time, bn, sn, cn, ph]) => ({
    tenant_id: tenant.id,
    barber_id: b[bn],
    service_id: s[sn].id,
    date: fmtDate(day),
    time,
    client_name: cn,
    client_phone: ph,
    total: s[sn].price,
    status: 'confirmed',
  }))
  // Una cancelada con cargo pendiente
  rows.push({
    tenant_id: tenant.id,
    barber_id: b['Miguel Torres'],
    service_id: s['Corte de Pelo'].id,
    date: fmtDate(1),
    time: '17:00',
    client_name: 'No-Show Demo',
    client_phone: '7901-0009',
    total: s['Corte de Pelo'].price,
    status: 'cancelled',
    pending_charge: true,
  })

  const { error: ae } = await supabase.from('appointments').insert(rows)
  if (ae) throw ae

  console.log('✅ Seed completo')
  console.log(`   Tenant:       ${tenant.name} (slug: demo)`)
  console.log(`   Barberos:     ${barbers.length}`)
  console.log(`   Servicios:    ${services.length}`)
  console.log(`   Citas:        ${rows.length} (incluye historial + futuro + 1 cancelada)`)
}

main().catch((e) => {
  console.error('❌ Error:', e)
  process.exit(1)
})
