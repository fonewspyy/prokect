// File: src/components/BoxOverlay.jsx
export default function BoxOverlay({ preds = [], natural, displayed }) {
  if (!natural?.width || !displayed?.width) return null;

  const sx = displayed.width / natural.width;
  const sy = displayed.height / natural.height;

  // 1) mapping ตาม id ที่โฟนให้มา
  const colorById = {
    0: "#ef4444",  // Durian Leaf Blight Disease
    1: "#f97316",  // Durian Leaf Rust Disease
    2: "#eab308",  // Durian Leaf Spot Disease
    3: "#a855f7",  // Leaf scorch
    4: "#06b6d4",  // Longkong-Rust-Spot-Disease
    5: "#2563eb",  // Mangosteen black spot disease
    6: "#16a34a",  // Mangosteen-Leaf-Drying
    7: "#15803d",  // Mangosteen-Leaf-Spot-Disease
    8: "#f43f5e",  // Mealybug
    9: "#ec4899",  // Powdery mildew of Rumbutan
    10: "#8b5cf6", // Rambutan Leaf Blight Disease
    11: "#dc2626", // Rambutan-Algal-Spot-Disease
    12: "#0ea5e9", // non-disease
  };

  // 2) mapping สำรองตาม label (กันกรณี class_id ไม่มา/เป็น null/เพี้ยน)
  const colorByLabel = {
    "Durian Leaf Blight Disease": "#ef4444",
    "Durian Leaf Rust Disease": "#f97316",
    "Durian Leaf Spot Disease": "#eab308",
    "Leaf scorch": "#a855f7",
    "Longkong-Rust-Spot-Disease": "#06b6d4",
    "Mangosteen black spot disease": "#2563eb",
    "Mangosteen-Leaf-Drying": "#16a34a",
    "Mangosteen-Leaf-Spot-Disease": "#15803d",
    "Mealybug": "#f43f5e",
    "Powdery mildew of Rumbutan": "#ec4899",   // <- สะกด Rumbutan ตามที่โฟนให้
    "Rambutan Leaf Blight Disease": "#8b5cf6",
    "Rambutan-Algal-Spot-Disease": "#dc2626",
    "non-disease": "#0ea5e9",
  };

  // 3) palette สำรองสุดท้าย (แน่ใจว่ามีสีเสมอ)
  const fallbackPalette = [
    "#ef4444", "#f97316", "#eab308", "#a855f7", "#06b6d4",
    "#2563eb", "#16a34a", "#15803d", "#f43f5e", "#ec4899",
    "#8b5cf6", "#dc2626", "#0ea5e9",
  ];

  const pickColor = (p) => {
    const cid = Number(p.class_id);
    if (!Number.isNaN(cid) && cid in colorById) return colorById[cid];
    if (p.label && colorByLabel[p.label]) return colorByLabel[p.label];
    // ถ้ายังไม่เจอ ให้ใช้พาเลตหมุนตาม class_id (หรือ 0 ถ้าไม่มี)
    const idx = !Number.isNaN(cid) ? Math.abs(cid) % fallbackPalette.length : 0;
    return fallbackPalette[idx];
  };

  return (
    <div className="overlay" style={{ width: displayed.width, height: displayed.height }}>
      {preds.map((p, idx) => {
        const { x1, y1, x2, y2 } = p.box;
        const left = x1 * sx;
        const top = y1 * sy;
        const width = (x2 - x1) * sx;
        const height = (y2 - y1) * sy;

        const color = pickColor(p);

        return (
          <div
            key={idx}
            className="bbox"
            style={{ left, top, width, height, borderColor: color }}
            // debug: เอาออกได้
            title={`${p.class_id} | ${p.label}`}
          >
            <span className="label" style={{ background: color }}>
              {p.label} ({(p.confidence * 100).toFixed(1)}%)
            </span>
          </div>
        );
      })}
    </div>
  );
}
