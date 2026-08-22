# ResolveOne — Database Setup Guide

## Which file to run

**Run only this file:**

```
database/civicconnect_final.sql
```

Do NOT run `migration_v2.sql` — it is superseded by `civicconnect_final.sql`, which is a complete, idempotent replacement.

---

## Pre-requisite: Create the Storage Bucket

Before running the SQL, you must manually create the storage bucket in Supabase Dashboard:

1. Go to **Supabase Dashboard → Storage**
2. Click **New bucket**
3. Name: `complaint-photos`
4. Set **Public bucket: YES** (so uploaded photos can be displayed via public URL)
5. Click **Save**

Then run the SQL below.

---

## How to run

1. Go to **Supabase Dashboard → SQL Editor**
2. Click **New query**
3. Open `database/civicconnect_final.sql`
4. Copy the **entire file contents** and paste into the SQL editor
5. Click **Run**

The script is safe to re-run. All CREATE statements use `IF NOT EXISTS` or `CREATE OR REPLACE`.

---

## What this SQL does

| Section | Description |
|---|---|
| 0 | Enables `uuid-ossp` extension |
| 1 | Creates `complaint_status` enum (if not exists) |
| 2 | Creates `profiles` table + auto-create trigger for new auth users |
| 3 | Creates `complaint_code_seq` sequence for CC-YYYY-NNNNN codes |
| 4 | Creates/updates `complaints` table + trigger to auto-set `complaint_code` |
| 5 | Creates `status_history` table |
| 6 | Creates indexes on complaints and status_history |
| 7 | Enables RLS + all policies for profiles, complaints, status_history |
| 8 | Creates `get_complaints_by_hash(p_hash, p_complaint_code)` RPC |
| 9 | Creates `get_status_history_by_hash(p_hash, p_complaint_code)` RPC |
| 10 | Creates Storage RLS policies for `complaint-photos` bucket |
| 11 | Runs `NOTIFY pgrst, 'reload schema'` to refresh PostgREST cache |

---

## How to verify

### Tables exist

```sql
SELECT table_name FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN ('profiles', 'complaints', 'status_history');
```

Expected: 3 rows.

### Columns on complaints

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_schema = 'public' AND table_name = 'complaints'
ORDER BY ordinal_position;
```

Confirm `complaint_code`, `citizen_identifier_hash`, `citizen_id` (nullable) are present.

### RLS is active

```sql
SELECT tablename, rowsecurity FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'complaints', 'status_history');
```

All should show `rowsecurity = true`.

### RLS policies

```sql
SELECT policyname, tablename, cmd FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### RPC functions exist

```sql
SELECT routine_name, routine_type
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_complaints_by_hash', 'get_status_history_by_hash');
```

Expected: 2 rows, both `FUNCTION`.

### Test get_complaints_by_hash directly

```sql
-- Safe test: should return 0 rows (no complaints with this hash)
SELECT * FROM public.get_complaints_by_hash('test_hash_not_real', '');
```

If this runs without error, the function exists and has the right signature.

### Storage policies

```sql
SELECT policyname, cmd FROM pg_policies
WHERE schemaname = 'storage' AND tablename = 'objects'
  AND policyname ILIKE '%complaint%'
ORDER BY policyname;
```

Expected: 3 rows (anon upload, auth upload, public read).

---

## After running

### Refresh PostgREST cache manually (if still getting schema errors)

In the SQL Editor:

```sql
NOTIFY pgrst, 'reload schema';
```

Or in the Supabase Dashboard: **Settings → API → Reload Schema**.

---

## Complete flow to verify end-to-end

1. **Submit a complaint** via the Citizen portal → Report Issue
2. Note the `complaint_code` shown on success (e.g. `CC-2026-00001`)
3. Go to **Track Complaint**
4. Enter the complaint code + the same Aadhaar used to submit
5. The complaint should appear with status `Registered`

---

## Schema at a glance

```
profiles
├── id (uuid, FK → auth.users)
├── full_name
├── email
├── role ('authority' | 'citizen')
└── created_at

complaints
├── id (uuid, PK)
├── complaint_code (text, unique, auto-generated: CC-2026-00001)
├── citizen_id (uuid, nullable, FK → auth.users)
├── citizen_identifier_hash (text — SHA-256 of Aadhaar, anon citizens)
├── category / description / source
├── lat / lng / address
├── photo_url
├── status ('submitted' | 'open' | 'in-progress' | 'resolved' | 'rejected')
├── created_at
└── updated_at

status_history
├── id (uuid, PK)
├── complaint_id (uuid, FK → complaints)
├── status
├── note
├── changed_by (uuid, FK → auth.users — the authority officer)
└── changed_at
```
