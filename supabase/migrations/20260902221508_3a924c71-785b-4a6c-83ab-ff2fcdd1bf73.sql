CREATE POLICY "Public can view suit images"
ON storage.objects
FOR SELECT
TO anon, authenticated
USING (bucket_id = 'suit-images');

CREATE POLICY "Admins can upload suit images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'suit-images'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);

CREATE POLICY "Admins can delete suit images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'suit-images'
  AND public.has_role(auth.uid(), 'admin'::public.app_role)
);
