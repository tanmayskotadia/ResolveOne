-- Apply after logic_fixes.sql. Safe to rerun.

CREATE OR REPLACE FUNCTION public.update_complaint_status(
  p_id uuid, p_status text, p_note text, p_resolution_photo_url text, p_expected_status text, p_expected_updated_at timestamptz
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_row public.complaints;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'authority') THEN
    RAISE EXCEPTION 'Authority access required';
  END IF;
  IF p_status IS NULL OR p_status NOT IN ('submitted', 'under-review', 'in-progress', 'resolved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid complaint status';
  END IF;
  SELECT * INTO old_row FROM public.complaints WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Complaint not found'; END IF;
  IF old_row.status::text IS DISTINCT FROM p_expected_status OR old_row.updated_at IS DISTINCT FROM p_expected_updated_at THEN
    RAISE EXCEPTION 'This complaint changed since you opened it. Refresh it before saving';
  END IF;
  IF p_status = 'resolved' THEN
    IF old_row.status::text <> 'resolved' AND
       (NULLIF(trim(p_resolution_photo_url), '') IS NULL OR
        trim(p_resolution_photo_url) IS NOT DISTINCT FROM old_row.resolution_photo_url) THEN
      RAISE EXCEPTION 'A new resolution photo is required for this repair';
    END IF;
    IF COALESCE(NULLIF(trim(p_resolution_photo_url), ''), old_row.resolution_photo_url) IS NULL THEN
      RAISE EXCEPTION 'A resolution photo is required';
    END IF;
  END IF;
  IF length(p_note) > 4000 THEN RAISE EXCEPTION 'Notes must be at most 4000 characters'; END IF;
  UPDATE public.complaints SET status = p_status::public.complaint_status,
    resolution_photo_url = COALESCE(NULLIF(trim(p_resolution_photo_url), ''), resolution_photo_url), updated_at = clock_timestamp()
  WHERE id = p_id;
  IF old_row.status::text IS DISTINCT FROM p_status OR NULLIF(trim(p_note), '') IS NOT NULL THEN
    INSERT INTO public.status_history (complaint_id, status, note, changed_by, changed_at)
    VALUES (p_id, p_status, NULLIF(trim(p_note), ''), auth.uid(), clock_timestamp());
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.update_complaint_status(uuid, text, text, text, text, timestamptz) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_complaint_status(uuid, text, text, text, text, timestamptz) TO authenticated;

-- All officer writes must use the RPC so proof, concurrency and history checks
-- cannot be bypassed through direct table updates.
DROP POLICY IF EXISTS "Authority can update complaints" ON public.complaints;
DROP POLICY IF EXISTS "Authority can insert status history" ON public.status_history;

-- One snapshot keeps complaint status, proof and its history consistent.
CREATE OR REPLACE FUNCTION public.track_complaint(p_hash text, p_complaint_code text)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object(
    'complaint', jsonb_build_object(
      'id', c.id, 'complaint_code', c.complaint_code, 'description', c.description,
      'category', c.category, 'source', c.source, 'lat', c.lat, 'lng', c.lng,
      'address', c.address, 'photo_url', c.photo_url, 'resolution_photo_url', c.resolution_photo_url,
      'status', c.status, 'created_at', c.created_at, 'updated_at', c.updated_at),
    'history', COALESCE((SELECT jsonb_agg(jsonb_build_object(
      'id', h.id, 'complaint_id', h.complaint_id, 'status', h.status,
      'note', h.note, 'changed_at', h.changed_at) ORDER BY h.changed_at, h.id)
      FROM public.status_history h WHERE h.complaint_id = c.id), '[]'::jsonb))
  FROM public.complaints c
  WHERE p_hash ~ '^[0-9a-f]{64}$' AND c.citizen_identifier_hash = p_hash
    AND c.complaint_code = upper(trim(p_complaint_code));
$$;
REVOKE ALL ON FUNCTION public.track_complaint(text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.track_complaint(text, text) TO anon, authenticated;
NOTIFY pgrst, 'reload schema';
