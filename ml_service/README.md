# ResolveOne intelligence

The React app now integrates five features:

1. **Semantic duplicate detection:** multilingual MiniLM embeddings compare a report against up to 500 recent, open reports within 250 m. Only codes, categories, status and rounded distance are returned to citizens. The initial similarity threshold is 0.72; validate it on local complaints before treating matches as confirmed duplicates.
2. **Text category suggestions:** the same multilingual model compares complaint text with category descriptions. Top-three suggestions are editable. Ambiguous matches are explicitly marked uncertain. This is a pretrained semantic classifier, not a classifier trained on your municipality's data.
3. **Photo category suggestions:** CLIP compares image content with civic issue descriptions. Photos are decoded and resized in memory; the ML service does not store them. Scores are relative to the supplied labels, not calibrated accuracy.
4. **Hotspots:** DBSCAN with a haversine metric clusters open reports from the last 30 days by category, with 250 m neighborhoods and a minimum of 3 points. A connected cluster may cover more than 250 m. This shows reporting concentrations, not independently verified infrastructure failure rates.
5. **Resolution estimates:** category-specific historical 20th–80th percentile ranges appear after 5 recorded resolutions. Officers can train CatBoost after 50 located resolved reports. Validation uses the latest 20% of submissions and excludes training examples resolved after the holdout begins. At least 30 eligible training examples and 10 holdout examples are required. The dashboard reports model and median-baseline MAE. Predictions show total duration from submission, not remaining time or guaranteed deadlines.

## Local setup (PowerShell)

From `smart_cities/ml_service`:

```powershell
python -m venv .venv
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit the **server** `.env` with your Supabase URL, public anon key, and service-role key. Keep the service-role key and Sarvam key exclusively in this file or server environment variables. Do not paste them into chat or frontend files. For this workspace the virtual environment and ML dependencies have already been installed; complete the environment configuration.

Apply `database/intelligence_upgrade.sql` in the Supabase SQL editor **after** the existing schema and resolution-photo migrations. The migration removes demo anonymous authority access, makes new signups citizens, prevents users from promoting their own role, and adds the atomic status/history RPC. Do not rerun the old schema afterward because it recreates demo policies.

Then run `database/logic_fixes.sql` in a **separate execution**. This adds idempotent complaint submission, checks for conflicting officer status changes, normalizes legacy `open` statuses, and installs the private geographic duplicate-search RPC. Both the current frontend and ML API require these RPCs. For an existing installation, apply this migration before deploying this version. Its SQL is tested against an isolated PostgreSQL runtime with `npm run test:database`; no test uses your live database.

Create the officer in Supabase Authentication, then an administrator can grant the role using that user's exact UUID:

```sql
update public.profiles set role = 'authority' where id = 'YOUR-OFFICER-USER-UUID';
```

Audit existing `profiles` roles: older versions automatically made signups authorities. Existing roles are preserved by this migration so legitimate officers are not locked out. Use Supabase email/password sign-in; the old hard-coded demo login has been removed.

Start the API:

```powershell
.\.venv\Scripts\python.exe -m uvicorn app:app --host 127.0.0.1 --port 8000
```

In another terminal, from `smart_cities`:

```powershell
npm run dev
```

Vite proxies `/api/ml/*` to port 8000. Text and image weights download on first use to the ignored `ml_service/.cache/huggingface` directory; the initial download can take several minutes. Prefetch and exercise both models with:

```powershell
.\.venv\Scripts\python.exe -u smoke_models.py
```

The models run on CPU. For a standalone service use `http://127.0.0.1:8000/docs` to inspect requests. `/health` reports configuration presence, not successful provider authentication or model readiness.

## Using the platform

- Report Details: type at least 12 characters, then apply a suggested category or choose manually.
- Photo: upload a JPEG, PNG or WebP under 5 MB. Apply a photo suggestion or keep the existing category. Photo inference also limits decoded images to 20 megapixels.
- Review: inspect possible nearby duplicates and the resolution outlook. These optional checks never prevent submission.
- Authority: sign in, then choose **Insights**. Filter hotspots, review a cluster's reports, and train/retrain the ETA model when enough real history exists. Exports now download CSV and protect against spreadsheet formula injection.
- Status changes and notes use a single database transaction so training history and complaint status remain consistent. Repeated notes on resolved reports do not change their recorded completion time.

Suggestions are advisory and never overwrite the category automatically, reject reports, merge complaints, or mark repairs complete. Citizen description text is sent to the configured backend for inference. Pretrained inference is local to that backend; voice transcription uses Sarvam when configured.

## Deployment

Run the Python service on a CPU-capable server with enough RAM for PyTorch, MiniLM and CLIP. Preserve `MODEL_DIR` and the model cache between restarts; CatBoost artifacts are stored in `MODEL_DIR`. Run one API worker initially because each worker loads its own weights and the training lock/rate limiter is process-local. Add shared rate limiting and a training job queue before scaling to multiple workers. Configure upstream request/time limits for uploads and training.

Set `VITE_ML_API_URL=https://YOUR-API-HOST` when building the frontend, or configure your reverse proxy to forward `/api/ml/*` to the Python service with that prefix removed. Vite's development proxy does not run in a static production build. Restrict `ALLOWED_ORIGINS` to your frontend origin. Put server secrets in the server environment. Never use a `VITE_` prefix for private API keys. The old Sarvam browser key is no longer read; rotate previously exposed credentials through their provider consoles.

Database reads paginate explicitly and fail with a clear message above 20,000 records rather than silently showing partial analytics. Duplicate searches disclose when the 500-candidate limit is reached. This implementation assumes one municipality per Supabase project; add tenant/ward authorization and scoped queries before serving multiple municipalities.

## Verification

```powershell
# From ml_service
.\.venv\Scripts\python.exe -m pytest -q
# From smart_cities
npm run build
npm run lint
npm run test:database
npm run test:ui
```

The API tests cover actual CatBoost training/prediction on isolated synthetic fixtures, resolution labels and reopening, clustering, duplicate privacy, authorization, rate limits, bad images, and missing-provider fallbacks. Mocked pretrained outputs in API tests check the HTTP integration; `smoke_models.py` separately tests real downloaded MiniLM and CLIP weights. Test fixtures never write to your live Supabase database and are never presented as real training data.

Before rollout, validate model quality on manually reviewed local examples: category macro-F1 by language, duplicate precision/recall across different locations, image errors on unrelated photos, and ETA MAE on later real submissions. No accuracy claim is implied by a working inference endpoint.


## Required review fixes

Apply `database/review_fixes.sql` (or `review_fixes.sql` from this directory) **after `logic_fixes.sql` and before deploying the frontend**. It requires fresh completion proof after reopening a complaint, restricts officer writes to the atomic status RPC, and adds `track_complaint` so tracking reads status and history in one database snapshot. It preserves existing reports and is safe to rerun. Full order: original schema → resolution scripts → intelligence upgrade → logic fixes → review fixes. Do not rerun the baseline afterward.
