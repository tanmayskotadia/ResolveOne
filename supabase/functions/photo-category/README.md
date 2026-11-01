# Optional photo category suggestions — free tier only

Provider/model: Google Gemini `gemini-3.5-flash-lite`. Current official pricing lists image input and text output as free on the free tier: https://ai.google.dev/gemini-api/docs/pricing#gemini-3.5-flash-lite . Model access, quotas and free-tier availability can change. Check Google AI Studio for your actual quota. This integration has no alternate models, automatic retries, grounding, tools, or paid-provider fallback.

## Required account setup

Use a Google AI Studio project with **Cloud Billing disabled**. The app cannot inspect a key's billing tier; if a billed-project key is supplied, Google may bill it under that project's pricing. A secret flag is an operator confirmation, not a billing API check. Keeping billing disabled is essential to the zero-spend requirement. Do not enable billing, buy credits or upgrade hosting to activate this feature.

In the existing Supabase project, go to Edge Functions → Secrets and set:

- `GEMINI_API_KEY`: the key from your billing-disabled project. Never use a `VITE_` variable or commit this key.
- `GEMINI_FREE_TIER_CONFIRMED`: `true`, only after checking the project is on the free tier with billing disabled.

The function uses the existing private `duplicate_quota` RPC in a separate namespaced bucket, so it requires the already-applied duplicate-following migration. No existing tables, submission functions or duplicate matching rules are changed. Supabase Edge Function limits also apply on its free plan.

Deploy index.ts, handler.ts and logic.ts together with JWT verification enabled. GET returns only `{enabled, model}` without making a provider call. The photo panel is hidden when unavailable or unconfigured. Reload the photo step after configuring secrets. Revoke/remove the key or unset the confirmation flag to disable suggestions.

## Citizen flow and data

The citizen must explicitly consent and click Suggest category. The app decodes the photo locally, refuses decoded images over 20 MP, resizes to a maximum edge of 768 px and re-encodes JPEG to remove EXIF metadata. Only that image is sent to the edge function and then Google; no Aadhaar, identity hash, citizen account, exact coordinates or complaint text is sent. Google free-tier content may be used for product improvement; the UI discloses this and advises avoiding sensitive photos. This is not a guarantee that resized images contain no sensitive visual content.

The server limits input size, checks MIME signatures, applies rate limits and makes a single bounded inference request. Strict output validation allows only current category names, uncertainty and a short evidence sentence. Instructions depicted in the image are untrusted. Safety blocks, truncated responses, missing evidence, unknown categories, provider errors and quotas preserve manual selection. Model evidence is rendered as text, never executable HTML. Neither the original file nor provider response is logged or cached by this code. Platform/provider retention is governed by their own policies.

The citizen must click Apply suggestion to change the category. An unclear or unrelated photo can return uncertain; no confidence percentages, complaint authenticity claims, automatic rejection, photo replacement or submission changes occur. Ordinary objects are not proof of malfunction. Model output can still be wrong, and real accuracy requires evaluation on representative labelled photos.

## Checks

`npm run test:ui` covers the API handler with mocked provider responses, explicit consent, quotas, no paid fallback, malformed output, uncertainty, stale results, resizing and metadata re-encoding. These are **integration-contract tests, not real-model accuracy results**. Live model evaluation requires the operator's configured free key. Test generic/public civic photographs and unrelated/ambiguous images before enabling for citizens; never use private or identifying images for evaluation.
