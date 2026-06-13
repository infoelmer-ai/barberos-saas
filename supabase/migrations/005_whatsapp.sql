-- ═══════════════════════════════════════════════════════════════════
-- Migración 005 — Notificaciones por WhatsApp
-- ═══════════════════════════════════════════════════════════════════
-- Permite que cada barbería active/desactive las confirmaciones y
-- recordatorios por WhatsApp a sus clientes. El envío real usa la Meta
-- WhatsApp Cloud API (pendiente de conectar la cuenta + plantillas).
--
-- Ejecutar en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════════

ALTER TABLE tenants ADD COLUMN IF NOT EXISTS whatsapp_enabled BOOLEAN DEFAULT true;
