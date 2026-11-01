# Multilingual duplicate matching

This isolated service runs pinned Xenova/multilingual-e5-small ONNX int8 embeddings with query prefixes, masked mean pooling and normalized vectors. It generates no text. The Supabase `duplicate-check` gateway supplies real candidates and reconstructs response metadata from database rows. The model service has no database credentials and receives no Aadhaar number or hash. The gateway filters candidates by the hash before sending report text to the model.

## Matching and limits

Only reports with the same stored citizen/Aadhaar hash qualify, then open reports within 250 m and 30 days qualify; at most the latest 100 are checked, with an explicit coverage warning. Cross-language cosine similarity must be at least 0.84. Unrecognized topic pairs need 0.90. Civic topic-conflict guards reduce confusion between traffic jams, potholes, water supply, leaks and other common issues. Topic vocabulary currently covers common English, Hindi, Tamil, Telugu, Gujarati and some Kannada/Malayalam terms; coverage is not universal. The model supports additional languages, but accuracy varies. Long inputs are truncated to 128 model tokens; include the actual problem early in the description.

A small semantic contrast set and repetition/link checks request more detail for unclear or promotional text. This is not a trained spam classifier and does not verify whether a complaint is true. Reports are never automatically rejected, merged, or overwritten. Scores are not probabilities. The threshold passed the committed synthetic examples; representative labelled municipal data is still needed to measure real precision and recall.

## Verification

From this directory, use a virtualenv with requirements plus pytest and httpx installed, then `python -m pytest -q`. Tests run real pinned embeddings; no fabricated vectors. Tests cover paraphrases in English, Hindi, Tamil, Telugu and Gujarati, unrelated civic issues, spam-like input, positive/negative descriptions, time and distance boundaries and closed issues.

## Deployment

Docker downloads pinned weights at build time, then loads them offline at startup. Run one worker with CPU thread count 1. GET /health is ready after model warmup. POST /match accepts synthetic or gateway-provided candidates; never pass credentials or citizen identifiers. Access logs are disabled and texts are cached only in bounded process memory. The free Render plan can sleep; initial requests may time out while waking. The frontend remains usable and offers retry. Production traffic may require an always-on plan, which must be separately authorized.

Apply `supabase/migrations/20261101073633_duplicate_following.sql` to the existing project, deploy `supabase/functions/duplicate-check/index.ts` with the verified ML URL, and keep JWT verification enabled. The gateway uses its built-in service-role environment value server-side only. HMAC-signed match tickets expire after 10 minutes; private random follow tokens reveal only category, code, status and dates. A lost follow link cannot be recovered by guessing a complaint code. Following sends no notifications and creates no new complaint. A quota limits each hashed network identity to 20 checks/follows per minute; raw IPs are not stored. No token should be included in analytics or logs.
