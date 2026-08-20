-- ============================================================
-- CivicConnect — Complete Database Setup / Fix
-- File: database/civicconnect_final.sql
--
-- Run this ONCE in the Supabase SQL Editor (Dashboard → SQL Editor).
-- It is idempotent: safe to re-run if it has already been partially applied.
-- ============================================================

-- ============================================================
-- SECTION 0 — EXTENSION SETUP
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- SECTION 1 — ENUM TYPES
-- ============================================================

-- complaint_status enum (create only if it doesn't already exist)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'complaint_status') THEN
    CREATE TYPE public.complaint_status AS ENUM (
      'submitted',
      'open',
      'in-progress',
      'resolved',
      'rejected'
    );
  END IF;
END;
$$;

-- ============================================================
-- SECTION 2 — PROFILES TABLE
-- (Supabase Auth users — authority accounts only)
-- ============================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  id          uuid        PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name   text        NOT NULL DEFAULT '',
  email       text,
  role        text        NOT NULL DEFAULT 'authority' CHECK (role IN ('citizen', 'authority')),
  created_at  timestamptz NOT NULL DEFAULT now()
);

-- Trigger: auto-create a profile row when a new auth user is created
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', ''),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'authority')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================================
-- SECTION 3 — COMPLAINT CODE SEQUENCE
-- (generates CC-YYYY-NNNNN formatted codes)
-- ============================================================

CREATE SEQUENCE IF NOT EXISTS public.complaint_code_seq START 1;

-- ============================================================
-- SECTION 4 — COMPLAINTS TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.complaints (
  id                       uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_code           text        UNIQUE,  -- e.g. CC-2026-00001
  citizen_id               uuid        REFERENCES auth.users(id) ON DELETE SET NULL,  -- nullable for anonymous
  citizen_identifier_hash  text,       -- SHA-256 hash of Aadhaar (anonymous citizens only)
  category                 text        NOT NULL,
  description              text        NOT NULL,
  source                   text        NOT NULL DEFAULT 'text' CHECK (source IN ('text', 'voice')),
  lat                      double precision,
  lng                      double precision,
  address                  text,
  photo_url                text,
  resolution_photo_url     text,
  status                   text        NOT NULL DEFAULT 'submitted',
  created_at               timestamptz NOT NULL DEFAULT now(),
  updated_at               timestamptz
);

-- If the table already existed without some columns, add them safely:
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS complaint_code text;
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS citizen_identifier_hash text;
ALTER TABLE public.complaints ADD COLUMN IF NOT EXISTS resolution_photo_url text;
ALTER TABLE public.complaints ALTER COLUMN citizen_id DROP NOT NULL;

-- Add UNIQUE constraint on complaint_code if not yet present
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'complaints_complaint_code_key'
  ) THEN
    ALTER TABLE public.complaints ADD CONSTRAINT complaints_complaint_code_key UNIQUE (complaint_code);
  END IF;
END;
$$;

-- Trigger: generate complaint_code automatically on INSERT
CREATE OR REPLACE FUNCTION public.generate_complaint_code()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.complaint_code IS NULL THEN
    NEW.complaint_code := 'CC-' || to_char(now(), 'YYYY') || '-' || lpad(nextval('complaint_code_seq')::text, 5, '0');
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS set_complaint_code ON public.complaints;
CREATE TRIGGER set_complaint_code
  BEFORE INSERT ON public.complaints
  FOR EACH ROW EXECUTE FUNCTION public.generate_complaint_code();

-- ============================================================
-- SECTION 5 — STATUS HISTORY TABLE
-- ============================================================

CREATE TABLE IF NOT EXISTS public.status_history (
  id            uuid        PRIMARY KEY DEFAULT uuid_generate_v4(),
  complaint_id  uuid        NOT NULL REFERENCES public.complaints(id) ON DELETE CASCADE,
  status        text        NOT NULL,
  note          text,
  changed_by    uuid        REFERENCES auth.users(id) ON DELETE SET NULL,
  changed_at    timestamptz NOT NULL DEFAULT now()
);

-- ============================================================
-- SECTION 6 — INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_complaints_complaint_code     ON public.complaints(complaint_code);
CREATE INDEX IF NOT EXISTS idx_complaints_citizen_hash       ON public.complaints(citizen_identifier_hash);
CREATE INDEX IF NOT EXISTS idx_complaints_status             ON public.complaints(status);
CREATE INDEX IF NOT EXISTS idx_complaints_category           ON public.complaints(category);
CREATE INDEX IF NOT EXISTS idx_complaints_created_at         ON public.complaints(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_status_history_complaint_id   ON public.status_history(complaint_id);

-- ============================================================
-- SECTION 7 — ROW LEVEL SECURITY
-- ============================================================

-- Enable RLS on both tables
ALTER TABLE public.profiles        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.complaints      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.status_history  ENABLE ROW LEVEL SECURITY;

-- ── PROFILES ──────────────────────────────────────────────

DROP POLICY IF EXISTS "Auth users can read own profile"   ON public.profiles;
DROP POLICY IF EXISTS "Auth users can update own profile" ON public.profiles;

CREATE POLICY "Auth users can read own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

CREATE POLICY "Auth users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id);

-- ── COMPLAINTS — Authority SELECT ─────────────────────────

DROP POLICY IF EXISTS "Authority can select all complaints" ON public.complaints;
CREATE POLICY "Authority can select all complaints"
  ON public.complaints FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'authority'
    )
  );

