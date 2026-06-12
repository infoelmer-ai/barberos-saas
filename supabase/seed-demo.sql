-- ═══════════════════════════════════════════════════════════════════
-- Seed: tenant demo con datos ricos para showcase
-- Ejecutar en SQL Editor de Supabase (idempotente — limpia y recrea)
-- ═══════════════════════════════════════════════════════════════════

-- Limpiar demo previo (cascade limpia barbers, services, appointments)
DELETE FROM tenants WHERE slug = 'demo';

-- Crear tenant demo
WITH new_tenant AS (
  INSERT INTO tenants (slug, name, plan, status, owner_email, owner_name, owner_phone)
  VALUES ('demo', 'Barbería El Maestro', 'pro', 'active', 'demo@barberos.com', 'Carlos Mendoza', '7890-0000')
  RETURNING id
),
-- Insertar barberos
ins_barbers AS (
  INSERT INTO barbers (tenant_id, name, specialty, initials, color)
  SELECT id, name, specialty, initials, color FROM new_tenant CROSS JOIN (VALUES
    ('Carlos Mendoza',  'Cortes Clásicos',     'CM', '#8B6F32'),
    ('Diego Herrera',   'Fade & Degradado',    'DH', '#3A8B5C'),
    ('Andrés López',    'Barba Artesanal',     'AL', '#3A6B8B'),
    ('Miguel Torres',   'Cortes Modernos',     'MT', '#8B3A3A'),
    ('Raúl Vargas',     'Estilos Urbanos',     'RV', '#7A3A8B')
  ) AS b(name, specialty, initials, color)
  RETURNING id, name
),
-- Insertar servicios
ins_services AS (
  INSERT INTO services (tenant_id, name, price, duration_min, emoji)
  SELECT id, name, price, duration_min, emoji FROM new_tenant CROSS JOIN (VALUES
    ('Corte de Pelo',  5, 30, '✂️'),
    ('Corte de Barba', 4, 30, '🪒'),
    ('Corte + Barba',  9, 60, '💈')
  ) AS s(name, price, duration_min, emoji)
  RETURNING id, name, price
)
-- Insertar citas distribuidas en próximos 7 días
INSERT INTO appointments (
  tenant_id, barber_id, service_id, date, time, client_name, client_phone, total, status, pending_charge
)
SELECT
  t.id,
  b.id,
  s.id,
  (CURRENT_DATE + (apt.day_offset || ' days')::interval)::date,
  apt.time::time,
  apt.client_name,
  apt.phone,
  s.price,
  apt.status,
  apt.pending
FROM new_tenant t
CROSS JOIN (VALUES
  -- Hoy
  (0, '09:00', 'Carlos Mendoza',  'Corte de Pelo',  'Juan Pérez',      '7890-1234', 'confirmed', false),
  (0, '10:00', 'Carlos Mendoza',  'Corte + Barba',  'Pedro Ramírez',   '7123-4567', 'confirmed', false),
  (0, '09:30', 'Diego Herrera',   'Corte de Barba', 'Roberto Gómez',   '7234-5678', 'confirmed', false),
  (0, '11:00', 'Andrés López',    'Corte de Pelo',  'Luis García',     '7345-6789', 'confirmed', false),
  (0, '14:00', 'Diego Herrera',   'Corte + Barba',  'Mario Flores',    '7456-7890', 'confirmed', false),
  (0, '15:30', 'Miguel Torres',   'Corte de Pelo',  'Daniel Cruz',     '7567-8901', 'confirmed', false),
  -- Mañana
  (1, '09:30', 'Carlos Mendoza',  'Corte + Barba',  'Sergio Martínez', '7678-9012', 'confirmed', false),
  (1, '11:00', 'Raúl Vargas',     'Corte de Pelo',  'Alex Castillo',   '7789-0123', 'confirmed', false),
  (1, '14:30', 'Andrés López',    'Corte de Barba', 'Iván Rodríguez',  '7890-1235', 'confirmed', false),
  -- En 2 días
  (2, '10:30', 'Miguel Torres',   'Corte + Barba',  'Felipe Ruiz',     '7901-2346', 'confirmed', false),
  (2, '16:00', 'Diego Herrera',   'Corte de Pelo',  'Eduardo Núñez',   '7012-3457', 'confirmed', false),
  -- En 3 días
  (3, '09:00', 'Raúl Vargas',     'Corte de Pelo',  'Marco Antonio',   '7123-4568', 'confirmed', false),
  (3, '11:30', 'Carlos Mendoza',  'Corte + Barba',  'Bryan Méndez',    '7234-5679', 'confirmed', false),
  -- Hace 2 días (historial)
  (-2, '10:00', 'Carlos Mendoza', 'Corte de Pelo',  'Cliente Pasado',  '7345-0001', 'confirmed', false),
  (-2, '14:00', 'Diego Herrera',  'Corte + Barba',  'Histórico Uno',   '7345-0002', 'confirmed', false),
  -- Ayer
  (-1, '11:00', 'Andrés López',   'Corte de Barba', 'Histórico Dos',   '7345-0003', 'confirmed', false),
  -- Una cancelada con cargo pendiente (ejemplo del feature)
  (1, '17:00', 'Miguel Torres',   'Corte de Pelo',  'No-Show Demo',    '7901-0009', 'cancelled', true)
) AS apt(day_offset, time, barber_name, service_name, client_name, phone, status, pending)
JOIN ins_barbers b ON b.name = apt.barber_name
JOIN ins_services s ON s.name = apt.service_name;

-- Confirmar
SELECT
  (SELECT COUNT(*) FROM tenants WHERE slug = 'demo') AS tenants,
  (SELECT COUNT(*) FROM barbers WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo')) AS barbers,
  (SELECT COUNT(*) FROM services WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo')) AS services,
  (SELECT COUNT(*) FROM appointments WHERE tenant_id = (SELECT id FROM tenants WHERE slug = 'demo')) AS appointments;
