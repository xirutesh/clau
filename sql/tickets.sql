-- ============================================================================
-- UflashBrazil.TV — Tickets creados desde el sitio (soporte / legal / removal).
-- Ejecutar en Supabase -> SQL Editor. Idempotente.
-- RLS ON sin políticas: solo la service role (/api/ticket y el admin via /api/db)
-- puede leer/escribir. anon/authenticated quedan denegados por defecto.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.tickets (
  id         bigserial PRIMARY KEY,
  type       text,                       -- 'legal' | 'removal' | 'support'
  contact    text,                       -- email/telegram opcional para responder
  subject    text,
  message    text,
  status     text DEFAULT 'open',        -- open | closed
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.tickets ENABLE ROW LEVEL SECURITY;
-- Sin políticas a propósito: acceso solo por service role (bypass RLS).

CREATE INDEX IF NOT EXISTS tickets_status_idx  ON public.tickets (status);
CREATE INDEX IF NOT EXISTS tickets_created_idx ON public.tickets (created_at DESC);
