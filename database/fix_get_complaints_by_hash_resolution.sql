-- ============================================================
-- CivicConnect — Patch: Add resolution_photo_url to get_complaints_by_hash RPC
--
-- ROOT CAUSE:
--   The get_complaints_by_hash function's RETURNS TABLE definition
--   did not include resolution_photo_url. So the citizen Track Complaint
--   page always received NULL for that field even when the authority had
--   uploaded a resolution photo. The UI fallback then showed
--   "Resolution proof has not been uploaded yet."
--
-- HOW TO APPLY:
--   1. Open Supabase Dashboard → SQL Editor
--   2. Paste and run this entire script
--   3. After running, re-search the complaint on the citizen page — the photo will appear
-- ============================================================

DROP FUNCTION IF EXISTS public.get_complaints_by_hash(text, text);

CREATE OR REPLACE FUNCTION public.get_complaints_by_hash(
  p_hash           text,
  p_complaint_code text
)
RETURNS TABLE (
  id                   uuid,
  complaint_code       text,
  description          text,
  category             text,
  source               text,
  lat                  double precision,
  lng                  double precision,
  address              text,
  photo_url            text,
  resolution_photo_url text,    -- ADDED: was missing, causing the resolution photo to never appear
  status               text,
  created_at           timestamptz,
  updated_at           timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    c.id::uuid,
    c.complaint_code::text,
    c.description::text,
    c.category::text,
    c.source::text,
    c.lat::double precision,
    c.lng::double precision,
    c.address::text,
    c.photo_url::text,
    c.resolution_photo_url::text,   -- ADDED: returns the photo URL stored by the authority
    c.status::text,
    c.created_at::timestamptz,
    c.updated_at::timestamptz
  FROM public.complaints c
  WHERE
    c.citizen_identifier_hash = p_hash
    AND c.complaint_code = p_complaint_code
  ORDER BY c.created_at DESC;
END;
$$;

-- Re-grant execute permissions (required after DROP + re-CREATE)
GRANT EXECUTE ON FUNCTION public.get_complaints_by_hash(text, text) TO anon, authenticated;

-- Reload PostgREST schema cache so the new column is immediately available
NOTIFY pgrst, 'reload schema';
