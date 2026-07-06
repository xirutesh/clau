-- ============================================================================
-- XIRUTE.COM — Activar RLS con políticas
-- Ejecutar TODO en el SQL Editor de Supabase. Es idempotente (se puede repetir).
--
-- Contexto:
--  - La service_role key (usada por /api/db y /api/pay) BYPASSA RLS: todas las
--    operaciones de admin y las ops del proxy siguen funcionando igual.
--  - El cliente solo accede DIRECTO (anon / token de usuario) a:
--      * SELECT channels        (anon)           -> catálogo público
--      * SELECT site_config      (anon)           -> config pública
--      * SELECT profiles (propio)(token usuario)  -> login lee su propio perfil
--  - El cliente NO escribe directo a estas tablas: todo INSERT/UPDATE/DELETE va
--    por el proxy (service role). Por eso aquí solo hacen falta políticas SELECT.
--
-- Qué cierra: hoy, con RLS OFF, la anon key puede leer TODOS los perfiles
--   (emails, roles, delivery_link de todos). Tras esto, anon no lee profiles y
--   un usuario autenticado solo lee SU propia fila.
-- ============================================================================

-- 1) Activar RLS (no usamos FORCE, así el owner/triggers SECURITY DEFINER siguen operando)
ALTER TABLE public.channels    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.site_config ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles    ENABLE ROW LEVEL SECURITY;

-- 2) channels: lectura pública. Escrituras solo por service role (bypass RLS).
DROP POLICY IF EXISTS channels_public_read ON public.channels;
CREATE POLICY channels_public_read ON public.channels
  FOR SELECT TO anon, authenticated
  USING (true);

-- 3) site_config: lectura pública (ya lo era). Escrituras solo por service role.
--    NOTA: expone también global_delivery_link/manual_payments a cualquiera, igual
--    que hoy. Endurecer por columnas es un paso aparte (requiere tocar el cliente).
DROP POLICY IF EXISTS site_config_public_read ON public.site_config;
CREATE POLICY site_config_public_read ON public.site_config
  FOR SELECT TO anon, authenticated
  USING (true);

-- 4) profiles: cada usuario lee SOLO su propia fila. anon no lee nada.
--    Admin y "contar usuarios" pasan por el proxy (service role) -> bypass RLS.
DROP POLICY IF EXISTS profiles_select_own ON public.profiles;
CREATE POLICY profiles_select_own ON public.profiles
  FOR SELECT TO authenticated
  USING (auth.uid() = id);

-- Sin políticas de INSERT/UPDATE/DELETE para anon/authenticated: quedan denegadas
-- por defecto (RLS ON + sin policy = deny). Todas las escrituras van por service role.

-- ============================================================================
-- Verificación rápida (opcional):
--   SELECT relname, relrowsecurity FROM pg_class
--   WHERE relname IN ('channels','site_config','profiles');   -- rowsecurity = true
--   SELECT tablename, policyname, cmd FROM pg_policies WHERE schemaname='public';
-- ============================================================================
