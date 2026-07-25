-- UflashBrazil.TV — Borrar la foto de TODOS los productos para volver a subirlas
-- (las nuevas se grabaran con el watermark www.uflashbrazil.tv).
-- Ejecutar en Supabase -> SQL Editor. Los demas datos del producto NO se tocan.
UPDATE public.channels SET image_url = NULL;
