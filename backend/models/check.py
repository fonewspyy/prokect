from ultralytics import YOLO

# โหลดโมเดลที่เทรนมาแล้ว
model = YOLO("backend/models/best.pt")

# ดู classes ทั้งหมด
print(model.names)       # dict: {0: "Durian Leaf Rust Disease", 1: "Rambutan Leaf Disease", ...}

# หรือแสดงแบบสวย ๆ
for i, name in model.names.items():
    print(i, name)
