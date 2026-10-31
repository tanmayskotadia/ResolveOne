"""Lazy, CPU-compatible inference. Never substitute fabricated model outputs."""
import os
from pathlib import Path
from functools import lru_cache
from threading import RLock
import numpy as np
from core import CATEGORIES, PROTOTYPES, PHOTO_PROMPTS

os.environ.setdefault('HF_HOME', str(Path(__file__).with_name('.cache') / 'huggingface'))

MODEL_LOCK = RLock()
TEXT_MODEL = "sentence-transformers/paraphrase-multilingual-MiniLM-L12-v2"
IMAGE_MODEL = "openai/clip-vit-base-patch32"


def enabled():
    if os.getenv("ENABLE_ML", "true").lower() != "true":
        raise RuntimeError("Model inference disabled")


@lru_cache(maxsize=1)
def text_model():
    enabled()
    from sentence_transformers import SentenceTransformer
    return SentenceTransformer(TEXT_MODEL, device="cpu")


def embeddings(texts):
    with MODEL_LOCK:
        return text_model().encode(texts, normalize_embeddings=True, show_progress_bar=False)


@lru_cache(maxsize=1)
def prototypes():
    return embeddings(PROTOTYPES)


def rank(scores, model, minimum=0.35, margin=0.04):
    order = np.argsort(scores)[::-1][:3]
    choices = [{"category": CATEGORIES[int(i)], "score": round(float(scores[i]), 3)} for i in order]
    confident = float(scores[order[0]]) >= minimum and float(scores[order[0]] - scores[order[1]]) >= margin
    return {"model": model, "suggestions": choices, "uncertain": not confident,
            "message": "Check the suggestion before applying it. Scores are relative matches, not verified accuracy."}


def classify_text(description):
    scores = embeddings([description])[0] @ prototypes().T
    return rank(scores, TEXT_MODEL)


@lru_cache(maxsize=1)
def image_model():
    enabled()
    from transformers import CLIPModel, CLIPProcessor
    return CLIPModel.from_pretrained(IMAGE_MODEL).eval(), CLIPProcessor.from_pretrained(IMAGE_MODEL, use_fast=False)


def classify_image(image):
    import torch
    with MODEL_LOCK:
        model, processor = image_model()
        inputs = processor(text=PHOTO_PROMPTS, images=image, return_tensors="pt", padding=True)
        with torch.inference_mode():
            scores = model(**inputs).logits_per_image.softmax(dim=1)[0].cpu().numpy()
    return rank(scores, IMAGE_MODEL, minimum=0.5, margin=0.15)
