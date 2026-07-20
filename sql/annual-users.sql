-- ============================================================================
-- XIRUTE.COM — Contador anual de usuarios automatico.
-- Ejecutar en el SQL Editor de Supabase. Idempotente.
--
-- Como funciona:
--   "Users" (total)  = fake_users + TODOS los registros reales. Nunca baja.
--   "Annual" (nuevos)= fake_users_annual + registros reales DEL AÑO EN CURSO.
--
-- fake_users_annual_year guarda a que año pertenece ese numero inventado.
-- Cuando cambie el año, deja de sumarse solo y el anual pasa a contar
-- unicamente los registros reales del año nuevo. El total sigue intacto.
-- ============================================================================

ALTER TABLE public.site_config
  ADD COLUMN IF NOT EXISTS fake_users_annual_year int;

-- Atribuye el numero anual actual al año en curso (solo si aun no tiene año).
UPDATE public.site_config
   SET fake_users_annual_year = EXTRACT(YEAR FROM now())::int
 WHERE id = 1 AND fake_users_annual_year IS NULL;

-- Verificacion:
--   SELECT fake_users, fake_users_annual, fake_users_annual_year
--   FROM public.site_config WHERE id = 1;
