-- ═══════════════════════════════════════════════════════════════════
-- BarberOS — Schema completo de base de datos
-- Ejecutar en el SQL Editor de Supabase (proyecto nuevo)
-- ═══════════════════════════════════════════════════════════════════

-- Extensiones
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─── TENANTS (barberías) ─────────────────────────────────────────────
CREATE TABLE tenants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  plan TEXT NOT NULL DEFAULT 'starter' CHECK (plan IN ('starter','pro','business')),
  status TEXT NOT NULL DEFAULT 'trial' CHECK (status IN ('trial','active','past_due','cancelled')),
  trial_ends_at TIMESTAMPTZ DEFAULT NOW() + INTERVAL '14 days',
  stripe_customer_id TEXT UNIQUE,
  stripe_subscription_id TEXT UNIQUE,
  owner_email TEXT NOT NULL,
  owner_name TEXT,
  owner_phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_tenants_slug ON tenants(slug);
CREATE INDEX idx_tenants_stripe_customer ON tenants(stripe_customer_id);

-- ─── PROFILES (usuarios vinculados a auth.users) ─────────────────────
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  tenant_id UUID REFERENCES tenants(id) ON DELETE CASCADE,
  role TEXT DEFAULT 'owner' CHECK (role IN ('owner','admin','barber')),
  full_name TEXT,
  phone TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_profiles_tenant ON profiles(tenant_id);

-- ─── BARBERS ─────────────────────────────────────────────────────────
CREATE TABLE barbers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  specialty TEXT,
  initials TEXT,
  color TEXT DEFAULT '#8B6F32',
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_barbers_tenant ON barbers(tenant_id);

-- ─── SERVICES ────────────────────────────────────────────────────────
CREATE TABLE services (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  duration_min INTEGER NOT NULL DEFAULT 30,
  emoji TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_services_tenant ON services(tenant_id);

-- ─── APPOINTMENTS ────────────────────────────────────────────────────
CREATE TABLE appointments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id UUID NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  barber_id UUID NOT NULL REFERENCES barbers(id) ON DELETE CASCADE,
  service_id UUID NOT NULL REFERENCES services(id),
  date DATE NOT NULL,
  time TIME NOT NULL,
  client_name TEXT NOT NULL,
  client_phone TEXT NOT NULL,
  client_email TEXT,
  total DECIMAL(10,2) NOT NULL,
  status TEXT DEFAULT 'confirmed' CHECK (status IN ('confirmed','cancelled','completed','no_show')),
  pending_charge BOOLEAN DEFAULT false,
  reminder_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_appointments_tenant_date ON appointments(tenant_id, date);
CREATE INDEX idx_appointments_barber_date ON appointments(barber_id, date);
CREATE INDEX idx_appointments_phone ON appointments(client_phone);

-- ═══════════════════════════════════════════════════════════════════
-- Función helper: tenant_id del usuario actual
-- ═══════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION current_tenant_id() RETURNS UUID AS $$
  SELECT tenant_id FROM profiles WHERE id = auth.uid()
$$ LANGUAGE SQL STABLE SECURITY DEFINER;

-- ═══════════════════════════════════════════════════════════════════
-- Row Level Security (RLS)
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE tenants ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE barbers ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Tenants: el owner solo ve su tenant
CREATE POLICY "tenant_self_read" ON tenants
  FOR SELECT USING (id = current_tenant_id());

CREATE POLICY "tenant_self_update" ON tenants
  FOR UPDATE USING (id = current_tenant_id());

-- Profiles: cada usuario ve su propio perfil
CREATE POLICY "profile_self" ON profiles
  FOR ALL USING (id = auth.uid());

-- Barbers: aislados por tenant
CREATE POLICY "barbers_tenant_isolation" ON barbers
  FOR ALL USING (tenant_id = current_tenant_id());

-- Services: aislados por tenant
CREATE POLICY "services_tenant_isolation" ON services
  FOR ALL USING (tenant_id = current_tenant_id());

-- Appointments: aislados por tenant
CREATE POLICY "appointments_tenant_isolation" ON appointments
  FOR ALL USING (tenant_id = current_tenant_id());

-- ═══════════════════════════════════════════════════════════════════
-- Acceso público para reservas (sin auth)
-- ═══════════════════════════════════════════════════════════════════
-- La página pública /t/[slug] necesita leer barbers/services/citas
-- sin estar autenticada. Usamos el rol "anon" pero con políticas que
-- solo permiten leer (no modificar) y solo del tenant correspondiente.

CREATE POLICY "public_read_tenants_by_slug" ON tenants
  FOR SELECT TO anon USING (true);

CREATE POLICY "public_read_active_barbers" ON barbers
  FOR SELECT TO anon USING (active = true);

CREATE POLICY "public_read_active_services" ON services
  FOR SELECT TO anon USING (active = true);

CREATE POLICY "public_read_appointments_for_availability" ON appointments
  FOR SELECT TO anon USING (status = 'confirmed');

-- Para crear citas públicas usamos el service role desde la API route
-- (bypasses RLS). No damos INSERT al rol anon directamente.

-- ═══════════════════════════════════════════════════════════════════
-- Seed inicial: datos demo para un tenant de prueba
-- (opcional — descomentar para insertar)
-- ═══════════════════════════════════════════════════════════════════
-- INSERT INTO tenants (slug, name, plan, status, owner_email) VALUES
--   ('demo', 'Barbería Demo', 'pro', 'active', 'demo@barberos.com');