-- ── COMPLAINTS — Authority UPDATE ─────────────────────────

DROP POLICY IF EXISTS "Authority can update complaints" ON public.complaints;
CREATE POLICY "Authority can update complaints"
  ON public.complaints FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'authority'
    )
  );

-- ── COMPLAINTS — Anonymous Citizen INSERT ─────────────────
-- Citizens (anon role) can only INSERT.
-- They CANNOT SELECT, UPDATE or DELETE.

DROP POLICY IF EXISTS "Anon can insert anonymous complaints" ON public.complaints;
CREATE POLICY "Anon can insert anonymous complaints"
  ON public.complaints FOR INSERT
  WITH CHECK (
    auth.role() = 'anon'
    AND citizen_id IS NULL
    AND citizen_identifier_hash IS NOT NULL
  );

-- ── STATUS HISTORY — Authority INSERT ─────────────────────

DROP POLICY IF EXISTS "Authority can insert status history" ON public.status_history;
CREATE POLICY "Authority can insert status history"
  ON public.status_history FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'authority'
    )
  );

-- ── STATUS HISTORY — Authority SELECT ─────────────────────

DROP POLICY IF EXISTS "Authority can select status history" ON public.status_history;
CREATE POLICY "Authority can select status history"
  ON public.status_history FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role = 'authority'
    )
  );

-- NOTE: Anonymous citizens have NO direct SELECT on complaints or status_history.
-- They access their data ONLY through the SECURITY DEFINER RPCs below.

-- ── DEMO MODE — Anon SELECT on complaints (Authority Dashboard) ────────────
-- ⚠️  DEMO MODE ONLY: This policy allows the anon role to SELECT all complaints.
--     This is required because the authority login bypasses Supabase Auth
--     and uses localStorage instead. In production, remove this policy and
--     use proper Supabase Auth for the authority portal.

DROP POLICY IF EXISTS "Demo: Anon can read all complaints" ON public.complaints;
CREATE POLICY "Demo: Anon can read all complaints"
  ON public.complaints FOR SELECT
  USING (auth.role() = 'anon');

-- ── DEMO MODE — Anon UPDATE on complaints (Status Updates) ─────────────────
-- ⚠️  DEMO MODE ONLY: This policy allows the anon role to UPDATE complaint records.
--     Remove in production and replace with proper authenticated authority flow.

DROP POLICY IF EXISTS "Demo: Anon can update complaints" ON public.complaints;
CREATE POLICY "Demo: Anon can update complaints"
  ON public.complaints FOR UPDATE
  USING (auth.role() = 'anon');

-- ── DEMO MODE — Anon INSERT on status_history ──────────────────────────────
-- ⚠️  DEMO MODE ONLY: Allows anon to write status history entries.

DROP POLICY IF EXISTS "Demo: Anon can insert status history" ON public.status_history;
CREATE POLICY "Demo: Anon can insert status history"
  ON public.status_history FOR INSERT
  WITH CHECK (auth.role() = 'anon');

-- ── DEMO MODE — Anon SELECT on status_history ──────────────────────────────

DROP POLICY IF EXISTS "Demo: Anon can read status history" ON public.status_history;
CREATE POLICY "Demo: Anon can read status history"
  ON public.status_history FOR SELECT
  USING (auth.role() = 'anon');

-- ============================================================
-- SECTION 8 — RPC: get_complaints_by_hash
--
-- Called by TrackComplaintPage with:
--   supabase.rpc('get_complaints_by_hash', { p_hash, p_complaint_code })
--
-- Returns complaint data for a citizen identified by their Aadhaar hash.
-- Complaint code can be exact (CC-2026-00001) or partial (for wildcard search).
-- Deliberately excludes citizen_identifier_hash from the response.
-- ============================================================

DROP FUNCTION IF EXISTS public.get_complaints_by_hash(text, text);

