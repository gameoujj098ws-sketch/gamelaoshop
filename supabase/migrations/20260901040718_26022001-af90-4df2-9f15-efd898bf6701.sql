-- 1) site settings: channel toggles + card value/fee
ALTER TABLE public.site_settings
  ADD COLUMN IF NOT EXISTS enable_card_topup boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_code_topup boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS enable_qr_topup boolean NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS card_topup_value bigint NOT NULL DEFAULT 10000,
  ADD COLUMN IF NOT EXISTS card_topup_fee_percent integer NOT NULL DEFAULT 40;

-- 2) card top-ups
CREATE TABLE IF NOT EXISTS public.card_topups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  card_number text NOT NULL,
  card_value bigint NOT NULL DEFAULT 10000,
  fee_percent integer NOT NULL DEFAULT 0,
  credit_amount bigint NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending',
  admin_note text,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT ON public.card_topups TO authenticated;
GRANT ALL ON public.card_topups TO service_role;

ALTER TABLE public.card_topups ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own card topups" ON public.card_topups
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Users create own card topups" ON public.card_topups
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER card_topups_updated_at BEFORE UPDATE ON public.card_topups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS card_topups_user_idx ON public.card_topups(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS card_topups_status_idx ON public.card_topups(status, created_at DESC);

-- 3) multi-use redeem codes
ALTER TABLE public.redeem_codes
  ADD COLUMN IF NOT EXISTS max_uses integer NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS used_count integer NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.redeem_code_uses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code_id uuid NOT NULL REFERENCES public.redeem_codes(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  amount bigint NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (code_id, user_id)
);

GRANT SELECT ON public.redeem_code_uses TO authenticated;
GRANT ALL ON public.redeem_code_uses TO service_role;

ALTER TABLE public.redeem_code_uses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view own code uses" ON public.redeem_code_uses
  FOR SELECT TO authenticated USING (auth.uid() = user_id OR public.has_role(auth.uid(), 'admin'));