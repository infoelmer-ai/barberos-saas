-- ═══════════════════════════════════════════════════════════════════
-- Migración 003 — Trial de 14 días gestionado por nosotros
-- ═══════════════════════════════════════════════════════════════════
-- n1co no soporta primer ciclo gratis, así que el trial lo manejamos en
-- la app: status='trial' por 14 días, y un cron diario convierte/cobra al
-- vencer. Estas columnas guardan el token de pago (para cobrar al final con
-- n1co) y banderas para no duplicar correos.
--
-- Ejecutar en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS payment_token TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS payment_provider TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_reminder_3d_sent BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_reminder_1d_sent BOOLEAN DEFAULT false;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS trial_ended_notified BOOLEAN DEFAULT false;
