-- Apply AFTER civicconnect_final.sql and the resolution-photo migrations.
-- Run with a database administrator in the Supabase SQL editor.
-- Existing users keep their roles: audit profiles and retain only trusted officers.
ALTER TYPE public.complaint_status ADD VALUE IF NOT EXISTS 'under-review';
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS resolution_photo_url text;
ALTER TABLE public.profiles ALTER COLUMN role SET DEFAULT 'citizen';

-- Public signups must never provision themselves as officers via user metadata.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email, 'citizen')
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE OR REPLACE FUNCTION public.protect_profile_role()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  IF auth.role() IN ('anon', 'authenticated') AND NEW.role IS DISTINCT FROM OLD.role THEN
    RAISE EXCEPTION 'Only an administrator can change account roles';
  END IF;
  RETURN NEW;
END;
$$;
DROP TRIGGER IF EXISTS protect_profile_role ON public.profiles;
CREATE TRIGGER protect_profile_role BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.protect_profile_role();

DROP POLICY IF EXISTS "Demo: Anon can read all complaints" ON public.complaints;
DROP POLICY IF EXISTS "Demo: Anon can update complaints" ON public.complaints;
DROP POLICY IF EXISTS "Demo: Anon can insert status history" ON public.status_history;
DROP POLICY IF EXISTS "Demo: Anon can read status history" ON public.status_history;
DROP POLICY IF EXISTS "Demo: Anon can upload resolution photos" ON storage.objects;

-- Keep complaint state and its training label in a single transaction.
CREATE OR REPLACE FUNCTION public.update_complaint_status(
  p_id uuid, p_status text, p_note text, p_resolution_photo_url text DEFAULT NULL
) RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE old_row public.complaints;
BEGIN
  IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'authority') THEN
    RAISE EXCEPTION 'Authority access required';
  END IF;
  IF p_status NOT IN ('submitted', 'under-review', 'in-progress', 'resolved', 'rejected') THEN
    RAISE EXCEPTION 'Invalid complaint status';
  END IF;
  SELECT * INTO old_row FROM public.complaints WHERE id = p_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Complaint not found'; END IF;
  IF p_status = 'resolved' AND COALESCE(NULLIF(p_resolution_photo_url, ''), old_row.resolution_photo_url) IS NULL THEN
    RAISE EXCEPTION 'A resolution photo is required';
  END IF;
  UPDATE public.complaints SET status = p_status::public.complaint_status,
    resolution_photo_url = COALESCE(NULLIF(p_resolution_photo_url, ''), resolution_photo_url), updated_at = now()
  WHERE id = p_id;
  -- Notes on an already-resolved report must not change the resolution timestamp.
  IF old_row.status::text IS DISTINCT FROM p_status OR NULLIF(trim(p_note), '') IS NOT NULL THEN
    INSERT INTO public.status_history (complaint_id, status, note, changed_by, changed_at)
    VALUES (p_id, p_status, NULLIF(trim(p_note), ''), auth.uid(), now());
  END IF;
END;
$$;
REVOKE ALL ON FUNCTION public.update_complaint_status(uuid, text, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.update_complaint_status(uuid, text, text, text) TO authenticated;

CREATE INDEX IF NOT EXISTS idx_complaints_nearby_recent ON public.complaints (lat, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_history_resolution ON public.status_history (complaint_id, changed_at)
WHERE status = 'resolved';
NOTIFY pgrst, 'reload schema';
