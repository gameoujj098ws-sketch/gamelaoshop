
ALTER TABLE public.topup_requests
  ADD COLUMN IF NOT EXISTS reference_code TEXT,
  ADD COLUMN IF NOT EXISTS verified_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS verified_amount BIGINT,
  ADD COLUMN IF NOT EXISTS verified_name TEXT,
  ADD COLUMN IF NOT EXISTS verified_ref TEXT;

ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS bank_qr_image_url TEXT;

CREATE INDEX IF NOT EXISTS topup_requests_user_status_idx
  ON public.topup_requests (user_id, status, expires_at DESC);
