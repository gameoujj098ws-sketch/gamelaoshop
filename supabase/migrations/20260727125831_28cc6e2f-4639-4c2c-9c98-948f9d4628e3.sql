ALTER TABLE public.packages
  ADD COLUMN IF NOT EXISTS image_url text,
  ADD COLUMN IF NOT EXISTS description text,
  ADD COLUMN IF NOT EXISTS original_price bigint,
  ADD COLUMN IF NOT EXISTS is_best_seller boolean NOT NULL DEFAULT false;