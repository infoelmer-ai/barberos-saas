-- ═══════════════════════════════════════════════════════════════════
-- Migración 001 — Cerrar fuga de PII por el anon key
-- ═══════════════════════════════════════════════════════════════════
-- PROBLEMA: las políticas "public_read_*" daban acceso de lectura al rol
-- anon (cuya llave es PÚBLICA, va en el bundle del navegador). Esto exponía
-- a cualquiera: owner_email + Stripe IDs de todas las barberías, y nombres
-- + teléfonos de todos los clientes de todas las citas.
--
-- SOLUCIÓN: la app NO usa el anon key para leer datos — todas las páginas
-- públicas y APIs usan el service role (server-side, llave secreta) que
-- ignora RLS. Por lo tanto estas políticas anon son innecesarias. Las
-- quitamos. Con RLS habilitado y sin políticas anon, el rol anon obtiene
-- CERO filas. El service role sigue funcionando normal.
--
-- Ejecutar en el SQL Editor de Supabase.
-- ═══════════════════════════════════════════════════════════════════

DROP POLICY IF EXISTS "public_read_tenants_by_slug" ON tenants;
DROP POLICY IF EXISTS "public_read_active_barbers" ON barbers;
DROP POLICY IF EXISTS "public_read_active_services" ON services;
DROP POLICY IF EXISTS "public_read_appointments_for_availability" ON appointments;

-- Verificación: el anon ya no debe poder leer nada de estas tablas.
-- (Después de correr esto, probar con el anon key — debe devolver []).

-- Confirmar que RLS sigue habilitado en todas las tablas sensibles:
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('tenants','profiles','barbers','services','appointments');
