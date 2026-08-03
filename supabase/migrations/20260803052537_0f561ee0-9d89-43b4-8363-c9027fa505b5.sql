ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS logo_url text,
  ADD COLUMN IF NOT EXISTS slide_images jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS slide_interval integer NOT NULL DEFAULT 4,
  ADD COLUMN IF NOT EXISTS ad_images jsonb NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS card_id uuid REFERENCES public.prepaid_cards(id),
  ADD COLUMN IF NOT EXISTS card_package_id uuid REFERENCES public.card_packages(id);