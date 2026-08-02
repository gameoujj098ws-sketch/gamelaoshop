CREATE TABLE public.card_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.prepaid_cards(id) ON DELETE CASCADE,
  name text NOT NULL,
  price bigint NOT NULL DEFAULT 0,
  original_price bigint,
  image_url text,
  description text,
  stock integer NOT NULL DEFAULT 0,
  is_best_seller boolean NOT NULL DEFAULT false,
  sort_order integer NOT NULL DEFAULT 0,
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.card_packages TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_packages TO authenticated;
GRANT ALL ON public.card_packages TO service_role;
ALTER TABLE public.card_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY cpkg_read_all ON public.card_packages FOR SELECT TO anon, authenticated USING (is_active = true);
CREATE POLICY cpkg_admin_all ON public.card_packages FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE TABLE public.card_input_fields (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  card_id uuid NOT NULL REFERENCES public.prepaid_cards(id) ON DELETE CASCADE,
  label text NOT NULL,
  placeholder text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT ON public.card_input_fields TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.card_input_fields TO authenticated;
GRANT ALL ON public.card_input_fields TO service_role;
ALTER TABLE public.card_input_fields ENABLE ROW LEVEL SECURITY;
CREATE POLICY cif2_read_all ON public.card_input_fields FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY cif2_admin_all ON public.card_input_fields FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::app_role)) WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;
CREATE TRIGGER update_card_packages_updated_at BEFORE UPDATE ON public.card_packages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();