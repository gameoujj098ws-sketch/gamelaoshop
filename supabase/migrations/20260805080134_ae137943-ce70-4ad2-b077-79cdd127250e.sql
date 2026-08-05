ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS contact_facebook text,
  ADD COLUMN IF NOT EXISTS contact_discord text,
  ADD COLUMN IF NOT EXISTS contact_whatsapp text;