CREATE OR REPLACE FUNCTION public.get_complaints_by_hash(
  p_hash          text,
  p_complaint_code text
)
RETURNS TABLE (
  id             uuid,
  complaint_code text,
  description    text,
  category       text,
  source         text,
  lat            double precision,
  lng            double precision,
  address        text,
  photo_url      text,
  status         text,
  created_at     timestamptz,
  updated_at     timestamptz
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

-- ============================================================
-- SECTION 9 — RPC: get_status_history_by_hash
--
-- Called by TrackComplaintPage with:
--   supabase.rpc('get_status_history_by_hash', { p_hash, p_complaint_code })
--
-- Only returns history rows for complaints that belong to the given hash.
-- ============================================================

DROP FUNCTION IF EXISTS public.get_status_history_by_hash(text, text);

CREATE OR REPLACE FUNCTION public.get_status_history_by_hash(
  p_hash           text,
  p_complaint_code text
)
RETURNS TABLE (
  id            uuid,
  complaint_id  uuid,
  status        text,
  note          text,
  changed_by    uuid,
  changed_at    timestamptz
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    h.id::uuid,
    h.complaint_id::uuid,
    h.status::text,
    h.note::text,
    h.changed_by::uuid,
    h.changed_at::timestamptz
  FROM public.status_history h
  JOIN public.complaints c ON c.id = h.complaint_id
  WHERE
    c.citizen_identifier_hash = p_hash
    AND c.complaint_code = p_complaint_code
  ORDER BY h.changed_at ASC;
END;
$$;

-- Allow anon and authenticated roles to EXECUTE the RPC functions
GRANT EXECUTE ON FUNCTION public.get_complaints_by_hash(text, text)      TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_status_history_by_hash(text, text)  TO anon, authenticated;

-- ============================================================
-- SECTION 9.5 — RPC: get_latest_complaint_code_by_hash
--
-- Used ONLY immediately after submission to retrieve the generated ID.
-- Takes the citizen's hash, returns the most recent complaint code.
-- ============================================================

DROP FUNCTION IF EXISTS public.get_latest_complaint_code_by_hash(text);

CREATE OR REPLACE FUNCTION public.get_latest_complaint_code_by_hash(p_hash text)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_code text;
BEGIN
  SELECT complaint_code INTO v_code
  FROM public.complaints
  WHERE citizen_identifier_hash = p_hash
  ORDER BY created_at DESC
  LIMIT 1;
  
  RETURN v_code;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_latest_complaint_code_by_hash(text) TO anon, authenticated;

-- ============================================================
-- SECTION 10 — STORAGE BUCKET & RLS
--
-- Bucket name (as used in frontend): complaint-photos
-- Upload path format: anon_{hash_prefix_8}_{timestamp}.{ext}
--
-- IMPORTANT: Create the bucket in the Supabase Dashboard UI first:
--   Storage → New bucket → Name: "complaint-photos" → Public: YES
--
-- Then run the policies below.
-- ============================================================

-- Allow anonymous users (citizens) to INSERT (upload) files into complaint-photos
DROP POLICY IF EXISTS "Anon can upload complaint photos" ON storage.objects;
CREATE POLICY "Anon can upload complaint photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'complaint-photos'
    AND auth.role() = 'anon'
  );

-- Allow authenticated authority users to upload too (in case they need to attach files)
DROP POLICY IF EXISTS "Auth users can upload complaint photos" ON storage.objects;
CREATE POLICY "Auth users can upload complaint photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'complaint-photos'
    AND auth.role() = 'authenticated'
  );

-- Allow public SELECT (read) so complaint photos are publicly accessible via URL
DROP POLICY IF EXISTS "Public can read complaint photos" ON storage.objects;
CREATE POLICY "Public can read complaint photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'complaint-photos');

-- Prevent anonymous users from deleting files (only authority/service role can)
-- No anon DELETE policy = anon cannot delete. Good.

-- ============================================================
-- SECTION 10.5 — RESOLUTION STORAGE BUCKET & RLS
--
-- Bucket name (as used in frontend): complaint-resolution-photos
--
-- IMPORTANT: Create the bucket in the Supabase Dashboard UI first:
--   Storage → New bucket → Name: "complaint-resolution-photos" → Public: YES
-- ============================================================

-- Allow authenticated authority users to INSERT (upload) files into complaint-resolution-photos
DROP POLICY IF EXISTS "Auth users can upload resolution photos" ON storage.objects;
CREATE POLICY "Auth users can upload resolution photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'complaint-resolution-photos'
    AND auth.role() = 'authenticated'
  );

-- ⚠️  DEMO MODE ONLY: Allow anon to upload resolution photos (because demo login bypasses Supabase Auth)
DROP POLICY IF EXISTS "Demo: Anon can upload resolution photos" ON storage.objects;
CREATE POLICY "Demo: Anon can upload resolution photos"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'complaint-resolution-photos'
    AND auth.role() = 'anon'
  );

-- Allow public SELECT (read) so resolution photos are publicly accessible via URL
DROP POLICY IF EXISTS "Public can read resolution photos" ON storage.objects;
CREATE POLICY "Public can read resolution photos"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'complaint-resolution-photos');

-- ============================================================
-- SECTION 11 — NOTIFY POSTGREST TO RELOAD SCHEMA CACHE
-- Run this after creating/changing functions to avoid cache errors.
-- ============================================================

NOTIFY pgrst, 'reload schema';

-- ============================================================
-- END OF MIGRATION
-- ============================================================
