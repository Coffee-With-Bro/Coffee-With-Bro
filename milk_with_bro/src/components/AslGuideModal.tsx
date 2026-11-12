import { useState } from "react";

interface AslGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  onTestSign?: (char: string) => void;
}

interface SignInfo {
  char: string;
  category: "Letter" | "Digit";
  hint: string;
}

const SIGNS_DATA: SignInfo[] = [
  
  { char: "0", category: "Digit", hint: "O-shape fist, fingers touching thumb tip" },
  { char: "1", category: "Digit", hint: "Index finger straight up, other fingers curled" },
  { char: "2", category: "Digit", hint: "Index and middle finger up in V-shape" },
  { char: "3", category: "Digit", hint: "Thumb, index, and middle finger extended" },
  { char: "4", category: "Digit", hint: "Four fingers upright, thumb folded in palm" },
  { char: "5", category: "Digit", hint: "All five fingers fully spread and extended" },
  { char: "6", category: "Digit", hint: "Pinky touched by thumb, 3 fingers up" },
  { char: "7", category: "Digit", hint: "Ring finger touched by thumb, 3 fingers up" },
  { char: "8", category: "Digit", hint: "Middle finger touched by thumb, 3 fingers up" },
  { char: "9", category: "Digit", hint: "Index touched by thumb, 3 fingers up (OK sign)" },

  
  { char: "A", category: "Letter", hint: "Compact fist, thumb straight alongside index" },
  { char: "B", category: "Letter", hint: "Flat palm, 4 fingers upright, thumb across palm" },
  { char: "C", category: "Letter", hint: "Curved hand forming a C silhouette" },
  { char: "D", category: "Letter", hint: "Index finger vertical, thumb touches middle/ring" },
  { char: "E", category: "Letter", hint: "Fingers curled with tips resting on tucked thumb" },
  { char: "F", category: "Letter", hint: "Index & thumb form circle, 3 fingers fan upright" },
  { char: "G", category: "Letter", hint: "Index and thumb point sideways parallel" },
  { char: "H", category: "Letter", hint: "Index and middle fingers extend horizontally" },
  { char: "I", category: "Letter", hint: "Pinky upright, remaining fingers closed in fist" },
  { char: "J", category: "Letter", hint: "Pinky extended, trace small J curve in air" },
  { char: "K", category: "Letter", hint: "Index straight up, middle finger angled forward" },
  { char: "L", category: "Letter", hint: "Thumb and index extended at right angle (L shape)" },
  { char: "M", category: "Letter", hint: "Three fingers draped over tucked thumb" },
  { char: "N", category: "Letter", hint: "Two fingers draped over tucked thumb" },
  { char: "O", category: "Letter", hint: "All fingers curved to touch thumb in O circle" },
  { char: "P", category: "Letter", hint: "K-hand directed downwards" },
  { char: "Q", category: "Letter", hint: "G-hand pointing downward" },
  { char: "R", category: "Letter", hint: "Index and middle fingers crossed" },
  { char: "S", category: "Letter", hint: "Fist with thumb wrapped across front of fingers" },
  { char: "T", category: "Letter", hint: "Thumb tucked under index finger only" },
  { char: "U", category: "Letter", hint: "Index and middle fingers held together upright" },
  { char: "V", category: "Letter", hint: "Index and middle fingers separated in peace sign" },
  { char: "W", category: "Letter", hint: "Three middle fingers upright spread in W" },
  { char: "X", category: "Letter", hint: "Index finger crooked like a pirate hook" },
  { char: "Y", category: "Letter", hint: "Thumb and pinky spread wide (shaka hand)" },
  { char: "Z", category: "Letter", hint: "Index finger traces letter Z in the air" },
];

export function AslGuideModal({ isOpen, onClose, onTestSign }: AslGuideModalProps) {
  const [filter, setFilter] = useState<"All" | "Letter" | "Digit">("All");
  const [search, setSearch] = useState("");

  if (!isOpen) return null;

  const filtered = SIGNS_DATA.filter((item) => {
    const matchesCategory = filter === "All" || item.category === filter;
    const matchesSearch =
      item.char.toLowerCase().includes(search.toLowerCase()) ||
      item.hint.toLowerCase().includes(search.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="modal-backdrop" onClick={onClose} role="dialog" aria-modal="true">
      <div className="modal-card" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2 className="modal-title">ASL Hand Sign Reference Guide</h2>
            <p className="modal-sub">
              36 static classes (A–Z, 0–9) recognized locally by the DeepLearning4j CNN.
            </p>
          </div>
          <button className="btn btn-ghost modal-close" onClick={onClose} aria-label="Close modal">
            ✕
          </button>
        </div>

        <div className="modal-filter-row">
          <div className="modal-tabs">
            {(["All", "Letter", "Digit"] as const).map((cat) => (
              <button
                key={cat}
                className={`tab-btn ${filter === cat ? "is-active" : ""}`}
                onClick={() => setFilter(cat)}
              >
                {cat === "All" ? "All (36)" : cat === "Letter" ? "Letters (26)" : "Digits (10)"}
              </button>
            ))}
          </div>

          <input
            type="search"
            className="guide-search-input"
            placeholder="Search letter or pose…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="signs-grid">
          {filtered.map((item) => (
            <div className="sign-card" key={item.char}>
              <div className="sign-card-top">
                <span className="sign-char">{item.char}</span>
                <span className="sign-tag">{item.category}</span>
              </div>
              <p className="sign-hint">{item.hint}</p>
              {onTestSign && (
                <button
                  className="btn btn-tiny"
                  onClick={() => {
                    onTestSign(item.char);
                  }}
                  title={`Simulate sign ${item.char}`}
                >
                  Test {item.char}
                </button>
              )}
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <span className="modal-offline-tag">✓ 100% Offline Model Inference</span>
          <button className="btn btn-ghost" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
