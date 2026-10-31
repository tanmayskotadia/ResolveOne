import io
import json
import os
import time
import warnings
from collections import defaultdict, deque
from datetime import datetime, timedelta, timezone
from pathlib import Path
from threading import Lock

import httpx
import numpy as np
from dotenv import load_dotenv
from fastapi import Depends, FastAPI, File, Header, HTTPException, Request, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from PIL import Image, ImageOps, UnidentifiedImageError
from pydantic import BaseModel, Field
from starlette.concurrency import run_in_threadpool

from core import CATEGORIES, completed_samples, distance_m, features, historical_estimate, hotspots, located
from models import MODEL_LOCK, classify_image, classify_text, embeddings

load_dotenv(Path(__file__).with_name('.env'))
app = FastAPI(title="ResolveOne intelligence", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=os.getenv("ALLOWED_ORIGINS", "http://localhost:5173,http://127.0.0.1:5173").split(','),
                   allow_methods=["GET", "POST"], allow_headers=["Authorization", "Content-Type"])
Image.MAX_IMAGE_PIXELS = 20_000_000
RATE_LOCK = Lock()
TRAIN_LOCK = Lock()
buckets = defaultdict(deque)


@app.middleware("http")
async def resource_limits(request: Request, call_next):
    if request.url.path != "/health" and request.method != "OPTIONS":
        now = time.monotonic()
        key = request.client.host if request.client else "unknown"
        with RATE_LOCK:
            if len(buckets) > 10000:
                for old_key in list(buckets):
                    if not buckets[old_key] or buckets[old_key][-1] < now - 60:
                        del buckets[old_key]
            events = buckets[key]
            while events and events[0] < now - 60:
                events.popleft()
            if len(events) >= 30:
                from starlette.responses import JSONResponse
                return JSONResponse({"detail": "Too many requests. Try again in a minute."}, 429, headers={"Retry-After": "60"})
            events.append(now)
        body = bytearray()
        async for chunk in request.stream():
            body.extend(chunk)
            if len(body) > 6 * 1024 * 1024:
                from starlette.responses import JSONResponse
                return JSONResponse({"detail": "Upload must be under 5 MB."}, 413)
        request._body = bytes(body)
    return await call_next(request)


class TextInput(BaseModel):
    description: str = Field(min_length=12, max_length=4000)


class NearbyInput(TextInput):
    lat: float = Field(ge=-90, le=90, allow_inf_nan=False)
    lng: float = Field(ge=-180, le=180, allow_inf_nan=False)


class EstimateInput(BaseModel):
    category: str
    lat: float | None = Field(default=None, ge=-90, le=90, allow_inf_nan=False)
    lng: float | None = Field(default=None, ge=-180, le=180, allow_inf_nan=False)


def config():
    url = os.getenv("SUPABASE_URL", "").rstrip('/')
    key = os.getenv("SUPABASE_ANON_KEY", "")
    if not url or not key:
        raise HTTPException(503, "Database connection is not configured on the intelligence service.")
    return url, key


def rest(table, params, token=None):
    url, anon = config()
    key = anon if token else os.getenv("SUPABASE_SERVICE_ROLE_KEY", "")
    if not key:
        raise HTTPException(503, "Private database access is not configured on the intelligence service.")
    try:
        response = httpx.get(f"{url}/rest/v1/{table}", params=params,
                             headers={"apikey": key, "Authorization": f"Bearer {token or key}"}, timeout=30)
        response.raise_for_status()
        return response.json()
    except (httpx.HTTPError, ValueError):
        raise HTTPException(503, "Could not read complaint history. Please retry.") from None


