-- ============================================================================
-- XIRUTE.COM — Tabla de pagos manuales (Gift Card). Ejecutar en el SQL Editor.
-- Idempotente. RLS ON sin políticas: solo la service role (proxy / /api/gift)
-- puede leer/escribir. anon/authenticated quedan denegados por defecto.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.gift_submissions (
  id           bigserial PRIMARY KEY,
  channel_id   bigint,
  channel_name text,
  price        numeric,
  user_id      uuid,
  username     text,
  method       text DEFAULT 'Gift Card',
  code         text,
  photo        text,          -- data URL (base64) de la foto del comprobante
  status       text DEFAULT 'pending',   -- pending | accepted | rejected
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE public.gift_submissions ENABLE ROW LEVEL SECURITY;
-- Sin políticas a propósito: acceso solo por service role (bypass RLS).

CREATE INDEX IF NOT EXISTS gift_submissions_status_idx ON public.gift_submissions (status);
CREATE INDEX IF NOT EXISTS gift_submissions_created_idx ON public.gift_submissions (created_at DESC);
