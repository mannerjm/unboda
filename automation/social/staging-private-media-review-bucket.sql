-- STAGING ONLY. A private Supabase Storage review bucket. Zero objects at creation.
-- No public/signed URLs, no social posting, no customer/payment integration.
-- Server-side service role upload only; do NOT grant storage.objects permissions
-- or any bucket policies to anonymous/authenticated roles.
DO $$
DECLARE present storage.buckets%ROWTYPE;
BEGIN
 SELECT * INTO present FROM storage.buckets
  WHERE id='unboda-social-private-review' FOR UPDATE;
 IF NOT FOUND THEN
  INSERT INTO storage.buckets (
   id,name,public,file_size_limit,allowed_mime_types
  ) VALUES (
   'unboda-social-private-review',
   'unboda-social-private-review',
   false,45000000,
   ARRAY['video/mp4','image/jpeg','audio/wav','application/json']::text[]
  );
 ELSE
  IF present.public IS DISTINCT FROM false OR
   present.file_size_limit IS DISTINCT FROM 45000000 OR
   present.allowed_mime_types IS DISTINCT FROM
      ARRAY['video/mp4','image/jpeg','audio/wav','application/json']::text[]
  THEN
   RAISE EXCEPTION 'PRIVATE_MEDIA_BUCKET_POLICY_DRIFT';
  END IF;
 END IF;
END $$;
