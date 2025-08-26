import React, { useEffect, useRef, useState } from "react";
import { predictImage, getHealth } from "./api";
import BoxOverlay from "./components/BoxOverlay";
import logoLeaf from "./assets/logoleaf.png";
import "./styles.css";

export default function App() {
  const [file, setFile] = useState(null);
  const [imgUrl, setImgUrl] = useState("");
  const [natural, setNatural] = useState({ width: 0, height: 0 });
  const [displayed, setDisplayed] = useState({ width: 0, height: 0 });
  const [preds, setPreds] = useState([]);
  const [loading, setLoading] = useState(false);
  const [apiOk, setApiOk] = useState(null);
  const [conf, setConf] = useState(0.25);
  const [showGuide, setShowGuide] = useState(true);

  const imgRef = useRef(null);

  // ping backend once
  useEffect(() => {
    getHealth()
      .then(() => setApiOk(true))
      .catch(() => setApiOk(false));
  }, []);

  // keep overlay in sync with image element size
  useEffect(() => {
    function recalc() {
      const el = imgRef.current;
      if (!el) return;
      setDisplayed({ width: el.clientWidth, height: el.clientHeight });
    }
    window.addEventListener("resize", recalc);
    return () => window.removeEventListener("resize", recalc);
  }, []);

  const onFile = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    setFile(f);
    setImgUrl(URL.createObjectURL(f));
    setPreds([]);
    setShowGuide(false);
    // reset dims; overlay will recalc on load
    setNatural({ width: 0, height: 0 });
    setDisplayed({ width: 0, height: 0 });
  };

  const analyze = async () => {
    if (!file) return;
    try {
      setLoading(true);
      const res = await predictImage(file, { conf });
      setPreds(res.predictions || []);
    } catch (err) {
      console.error(err);
      alert(err.message || "API Error! Backend อาจยังไม่รัน");
    } finally {
      setLoading(false);
    }
  };

  const onImgLoad = () => {
    const el = imgRef.current;
    if (!el) return;
    setNatural({ width: el.naturalWidth, height: el.naturalHeight });
    setDisplayed({ width: el.clientWidth, height: el.clientHeight });
  };

  // group disease cards (รวมเป็นการ์ดแบบใน mockup สุดท้าย)
  const diseaseCards = React.useMemo(() => {
    const byLabel = new Map();
    for (const p of preds) {
      if (!p?.is_disease) continue;
      const key = p.label;
      const conf = Number(p.confidence) || 0;
      if (!byLabel.has(key)) {
        byLabel.set(key, { label: key, maxConf: conf, advice: p.advice });
      } else {
        const cur = byLabel.get(key);
        cur.maxConf = Math.max(cur.maxConf, conf); // เก็บค่า confidence สูงสุด
      }
    }
    // เรียงจากความมั่นใจมาก → น้อย
    return Array.from(byLabel.values()).sort((a, b) => b.maxConf - a.maxConf);
  }, [preds]);

  return (
    <div className="page">
      {/* HERO */}
      <header className="hero">
        <div className="brand">
          <img src={logoLeaf} alt="Leaf Scan Logo" className="brand-logo" />
        </div>
        <div className="hero-copy">
          <h1>Scan Leaf Diseases |</h1>
          <h2>Durian, Rambutan, Mangosteen, Longkong</h2>
        </div>
        {apiOk === false && <div className="badge bad">API offline</div>}
        {apiOk === true && <div className="badge ok">API ready</div>}
      </header>

      {/* Upload controls (pill style) */}
      <div className="upload-row">
        <label className="upload-pill" aria-label="อัปโหลดรูปภาพใบไม้">
          <input type="file" accept="image/*" onChange={onFile} />
          <span>FILE UPLOAD</span>
        </label>
        <div className="filename">{file ? file.name : "No file selected"}</div>
        <button
          className="cta-dark"
          onClick={analyze}
          disabled={!file || loading}
        >
          {loading ? "กำลังวิเคราะห์..." : "Click to Start Analysis"}
        </button>
      </div>

      {/* Optional: confidence slider (ซ่อนได้ถ้าไม่อยากให้ลูกค้าเห็น) */}
      <div className="extra-controls">
        <label>
          กรองความมั่นใจมากกว่า: <b>{(conf * 100).toFixed(0)}%</b>
        </label>
        <input
          type="range"
          min="0.1"
          max="0.9"
          step="0.05"
          value={conf}
          onChange={(e) => setConf(parseFloat(e.target.value))}
        />
      </div>

      {/* GUIDE STEPS (mockup ภาพมือชี้ 1-2-3) */}
      {showGuide && (
        <div className="guide card">
          <ol>
            <li>คลิกปุ่ม FILE UPLOAD เพื่อเลือกรูปใบ</li>
            <li>
              กดปุ่ม <b>Click to Start Analysis</b>
            </li>
            <li>เลื่อนลงเพื่อดูผลลัพธ์และคำแนะนำ</li>
          </ol>
        </div>
      )}

      {/* RESULT 2 columns */}
      {imgUrl && (
        <div className="result-layout">
          {/* left: image */}
          <div className="result-left card">
            <div className="leaf-frame">
              <div className="circle" />
              <div className="img-wrap">
                <img ref={imgRef} src={imgUrl} onLoad={onImgLoad} alt="leaf" />
                <BoxOverlay
                  preds={preds}
                  natural={natural}
                  displayed={displayed}
                />
              </div>
            </div>
          </div>

          {/* right: disease card like mock */}
          <div className="result-right nice-fade">
            <h3 className="result-title">ผลการวิเคราะห์โรคจากใบ</h3>

            {diseaseCards.length === 0 && (
              <div className="empty">✅ ไม่พบโรคที่ชัดเจน (non‑disease)</div>
            )}

            {diseaseCards.map((d, i) => (
              <div key={i} className="disease-card">
                <div className="disease-name">
                  <span className="order">{i + 1}.</span>{" "}
                  <span className="th">{d.advice?.thai_name || d.label}</span>
                  {d.advice?.thai_name && (
                    <span className="en"> / {d.label}</span>
                  )}
                  <span className="conf">
                    {" "}
                    ({((d.maxConf ?? 0) * 100).toFixed(1)}%)
                  </span>
                </div>
                <div className="section">
                  <div className="section-title">วิธีการรักษา</div>
                  <ul className="bullets">
                    {(d.advice?.treatment || ["—"]).map((t, j) => (
                      <li key={j}>{t}</li>
                    ))}
                  </ul>
                </div>
                <div className="section">
                  <div className="section-title">วิธีการควบคุม</div>
                  <ul className="bullets">
                    {(d.advice?.control || ["—"]).map((t, j) => (
                      <li key={j}>{t}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* footer note */}
      <footer className="footnote">
        ⚠️ คำแนะนำเบื้องต้นเพื่อช่วยตัดสินใจ —
        ควรตรวจซ้ำหลายใบและปรึกษาผู้เชี่ยวชาญเมื่อจำเป็น
      </footer>
    </div>
  );
}
