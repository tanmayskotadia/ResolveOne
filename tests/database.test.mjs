import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import { after, test } from 'node:test'
import { PGlite } from '@electric-sql/pglite'

const db = new PGlite()
await db.exec(`
  CREATE ROLE anon; CREATE ROLE authenticated; CREATE ROLE service_role;
  CREATE SCHEMA auth; CREATE SCHEMA storage;
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql AS $$ SELECT nullif(current_setting('request.uid', true), '')::uuid $$;
  CREATE FUNCTION auth.role() RETURNS text LANGUAGE sql AS $$ SELECT current_setting('request.role', true) $$;
  CREATE TABLE storage.objects (id uuid);
  CREATE TYPE public.complaint_status AS ENUM ('submitted', 'open', 'in-progress', 'resolved', 'rejected');
  CREATE SEQUENCE complaint_code_seq;
  CREATE TABLE public.profiles (id uuid PRIMARY KEY, full_name text, email text, role text DEFAULT 'authority');
  CREATE TABLE public.complaints (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(), complaint_code text UNIQUE DEFAULT ('CC-' || nextval('complaint_code_seq')),
    citizen_id uuid, citizen_identifier_hash text, category text NOT NULL, description text NOT NULL,
    source text NOT NULL, lat double precision, lng double precision, address text, photo_url text,
    status public.complaint_status NOT NULL DEFAULT 'submitted', created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
  );
  CREATE TABLE public.status_history (id uuid PRIMARY KEY DEFAULT gen_random_uuid(), complaint_id uuid REFERENCES public.complaints(id),
    status text NOT NULL, note text, changed_by uuid, changed_at timestamptz NOT NULL DEFAULT now());
`)
await db.exec(await readFile(new URL('../database/intelligence_upgrade.sql', import.meta.url), 'utf8'))
const migration = await readFile(new URL('../database/logic_fixes.sql', import.meta.url), 'utf8')
await db.exec(migration)
await db.exec(migration) // Reapplying must preserve data and RPC signatures.
after(() => db.close())

const hash = 'a'.repeat(64)
const report = { category: 'Road Damage/Potholes', description: 'A large pothole on the main road',
  source: 'text', lat: 0, lng: 0, address: 'Test location', photo_url: null }
const submit = async (id, value = report, citizen = hash) => (await db.query(
  'SELECT public.submit_complaint($1, $2, $3::jsonb) AS code', [id, citizen, JSON.stringify(value)],
)).rows[0].code
const officer = crypto.randomUUID()
await db.query("INSERT INTO profiles (id, role) VALUES ($1, 'authority')", [officer])
const claim = async value => {
  await db.query("SELECT set_config('request.uid', $1, false)", [value])
  await db.query("SELECT set_config('request.role', 'authenticated', false)")
}
const update = async (id, next, expected, note = null, photo = null, expectedVersion = undefined) => {
  const version = expectedVersion === undefined
    ? (await db.query('SELECT updated_at::text AS version FROM complaints WHERE id=$1', [id])).rows[0]?.version
    : expectedVersion
  return db.query('SELECT public.update_complaint_status($1,$2,$3,$4,$5,$6)', [id, next, note, photo, expected, version])
}

test('retry returns the exact original code after another report by the same citizen', async () => {
  const first = crypto.randomUUID(), second = crypto.randomUUID()
  const code = await submit(first)
  const other = await submit(second)
  assert.notEqual(code, other)
  assert.equal(await submit(first), code)
  assert.equal((await db.query('SELECT count(*)::int AS count FROM complaints WHERE id = $1', [first])).rows[0].count, 1)
})

test('a request ID cannot expose another citizen’s tracking code', async () => {
  const id = crypto.randomUUID()
  await submit(id)
  await assert.rejects(submit(id, report, 'b'.repeat(64)), /reference is unavailable/)
})

