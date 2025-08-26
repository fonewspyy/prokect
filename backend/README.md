# Leaf Scan API (FastAPI + YOLOv8)

## Setup
```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\\Scripts\\activate
pip install -r requirements.txt
# Put your YOLO model at: backend/models/best.pt
uvicorn app.main:app --reload --port 8000