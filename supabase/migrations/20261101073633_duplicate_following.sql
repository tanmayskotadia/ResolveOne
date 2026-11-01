-- Additive duplicate suggestions and capability-based follows.
CREATE TABLE IF NOT EXISTS public.complaint_follows (
  token uuid PRIMARY KEY, complaint_id uuid NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.complaint_follows ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.complaint_follows FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT ON public.complaint_follows TO service_role;
CREATE INDEX IF NOT EXISTS complaint_follows_complaint_idx ON public.complaint_follows(complaint_id);

CREATE OR REPLACE FUNCTION public.duplicate_candidates(p_lat double precision, p_lng double precision)
RETURNS TABLE(id uuid, complaint_code text, description text, category text, status text,
  lat double precision, lng double precision, created_at timestamptz)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT c.id,c.complaint_code,c.description,c.category,c.status::text,c.lat,c.lng,c.created_at
  FROM public.complaints c
  WHERE p_lat BETWEEN -90 AND 90 AND p_lng BETWEEN -180 AND 180
    AND c.lat BETWEEN greatest(-90,p_lat-0.0023) AND least(90,p_lat+0.0023)
    AND c.lng BETWEEN -180 AND 180 AND c.status::text NOT IN ('resolved','rejected')
    AND c.created_at BETWEEN now()-interval '30 days' AND now()
    AND 2*6371000*asin(sqrt(least(1.0,greatest(0.0,
      sin(radians(c.lat-p_lat)/2)^2+cos(radians(c.lat))*cos(radians(p_lat))*sin(radians(c.lng-p_lng)/2)^2)))) <= 250
  ORDER BY c.created_at DESC,c.id LIMIT 101;
$$;
REVOKE ALL ON FUNCTION public.duplicate_candidates(double precision,double precision) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.duplicate_candidates(double precision,double precision) TO service_role;

CREATE OR REPLACE FUNCTION public.follow_duplicate(p_id uuid,p_token uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE existing_id uuid;
BEGIN
  IF p_token IS NULL OR p_id IS NULL THEN RAISE EXCEPTION 'Invalid follow reference'; END IF;
  -- Lock the target to serialize a resolution racing with a follow.
  PERFORM 1 FROM public.complaints WHERE id=p_id AND status::text NOT IN ('resolved','rejected') FOR SHARE;
  IF NOT FOUND THEN RAISE EXCEPTION 'This issue is no longer open. Check for matches again'; END IF;
  INSERT INTO public.complaint_follows(token,complaint_id) VALUES(p_token,p_id) ON CONFLICT(token) DO NOTHING;
  SELECT complaint_id INTO existing_id FROM public.complaint_follows WHERE token=p_token;
  IF existing_id IS DISTINCT FROM p_id THEN RAISE EXCEPTION 'Follow reference unavailable'; END IF;
  RETURN p_token;
END;
$$;
REVOKE ALL ON FUNCTION public.follow_duplicate(uuid,uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.follow_duplicate(uuid,uuid) TO service_role;

CREATE OR REPLACE FUNCTION public.get_followed_complaint(p_token uuid)
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
 SELECT jsonb_build_object('code',c.complaint_code,'category',c.category,'status',c.status,
   'created_at',c.created_at,'updated_at',c.updated_at)
 FROM public.complaint_follows f JOIN public.complaints c ON c.id=f.complaint_id WHERE f.token=p_token;
$$;
REVOKE ALL ON FUNCTION public.get_followed_complaint(uuid) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.get_followed_complaint(uuid) TO anon,authenticated;
NOTIFY pgrst, 'reload schema';

-- Private, short-lived counters limit public model requests without storing raw IPs.
CREATE TABLE IF NOT EXISTS public.duplicate_rate_limits (
 key text PRIMARY KEY, window_start timestamptz NOT NULL, requests integer NOT NULL
);
ALTER TABLE public.duplicate_rate_limits ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.duplicate_rate_limits FROM PUBLIC,anon,authenticated;
CREATE OR REPLACE FUNCTION public.duplicate_quota(p_key text)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path=public AS $$
DECLARE total integer;
BEGIN
 IF p_key IS NULL OR p_key !~ '^[0-9a-f]{64}$' THEN RETURN false; END IF;
 DELETE FROM public.duplicate_rate_limits WHERE window_start<now()-interval '1 hour';
 INSERT INTO public.duplicate_rate_limits(key,window_start,requests) VALUES(p_key,now(),1)
 ON CONFLICT(key) DO UPDATE SET
 requests=CASE WHEN duplicate_rate_limits.window_start<now()-interval '1 minute' THEN 1 ELSE duplicate_rate_limits.requests+1 END,
 window_start=CASE WHEN duplicate_rate_limits.window_start<now()-interval '1 minute' THEN now() ELSE duplicate_rate_limits.window_start END
 RETURNING requests INTO total;
 RETURN total<=20;
END;
$$;
REVOKE ALL ON FUNCTION public.duplicate_quota(text) FROM PUBLIC,anon,authenticated;
GRANT EXECUTE ON FUNCTION public.duplicate_quota(text) TO service_role;