test('valid zero coordinates work; invalid, missing and non-finite coordinates fail', async () => {
  assert.ok(await submit(crypto.randomUUID()))
  for (const value of [{ lat: 91 }, { lng: -181 }, { lat: null }, { lat: 'NaN' }, { lng: 'Infinity' }]) {
    await assert.rejects(submit(crypto.randomUUID(), { ...report, ...value }))
  }
})

test('server rejects blank descriptions, invalid categories, sources and missing identifiers', async () => {
  for (const value of [{ description: '  ' }, { description: 'x'.repeat(4001) }, { category: 'invalid' }, { source: 'invalid' }, { address: '' }]) {
    await assert.rejects(submit(crypto.randomUUID(), { ...report, ...value }))
  }
  await assert.rejects(submit(crypto.randomUUID(), report, 'invalid'))
})

test('status and history are atomic and stale officer changes cannot overwrite newer status', async () => {
  await claim(officer)
  const id = crypto.randomUUID()
  await submit(id)
  await update(id, 'in-progress', 'submitted', 'Crew assigned')
  await assert.rejects(update(id, 'rejected', 'submitted'), /changed since you opened/)
  assert.equal((await db.query('SELECT status FROM complaints WHERE id=$1', [id])).rows[0].status, 'in-progress')
  assert.equal((await db.query('SELECT count(*)::int AS count FROM status_history WHERE complaint_id=$1', [id])).rows[0].count, 1)
})

test('null status and resolution without a photo fail without writing history', async () => {
  await claim(officer)
  const id = crypto.randomUUID()
  await submit(id)
  await assert.rejects(update(id, null, 'submitted'), /Invalid complaint status/)
  await assert.rejects(update(id, 'resolved', 'submitted'), /resolution photo/)
  assert.equal((await db.query('SELECT count(*)::int AS count FROM status_history WHERE complaint_id=$1', [id])).rows[0].count, 0)
  await update(id, 'resolved', 'submitted', 'Repaired', 'https://example.test/proof.jpg')
  assert.equal((await db.query('SELECT status FROM complaints WHERE id=$1', [id])).rows[0].status, 'resolved')
})

test('stale edits conflict even when another officer keeps the same status', async () => {
  await claim(officer)
  const id = crypto.randomUUID()
  await submit(id)
  const oldVersion = (await db.query('SELECT updated_at::text AS version FROM complaints WHERE id=$1', [id])).rows[0].version
  await update(id, 'submitted', 'submitted', 'Officer one note')
  await assert.rejects(update(id, 'submitted', 'submitted', 'Stale officer note', null, oldVersion), /changed since you opened/)
})

test('non-officers cannot update status or promote their own profile', async () => {
  const citizen = crypto.randomUUID()
  await db.query("INSERT INTO profiles (id, role) VALUES ($1,'citizen')", [citizen])
  await claim(citizen)
  const id = crypto.randomUUID()
  await submit(id)
  await assert.rejects(update(id, 'rejected', 'submitted'), /Authority access required/)
  await assert.rejects(db.query("UPDATE profiles SET role='authority' WHERE id=$1", [citizen]), /administrator/)
})

test('nearby search filters distance before limiting candidates, including the date line', async () => {
  await db.exec(`INSERT INTO complaints (category, description, source, lat, lng, address)
    SELECT 'Road Damage/Potholes', 'Far away report', 'text', 0, 10, 'Distant' FROM generate_series(1, 505)`)
  const id = crypto.randomUUID()
  await submit(id, { ...report, lat: 0, lng: 179.9995 })
  const result = await db.query("SELECT * FROM nearby_complaints(0, -179.9995, now() - interval '30 days', 501)")
  assert.ok(result.rows.some(row => row.id === id))
  assert.ok(result.rows.every(row => row.lng !== 10))
})

test('anonymous users cannot execute the private nearby search', async () => {
  await db.exec('SET ROLE anon')
  try {
    await assert.rejects(db.query("SELECT * FROM nearby_complaints(0, 0, now() - interval '30 days', 501)"), /permission denied/)
  } finally { await db.exec('RESET ROLE') }
})
