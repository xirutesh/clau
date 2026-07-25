-- ============================================================================
-- UflashBrazil.TV — Tickets creados desde el sitio por usuarios con sesion.
-- Ejecutar en Supabase -> SQL Editor. Idempotente (se puede repetir).
-- RLS ON sin políticas: solo la service role (/api/ticket y el admin via /api/db)
-- puede leer/escribir. El usuario ve SUS tickets a traves de /api/ticket (GET).
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tickets (
  id         bigserial PRIMARY KEY,
  type       text,                       -- 'legal' | 'removal' | 'support'
  subject    text,
  message    text,
  status     text DEFAULT 'open',        -- open | closed
  user_id    uuid,                        -- dueño del ticket (cuenta con sesion)
  username   text,
  created_at timestamptz DEFAULT now()
);

-- Por si la tabla ya existia de una version anterior:
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS user_id  uuid;
ALTER TABLE public.tickets ADD COLUMN IF NOT EXISTS username text;

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
-- Sin políticas a propósito: acceso solo por service role (bypass RLS).

CREATE INDEX IF NOT EXISTS tickets_status_idx  ON public.tickets (status);
CREATE INDEX IF NOT EXISTS tickets_created_idx ON public.tickets (created_at DESC);
CREATE INDEX IF NOT EXISTS tickets_user_idx    ON public.tickets (user_id);
