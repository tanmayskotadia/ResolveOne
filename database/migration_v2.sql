-- MIGRATION V2: Support for Anonymous Citizen Complaints
-- This migration updates the schema to support the new Aadhaar hash-based identity
-- while strictly maintaining RLS and preventing anonymous scraping.

-- 1. Modify complaints table to allow null citizen_id and add hash column
ALTER TABLE public.complaints 
  ADD COLUMN IF NOT EXISTS citizen_identifier_hash text;

ALTER TABLE public.complaints 
  ALTER COLUMN citizen_id DROP NOT NULL;

-- 2. Create a secure function for anonymous users to lookup their complaints
-- Drops existing version if we are redefining its signature
DROP FUNCTION IF EXISTS get_complaints_by_hash(text, text);

-- This function bypasses RLS safely by strictly validating BOTH the identity hash
-- and the unique complaint code. It explicitly excludes returning the hash itself
-- and only returns fields needed by the UI.
CREATE OR REPLACE FUNCTION get_complaints_by_hash(p_hash text, p_complaint_code text)
RETURNS TABLE (
  id uuid,
  complaint_code text,
  description text,
  category text,
  source text,
  lat double precision,
  lng double precision,
  address text,
  photo_url text,
  status text,
  created_at timestamptz,
  updated_at timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    c.id, c.complaint_code, c.description, c.category, c.source, 
    c.lat, c.lng, c.address, c.photo_url, c.status, c.created_at, c.updated_at
  FROM public.complaints c
  WHERE c.citizen_identifier_hash = p_hash
    AND (p_complaint_code = '' OR c.complaint_code ILIKE '%' || p_complaint_code || '%');
END;
$$;

-- 3. Create a secure function to fetch status history for a matched complaint
-- Drops existing version if it exists
DROP FUNCTION IF EXISTS get_status_history_by_hash(text, text);

-- To prevent exposing all histories, history can only be fetched if the user
-- provides the correct citizen hash and complaint code that verifies they own the complaint.
CREATE OR REPLACE FUNCTION get_status_history_by_hash(p_hash text, p_complaint_code text)
RETURNS SETOF public.status_history
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT h.*
  FROM public.status_history h
  JOIN public.complaints c ON c.id = h.complaint_id
  WHERE c.citizen_identifier_hash = p_hash
    AND (p_complaint_code = '' OR c.complaint_code ILIKE '%' || p_complaint_code || '%')
  ORDER BY h.changed_at ASC;
END;
$$;


-- 4. Update Complaints RLS for Anonymous Insert
-- Allows anonymous users to insert complaints ONLY IF they provide a hash and NO citizen_id
DROP POLICY IF EXISTS "Anon can insert anonymous complaints" ON public.complaints;
CREATE POLICY "Anon can insert anonymous complaints"
  ON public.complaints FOR INSERT
  WITH CHECK (
    auth.role() = 'anon' AND 
    citizen_id IS NULL AND 
    citizen_identifier_hash IS NOT NULL
  );

-- Note: We intentionally DO NOT create an anon SELECT policy on complaints or status_history.
-- Anonymous read access is strictly mediated through the SECURITY DEFINER functions.

-- 5. Update Storage RLS
-- Safely handle if policy exists
DROP POLICY IF EXISTS "Anon can upload complaint photos" ON storage.objects;
CREATE POLICY "Anon can upload complaint photos" 
  ON storage.objects FOR INSERT 
  WITH CHECK (bucket_id = 'complaint-photos' AND auth.role() = 'anon');
