"""Pure geospatial and resolution-history logic. No network or model downloads."""
from datetime import datetime, timezone
from math import asin, cos, radians, sin, sqrt
import numpy as np
from sklearn.cluster import DBSCAN

CATEGORIES = ["Garbage/Waste", "Road Damage/Potholes", "Streetlights",
              "Water Leakage/Supply", "Drainage/Sewage", "Electricity",
              "Public Infrastructure", "Other"]
PROTOTYPES = [
    "Garbage rubbish trash litter waste dumped on the street overflowing dustbin",
    "Damaged road pothole cracked pavement broken asphalt",
    "Street light lamp not working dark road broken streetlight",
    "Water supply pipe leaking broken pipe no drinking water",
    "Blocked drain sewage sewer overflowing dirty wastewater",
    "Electricity power outage exposed electrical wire fallen power cable",
    "Damaged public park bench bus shelter footpath public infrastructure",
    "Other civic issue not covered by waste road lighting water sewage electricity or infrastructure",
]
PHOTO_PROMPTS = [
    "a photo of garbage waste litter dumped on a street",
    "a photo of a pothole or damaged road surface",
    "a photo of a broken streetlight",
    "a photo of a leaking water supply pipe",
    "a photo of an overflowing sewage drain",
    "a photo of damaged electrical wires or a fallen electricity pole",
    "a photo of a broken public bench bus stop or sidewalk",
    "a photo unrelated to civic infrastructure, an indoor scene, a person or an animal",
]


def timestamp(value):
    return datetime.fromisoformat(value.replace("Z", "+00:00")).astimezone(timezone.utc)


def located(row):
    return (isinstance(row.get("lat"), (int, float)) and isinstance(row.get("lng"), (int, float))
            and np.isfinite(row["lat"]) and np.isfinite(row["lng"])
            and -90 <= row["lat"] <= 90 and -180 <= row["lng"] <= 180)


def distance_m(lat1, lng1, lat2, lng2):
    a = sin(radians(lat2 - lat1) / 2) ** 2 + cos(radians(lat1)) * cos(radians(lat2)) * sin(radians(lng2 - lng1) / 2) ** 2
    return 6371000 * 2 * asin(sqrt(min(1, max(0, a))))


def hotspots(rows, now=None):
    now = now or datetime.now(timezone.utc)
    eligible = [r for r in rows if located(r) and r["status"] not in ("resolved", "rejected")
                and 0 <= (now - timestamp(r["created_at"])).total_seconds() <= 30 * 86400]
    result = []
    for category in CATEGORIES:
        group = [r for r in eligible if r["category"] == category]
        if len(group) < 3:
            continue
        points = np.radians([[r["lat"], r["lng"]] for r in group])
        labels = DBSCAN(eps=250 / 6371000, min_samples=3, metric="haversine", algorithm="ball_tree").fit_predict(points)
        for label in sorted(set(labels) - {-1}):
            members = [r for r, cluster in zip(group, labels) if cluster == label]
            result.append({"category": category, "count": len(members),
                           "lat": float(np.mean([r["lat"] for r in members])),
                           "lng": float(np.mean([r["lng"] for r in members])),
                           "complaint_ids": [r["id"] for r in members]})
    return sorted(result, key=lambda x: -x["count"])


def completed_samples(rows, history):
    # Only real resolution transitions are labels; updated_at can mean any edit.
    resolved_at = {}
    previous_status = {}
    for h in sorted(history, key=lambda h: (timestamp(h['changed_at']), h.get('id', ''))):
        if h["status"] == "resolved" and previous_status.get(h['complaint_id']) != 'resolved':
            when = timestamp(h["changed_at"])
            resolved_at[h["complaint_id"]] = max(when, resolved_at.get(h["complaint_id"], when))
        previous_status[h['complaint_id']] = h['status']
    samples = []
    for row in rows:
        if row["status"] != "resolved" or row["id"] not in resolved_at:
            continue
        hours = (resolved_at[row["id"]] - timestamp(row["created_at"])).total_seconds() / 3600
        if hours > 0:
            samples.append(({**row, '_resolved_at': resolved_at[row['id']].isoformat()}, hours))
    return sorted(samples, key=lambda pair: timestamp(pair[0]["created_at"]))


def features(row):
    date = timestamp(row["created_at"])
    return [row["category"], float(row.get("lat") or 0), float(row.get("lng") or 0), date.weekday(), date.hour]


def historical_estimate(category, samples):
    hours = [duration for row, duration in samples if row["category"] == category]
    if len(hours) < 5:
        return {"source": "unavailable", "sample_count": len(hours),
                "message": "An estimate will appear after at least 5 issues in this category have recorded resolution times."}
    low, high = np.quantile(hours, [0.2, 0.8]) / 24
    return {"source": "history", "sample_count": len(hours), "low_days": round(float(low), 1),
            "high_days": round(float(high), 1), "message": "Typical total time from submission, based on completed issues. Not a deadline."}
