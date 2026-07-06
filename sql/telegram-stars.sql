-- Telegram Stars: tasa de conversion global (Stars por 1 USD).
-- Ejecutar en el SQL Editor de Supabase. Idempotente.
-- El bot calcula: stars = round(precio_usd_del_canal * stars_per_usd).
ALTER TABLE public.site_config ADD COLUMN IF NOT EXISTS stars_per_usd numeric DEFAULT 50;
UPDATE public.site_config SET stars_per_usd = 50 WHERE id = 1 AND stars_per_usd IS NULL;
