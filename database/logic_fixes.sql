-- Apply after intelligence_upgrade.sql, as a separate SQL editor execution.
-- Safe to rerun. Existing complaint IDs and tracking codes are preserved.

CREATE OR REPLACE FUNCTION public.submit_complaint(p_id uuid, p_hash text, p_report jsonb)
RETURNS text LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing public.complaints; code text; report_lat double precision; report_lng double precision;
BEGIN
  IF p_id IS NULL OR p_hash IS NULL OR p_hash !~ '^[0-9a-f]{64}$' THEN
    RAISE EXCEPTION 'A valid report reference and citizen identifier are required';
  END IF;
  -- Serialize retries of the same request, including simultaneous submissions.
  PERFORM pg_advisory_xact_lock(hashtextextended(p_id::text, 0));
  SELECT * INTO existing FROM public.complaints WHERE id = p_id;
  IF FOUND THEN
    IF existing.citizen_identifier_hash IS DISTINCT FROM p_hash THEN
      RAISE EXCEPTION 'This report reference is unavailable';
    END IF;
    RETURN existing.complaint_code;
  END IF;
  IF p_report IS NULL OR jsonb_typeof(p_report) <> 'object'
     OR COALESCE(length(trim(p_report->>'description')), 0) NOT BETWEEN 1 AND 4000
     OR COALESCE(p_report->>'category', '') NOT IN ('Garbage/Waste', 'Road Damage/Potholes', 'Streetlights',
       'Water Leakage/Supply', 'Drainage/Sewage', 'Electricity', 'Public Infrastructure', 'Other')
     OR COALESCE(p_report->>'source', '') NOT IN ('text', 'voice')
     OR COALESCE(length(trim(p_report->>'address')), 0) NOT BETWEEN 1 AND 2000 THEN
    RAISE EXCEPTION 'Please check the report description, category and address';
  END IF;
  report_lat := (p_report->>'lat')::double precision;
  report_lng := (p_report->>'lng')::double precision;
  IF report_lat IS NULL OR report_lng IS NULL OR NOT (report_lat BETWEEN -90 AND 90)
     OR NOT (report_lng BETWEEN -180 AND 180) THEN
    RAISE EXCEPTION 'Choose a valid location on the map';
  END IF;
  INSERT INTO public.complaints (id, citizen_identifier_hash, category, description, source, lat, lng, address, photo_url, status)
  VALUES (p_id, p_hash, p_report->>'category', trim(p_report->>'description'), p_report->>'source',
    report_lat, report_lng, trim(p_report->>'address'), NULLIF(p_report->>'photo_url', ''), 'submitted')
  RETURNING complaint_code INTO code;
  RETURN code;
END;
$$;
REVOKE ALL ON FUNCTION public.submit_complaint(uuid, text, jsonb) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_complaint(uuid, text, jsonb) TO anon, authenticated;
DROP POLICY IF EXISTS "Anon can insert anonymous complaints" ON public.complaints;

-- Normalize the previous schema's equivalent of Under Review.
UPDATE public.complaints SET status = 'under-review' WHERE status::text = 'open';

DROP FUNCTION IF EXISTS public.update_complaint_status(uuid, text, text, text);
DROP FUNCTION IF EXISTS public.update_complaint_status(uuid, text, text, text, text);
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
  IF p_status = 'resolved' AND COALESCE(NULLIF(trim(p_resolution_photo_url), ''), old_row.resolution_photo_url) IS NULL THEN
    RAISE EXCEPTION 'A resolution photo is required';
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
-- Apply the true distance filter BEFORE the candidate limit. A latitude band
-- alone can be filled by unrelated reports thousands of kilometres away.
CREATE OR REPLACE FUNCTION public.nearby_complaints(
  p_lat double precision, p_lng double precision, p_since timestamptz, p_limit integer
) RETURNS TABLE (id uuid, complaint_code text, description text, category text, status text, lat double precision, lng double precision)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id, c.complaint_code, c.description, c.category, c.status::text, c.lat, c.lng
  FROM public.complaints c
  WHERE p_lat BETWEEN -90 AND 90 AND p_lng BETWEEN -180 AND 180
    AND c.lat BETWEEN greatest(-90, p_lat - 0.0023) AND least(90, p_lat + 0.0023)
    AND c.lng BETWEEN -180 AND 180
    AND c.created_at >= p_since AND c.created_at <= now()
    AND c.status::text NOT IN ('resolved', 'rejected')
    AND 2 * 6371000 * asin(sqrt(least(1.0, greatest(0.0,
      sin(radians(c.lat - p_lat) / 2) ^ 2
      + cos(radians(c.lat)) * cos(radians(p_lat)) * sin(radians(c.lng - p_lng) / 2) ^ 2)))) <= 250
  ORDER BY c.created_at DESC, c.id
  LIMIT greatest(1, least(p_limit, 501));
$$;
REVOKE ALL ON FUNCTION public.nearby_complaints(double precision, double precision, timestamptz, integer) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.nearby_complaints(double precision, double precision, timestamptz, integer) FROM anon, authenticated;
GRANT EXECUTE ON FUNCTION public.nearby_complaints(double precision, double precision, timestamptz, integer) TO service_role;
NOTIFY pgrst, 'reload schema';
