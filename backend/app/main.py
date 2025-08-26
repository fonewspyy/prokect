import os, time
from io import BytesIO
from typing import Any, Dict, List, Optional

import torch
from PIL import Image, UnidentifiedImageError
from fastapi import FastAPI, File, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from ultralytics import YOLO

from .disease_info import DISEASE_ADVICE, HEALTHY_CLASSES

MODEL_PATH = os.getenv("MODEL_PATH", os.path.join(os.path.dirname(__file__), "..", "models", "best.pt"))
ALLOWED_ORIGINS = os.getenv("ALLOWED_ORIGINS", "*").split(",")

app = FastAPI(title="Leaf Scan API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# load model once
yolo_model = YOLO(MODEL_PATH)

class Box(BaseModel):
    x1: int; y1: int; x2: int; y2: int

class Prediction(BaseModel):
    box: Box
    confidence: float
    class_id: int
    label: str
    is_disease: bool
    advice: Optional[Dict[str, Any]] = None

class PredictResponse(BaseModel):
    image: Dict[str, int]
    predictions: List[Prediction]
    summary: Dict[str, Any]
    elapsed_ms: int

@app.get("/health")
def health():
    return {"status": "ok", "model_path": MODEL_PATH}

@app.get("/classes")
def classes():
    return {"classes": yolo_model.names, "advice_keys": list(DISEASE_ADVICE.keys())}

def _img_info(img: Image.Image): return {"width": img.width, "height": img.height}
def _box(xyxy): x1,y1,x2,y2 = [int(max(0,v)) for v in xyxy]; return {"x1":x1,"y1":y1,"x2":x2,"y2":y2}
def _advice(label): return DISEASE_ADVICE.get(label)

@app.post("/predict", response_model=PredictResponse)
async def predict(image: UploadFile = File(...), conf: float = 0.25, iou: float = 0.45):
    if not image.content_type or not image.content_type.startswith("image/"):
        raise HTTPException(400, "Invalid file type")

    raw = await image.read()
    if len(raw) > 8 * 1024 * 1024:
        raise HTTPException(413, "File too large (> 8MB)")

    try:
        pil = Image.open(BytesIO(raw)).convert("RGB")
    except UnidentifiedImageError:
        raise HTTPException(400, "Unreadable image")

    t0 = time.perf_counter()
    with torch.inference_mode():
        results = yolo_model.predict(pil, conf=conf, iou=iou, verbose=False)
    det = results[0]
    names = yolo_model.names

    preds: List[Prediction] = []
    for b in det.boxes:
        xyxy = b.xyxy[0].tolist()
        conf_v = float(b.conf[0].item())
        cls_id = int(b.cls[0].item())
        label = names.get(cls_id, str(cls_id))
        is_disease = label not in HEALTHY_CLASSES and "non" not in label.lower()
        preds.append(Prediction(
        box=Box(**_box(xyxy)),
        confidence=conf_v,
        class_id=cls_id,
        label=label,
        is_disease=is_disease,
        advice=_advice(label) if is_disease else None,
    ))

    by_label = {}
    for p in preds:
        n = by_label.setdefault(p.label, {"count":0, "max_conf":0.0})
        n["count"] += 1
        n["max_conf"] = max(n["max_conf"], p.confidence)
    top_label = max(by_label, key=lambda k: (by_label[k]["count"], by_label[k]["max_conf"])) if by_label else None

    return {
        "image": _img_info(pil),
        "predictions": [p.model_dump() for p in preds],
        "summary": {"top_label": top_label, "by_label": by_label},
        "elapsed_ms": int((time.perf_counter() - t0) * 1000),
    }
