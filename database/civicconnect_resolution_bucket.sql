-- Create the storage bucket for resolution photos if it doesn't exist
INSERT INTO storage.buckets (id, name, public)
VALUES ('complaint-resolution-photos', 'complaint-resolution-photos', true)
ON CONFLICT (id) DO NOTHING;

-- Drop existing policies just in case
DROP POLICY IF EXISTS "Anon can upload complaint-resolution-photos" ON storage.objects;
DROP POLICY IF EXISTS "Auth users can upload complaint-resolution-photos" ON storage.objects;
DROP POLICY IF EXISTS "Anyone can read complaint-resolution-photos" ON storage.objects;

-- Allow anonymous users to upload photos (since Authority dashboard is currently using demo login)
CREATE POLICY "Anon can upload complaint-resolution-photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'complaint-resolution-photos'
    AND auth.role() = 'anon'
  );

-- Allow authenticated users to upload photos
CREATE POLICY "Auth users can upload complaint-resolution-photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'complaint-resolution-photos'
    AND auth.role() = 'authenticated'
  );

-- Allow anyone to read the resolution photos
CREATE POLICY "Anyone can read complaint-resolution-photos"
  ON storage.objects FOR SELECT
  USING ( bucket_id = 'complaint-resolution-photos' );