def authority(authorization: str | None = Header(default=None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(401, "Sign in with an authority account.")
    token = authorization[7:]
    url, anon = config()
    try:
        response = httpx.get(f"{url}/auth/v1/user", headers={"apikey": anon, "Authorization": authorization}, timeout=15)
        if response.status_code != 200:
            raise HTTPException(401, "Your session has expired. Please sign in again.")
        user = response.json()
    except httpx.HTTPError:
        raise HTTPException(503, "Could not verify your session.") from None
    profiles = rest("profiles", {"select": "role", "id": f"eq.{user['id']}"}, token)
    if not profiles or profiles[0]["role"] != "authority":
        raise HTTPException(403, "An authority account is required.")
    return token


def pages(table, select, token=None, extra=None):
    result = []
    for offset in range(0, 20001, 1000):
        batch = rest(table, {"select": select, "order": "id.asc", "limit": 1000, "offset": offset, **(extra or {})}, token)
        result.extend(batch)
        if len(result) > 20000:
            raise HTTPException(413, "This dataset exceeds 20,000 records. Scope the service to a municipality before analyzing it.")
        if len(batch) < 1000:
            return result
    return result


def dataset(token=None):
    rows = pages("complaints", "id,category,status,lat,lng,created_at", token)
    history = pages("status_history", "id,complaint_id,status,changed_at", token)
    return rows, completed_samples(rows, history)


def model_dir():
    path = Path(os.getenv("MODEL_DIR", str(Path(__file__).with_name('models'))))
    path.mkdir(parents=True, exist_ok=True)
    return path


def model_metadata():
    path = model_dir() / 'eta.json'
    return json.loads(path.read_text()) if path.exists() else None


def estimate(data, samples):
    with MODEL_LOCK:
        meta = model_metadata()
        if meta and data.category in meta['categories'] and data.lat is not None and data.lng is not None:
            from catboost import CatBoostRegressor
            model = CatBoostRegressor()
            model.load_model(str(model_dir() / meta['file']))
            row = {"category": data.category, "lat": data.lat, "lng": data.lng,
                   "created_at": datetime.now(timezone.utc).isoformat()}
            prediction = max(0, float(model.predict([features(row)])[0]))
            spread = meta['error_hours_p80']
            return {"source": "catboost", "low_days": round(max(0, prediction - spread) / 24, 1),
                    "high_days": round((prediction + spread) / 24, 1), "sample_count": meta['sample_count'],
                    "trained_at": meta['trained_at'], "message": "Estimated total time from submission, with a holdout-error range. Not a deadline."}
    return historical_estimate(data.category, samples)


def inference(operation, *args):
    try:
        return operation(*args)
    except Exception:
        # Do not expose provider errors, credentials, or citizen input to clients/logs.
        raise HTTPException(503, "The model is unavailable or still downloading. You can continue manually and retry later.") from None


@app.get('/health')
def health():
    return {"status": "ok", "ml_enabled": os.getenv('ENABLE_ML', 'true').lower() == 'true',
            "database_configured": bool(os.getenv('SUPABASE_URL') and os.getenv('SUPABASE_SERVICE_ROLE_KEY')),
            "eta_trained": (model_dir() / 'eta.json').exists()}


@app.post('/classify/text')
def text(data: TextInput):
    return inference(classify_text, data.description)


@app.post('/classify/photo')
async def photo(file: UploadFile = File(...)):
    content = await file.read(5 * 1024 * 1024 + 1)
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(413, "Choose a photo smaller than 5 MB.")
    try:
        with warnings.catch_warnings():
            warnings.simplefilter('error', Image.DecompressionBombWarning)
            image = Image.open(io.BytesIO(content))
            if image.format not in ('JPEG', 'PNG', 'WEBP'):
                raise ValueError('Unsupported image')
            image = ImageOps.exif_transpose(image).convert('RGB')
            image.thumbnail((1024, 1024))
    except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
        raise HTTPException(422, "Choose a valid JPEG, PNG or WebP photo under 20 megapixels.") from None
    return await run_in_threadpool(inference, classify_image, image)


@app.post('/duplicates')
def duplicates(data: NearbyInput):
    since = (datetime.now(timezone.utc) - timedelta(days=30)).isoformat()
    rows = rest('complaints', {"select": "id,complaint_code,description,category,status,lat,lng",
                              "created_at": f"gte.{since}", "status": "not.in.(resolved,rejected)",
                              "and": f"(lat.gte.{max(-90, data.lat - .0023)},lat.lte.{min(90, data.lat + .0023)})",
                              "order": "created_at.desc", "limit": 501})
    limited = len(rows) > 500
    nearby = [r for r in rows[:500] if located(r) and distance_m(data.lat, data.lng, r['lat'], r['lng']) <= 250]
    if not nearby:
        return {"matches": [], "limited": limited}
    vectors = inference(embeddings, [data.description] + [r['description'][:4000] for r in nearby])
    scores = vectors[1:] @ vectors[0]
    matches = []
    for i in np.argsort(scores)[::-1]:
        if scores[i] < .72:
            continue
        row = nearby[int(i)]
        # Only public issue metadata leaves the service. Never return other citizens' text or identifiers.
        matches.append({"code": row['complaint_code'], "category": row['category'], "status": row['status'],
                        "distance_m": round(distance_m(data.lat, data.lng, row['lat'], row['lng']) / 25) * 25,
                        "score": round(float(scores[i]), 3)})
    return {"matches": matches[:5], "limited": limited}


@app.post('/estimate')
def public_estimate(data: EstimateInput):
    if data.category not in CATEGORIES:
        raise HTTPException(422, "Choose a supported category.")
    _, samples = dataset()
    return estimate(data, samples)


@app.get('/insights')
def insights(token: str = Depends(authority)):
    rows, samples = dataset(token)
    predictions = {}
    with MODEL_LOCK:
        meta = model_metadata()
        if meta:
            from catboost import CatBoostRegressor
            model = CatBoostRegressor()
            model.load_model(str(model_dir() / meta['file']))
            active = [r for r in rows if r['status'] not in ('resolved', 'rejected') and located(r) and r['category'] in meta['categories']]
            if active:
                hours = model.predict([features(r) for r in active])
                for row, prediction in zip(active, hours):
                    predictions[row['id']] = {'source': 'catboost', 'sample_count': meta['sample_count'],
                                              'low_days': round(max(0, prediction - meta['error_hours_p80']) / 24, 1),
                                              'high_days': round(max(0, prediction + meta['error_hours_p80']) / 24, 1),
                                              'message': 'Total time from submission; not a deadline.'}
    return {"hotspots": hotspots(rows), "estimates": {category: historical_estimate(category, samples) for category in CATEGORIES},
            "predictions": predictions,
            "completed_samples": len(samples), "model": model_metadata(), "total": len(rows),
            "generated_at": datetime.now(timezone.utc).isoformat()}


@app.post('/train')
def train(token: str = Depends(authority)):
    if not TRAIN_LOCK.acquire(blocking=False):
        raise HTTPException(409, "Training is already running. Refresh insights shortly.")
    try:
        _, samples = dataset(token)
        samples = [(row, duration) for row, duration in samples if located(row)]
        if len(samples) < 50:
            raise HTTPException(422, f"Training needs at least 50 resolved issues with location and resolution history; found {len(samples)}.")
        from catboost import CatBoostRegressor
        split = int(len(samples) * .8)
        from core import timestamp
        cutoff = timestamp(samples[split][0]['created_at'])
        training = [(row, hours) for row, hours in samples[:split] if timestamp(row['_resolved_at']) < cutoff]
        if len(training) < 30 or len(samples[split:]) < 10:
            raise HTTPException(422, 'More non-overlapping resolution history is needed for a reliable time-based validation split.')
        train_x = [features(row) for row, _ in training]
        train_y = [hours for _, hours in training]
        test_x = [features(row) for row, _ in samples[split:]]
        test_y = [hours for _, hours in samples[split:]]
        x = [features(row) for row, _ in samples]
        y = [hours for _, hours in samples]
        options = dict(iterations=180, depth=4, learning_rate=.05, loss_function='MAE', cat_features=[0],
                       random_seed=42, verbose=False, allow_writing_files=False, thread_count=2)
        validation = CatBoostRegressor(**options)
        validation.fit(train_x, train_y)
        errors = np.abs(validation.predict(test_x) - np.array(test_y))
        baseline_hours = float(np.median(train_y))
        model = CatBoostRegressor(**options)
        model.fit(x, y)
        name = f"eta-{time.time_ns()}.cbm"
        meta = {"file": name, "sample_count": len(samples), "validation_count": len(errors),
                "mae_hours": round(float(np.mean(errors)), 2), "error_hours_p80": round(float(np.quantile(errors, .8)), 2),
                "baseline_mae_hours": round(float(np.mean(np.abs(np.array(test_y) - baseline_hours))), 2),
                "categories": sorted({r['category'] for r, _ in samples}),
                "trained_at": datetime.now(timezone.utc).isoformat()}
        with MODEL_LOCK:
            model.save_model(str(model_dir() / name))
            target = model_dir() / 'eta.tmp'
            target.write_text(json.dumps(meta))
            target.replace(model_dir() / 'eta.json')
        return meta
    finally:
        TRAIN_LOCK.release()


@app.post('/transcribe')
async def transcribe(file: UploadFile = File(...)):
    key = os.getenv('SARVAM_API_KEY')
    if not key:
        raise HTTPException(503, 'Voice input is not configured. Please type your report.')
    content = await file.read(5 * 1024 * 1024 + 1)
    if len(content) > 5 * 1024 * 1024:
        raise HTTPException(413, 'Recording is too large. Please record a shorter message.')
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            response = await client.post('https://api.sarvam.ai/speech-to-text', headers={'api-subscription-key': key},
                                         files={'file': (file.filename or 'recording.webm', content, file.content_type or 'audio/webm')},
                                         data={'model': 'saaras:v3', 'mode': 'translate'})
            response.raise_for_status()
            return {"text": response.json().get('transcript') or response.json().get('text', '')}
    except (httpx.HTTPError, ValueError):
        raise HTTPException(503, 'Voice transcription is unavailable. Please retry or type your report.') from None
