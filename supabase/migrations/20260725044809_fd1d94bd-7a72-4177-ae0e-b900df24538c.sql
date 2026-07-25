
CREATE POLICY "slips_user_insert" ON storage.objects
  FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'slips' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "slips_user_read" ON storage.objects
  FOR SELECT TO authenticated
  USING (bucket_id = 'slips' AND ((storage.foldername(name))[1] = auth.uid()::text OR public.has_role(auth.uid(), 'admin')));
