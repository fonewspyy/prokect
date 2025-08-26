// ใช้ .env: VITE_API_URL=http://127.0.0.1:8000
const BASE = import.meta.env.VITE_API_URL?.replace(/\/+$/, "") || "http://127.0.0.1:8000";

export async function predictImage(file, { conf = 0.25, iou = 0.45 } = {}) {
  if (!file) throw new Error("no file");
  if (!file.type.startsWith("image/")) throw new Error("please upload an image file");
  if (file.size > 8 * 1024 * 1024) throw new Error("file too large (> 8 MB)");

  const fd = new FormData();
  fd.append("image", file);

  const url = `${BASE}/predict?conf=${conf}&iou=${iou}`;
  const res = await fetch(url, { method: "POST", body: fd });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  return res.json();
}

export async function getHealth() {
  const res = await fetch(`${BASE}/health`);
  return res.json();
}
