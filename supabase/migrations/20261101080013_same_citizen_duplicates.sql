-- Duplicate suggestions compare only reports with the same citizen identifier hash.
DROP FUNCTION IF EXISTS public.duplicate_candidates(double precision,double precision);
CREATE OR REPLACE FUNCTION public.duplicate_candidates(p_lat double precision, p_lng double precision, p_hash text)
RETURNS TABLE(id uuid, complaint_code text, description text, category text, status text,
  lat double precision, lng double precision, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id,c.complaint_code,c.description,c.category,c.status::text,c.lat,c.lng,c.created_at
  FROM public.complaints c
  WHERE p_hash ~ '^[0-9a-f]{64}$' AND c.citizen_identifier_hash=p_hash
    AND p_lat BETWEEN -90 AND 90 AND p_lng BETWEEN -180 AND 180
    AND c.lat BETWEEN greatest(-90,p_lat-0.0023) AND least(90,p_lat+0.0023)
    AND c.lng BETWEEN -180 AND 180 AND c.status::text NOT IN ('resolved','rejected')
    AND c.created_at BETWEEN now()-interval '30 days' AND now()
    AND 2*6371000*asin(sqrt(least(1.0,greatest(0.0,
      sin(radians(c.lat-p_lat)/2)^2+cos(radians(c.lat))*cos(radians(p_lat))*sin(radians(c.lng-p_lng)/2)^2)))) <= 250
  ORDER BY c.created_at DESC,c.id LIMIT 101;
$$;
REVOKE ALL ON FUNCTION public.duplicate_candidates(double precision,double precision,text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.duplicate_candidates(double precision,double precision,text) TO service_role;

CREATE INDEX IF NOT EXISTS complaints_citizen_recent_idx ON public.complaints(citizen_identifier_hash,created_at DESC);
NOTIFY pgrst,'reload schema';
