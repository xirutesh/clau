-- ============================================================================
-- XIRUTE.COM — Activar RLS con políticas (TODAS las tablas)
-- Ejecutar TODO en el SQL Editor de Supabase. Es idempotente (se puede repetir).
--
-- Contexto (verificado contra el código de app/page.jsx y app/api/db):
--  - La service_role key (usada por /api/db, /api/pay, /api/gift) BYPASSA RLS:
--    TODO el admin y las escrituras del proxy siguen funcionando igual.
--  - El cliente solo accede DIRECTO (anon / token de usuario) a:
--      * SELECT channels          (anon)            -> catálogo público  (page.jsx:404)
--      * SELECT site_config        (anon)            -> config pública    (page.jsx:404)
--      * SELECT profiles (la suya) (token usuario)   -> login lee su perfil (page.jsx:172/174)
--  - El cliente NO escribe directo a ninguna tabla: cada INSERT/UPDATE/DELETE va
--    por el proxy (service role). Por eso solo hacen falta políticas de SELECT.
--
-- Qué cierra: hoy, con RLS OFF, la anon key puede leer/editar/borrar TODO
--   (emails, roles y delivery_link de todos los perfiles incluidos). Tras esto:
--   anon no lee profiles, un usuario solo lee SU fila, y nadie (salvo service
--   role) puede escribir.
-- ============================================================================

-- 1) Activar RLS. No usamos FORCE, así el owner y los triggers SECURITY DEFINER
--    (p. ej. el que crea profiles al registrarse) siguen operando.
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

-- 5) gift_submissions: RLS ON sin políticas -> SOLO service role (proxy /api/gift).
--    Se protege solo si la tabla existe (por si aún no corriste gift-submissions.sql),
--    para que este script no falle en ese caso.
DO $$
BEGIN
  IF to_regclass('public.gift_submissions') IS NOT NULL THEN
    EXECUTE 'ALTER TABLE public.gift_submissions ENABLE ROW LEVEL SECURITY';
    -- Sin políticas a propósito: anon/authenticated quedan denegados por defecto.
  END IF;
END $$;

-- Sin políticas de INSERT/UPDATE/DELETE para anon/authenticated: quedan denegadas
-- por defecto (RLS ON + sin policy = deny). Todas las escrituras van por service role.

-- ============================================================================
-- Verificación (ejecuta esto después; debe salir todo con RLS activado):
--
--   -- 5a) ¿Qué tablas de 'public' tienen RLS activado?  (rowsecurity debe ser true)
--   SELECT relname AS tabla, relrowsecurity AS rls_on
--   FROM pg_class
--   WHERE relnamespace = 'public'::regnamespace AND relkind = 'r'
--   ORDER BY relname;
--
--   -- 5b) Políticas creadas
--   SELECT tablename, policyname, cmd, roles
--   FROM pg_policies WHERE schemaname = 'public' ORDER BY tablename;
--
-- Si en 5a aparece ALGUNA tabla tuya con rls_on = false, protégela también:
--   ALTER TABLE public.<tabla> ENABLE ROW LEVEL SECURITY;
--   -- y añade su política de SELECT si el cliente la lee directo; si no, déjala
--   -- sin políticas (solo service role podrá tocarla).
-- ============================================================================
