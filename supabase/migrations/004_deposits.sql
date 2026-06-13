-- ═══════════════════════════════════════════════════════════════════
-- Migración 004 — Anticipo (depósito) para reducir no-shows
-- ═══════════════════════════════════════════════════════════════════
-- Permite que cada barbería exija un anticipo (% del servicio) al reservar.
-- El cobro real del anticipo al cliente se hará con n1co (pendiente de
-- sandbox); estas columnas guardan la configuración por barbería.
--
-- Ejecutar en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deposit_enabled BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS deposit_percent INTEGER DEFAULT 50;

-- Marca en cada cita si su anticipo ya fue cobrado (para cuando entre n1co)
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deposit_paid BOOLEAN DEFAULT false;
ALTER TABLE appointments ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) DEFAULT 0;
