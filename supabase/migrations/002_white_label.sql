-- ═══════════════════════════════════════════════════════════════════
-- Migración 002 — Marca blanca (white label)
-- ═══════════════════════════════════════════════════════════════════
-- Agrega columnas para que las barberías plan Business personalicen su
-- página pública con su propio logo y color de marca.
--   logo_url    — data URL (base64) de un logo pequeño, o null
--   brand_color — color principal en hex (default: dorado de BarberOS)
--
-- Ejecutar en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS logo_url TEXT;
ALTER TABLE tenants ADD COLUMN IF NOT EXISTS brand_color TEXT DEFAULT '#C9A84C';
