import { useState, useEffect, useRef } from "react";

// ── Types ──────────────────────────────────────────────────
type Screen =
  | "splash"
  | "home"
  | "scan"
  | "analyzing"
  | "results"
  | "routine"
  | "tracker";

interface Condition {
  name: string;
  score: number; // 0-100 (100 = most severe)
  severity: "low" | "moderate" | "high";
  description: string;
  tip: string;
}

interface Product {
  name: string;
  type: string;
  use: string;
  when: "AM" | "PM" | "AM/PM";
  emoji: string;
  url: string;
}

type ScanRecord = {
  id: string;
  createdAt: number;
  photoDataUrl: string;
  skinScore: number;
  conditions: Condition[];
  products: Product[];
};

const SCAN_HISTORY_STORAGE_KEY = "afriskin.scanHistory.v1";
const SCAN_HISTORY_MAX_ITEMS = 12;

// ── Condition pool ────────────────────────────────────────
const CONDITION_POOL: Omit<Condition, "score" | "severity">[] = [
  {
    name: "Acne & Blemishes",
    description: "Active breakouts detected across T-zone and chin area.",
    tip: "Use a salicylic acid cleanser twice daily. Avoid touching your face.",
  },
  {
    name: "Dark Spots",
    description: "Post-inflammatory hyperpigmentation visible on cheeks.",
    tip: "Apply niacinamide serum consistently. Use SPF 50 every morning.",
  },
  {
    name: "Hyperpigmentation",
    description: "Uneven melanin distribution across forehead and cheeks.",
    tip: "Vitamin C serum in the morning helps brighten over time.",
  },
  {
    name: "Dryness / Dehydration",
    description: "Skin barrier shows signs of moisture loss and tightness.",
    tip: "Layer a hyaluronic acid serum under your moisturiser daily.",
  },
  {
    name: "Uneven Skin Tone",
    description: "Notable variation in tone across nose bridge and jawline.",
    tip: "Consistent exfoliation 2x per week and daily SPF are key.",
  },
  {
    name: "Dullness",
    description: "Low radiance levels — skin lacks natural luminosity.",
    tip: "A gentle AHA exfoliant weekly will revive your glow significantly.",
  },
  {
    name: "Enlarged Pores",
    description: "Pores are visibly dilated in the nose and cheek regions.",
    tip: "Retinol at night helps tighten pores over 6–8 weeks of use.",
  },
  {
    name: "Texture Issues",
    description:
      "Surface irregularity detected — bumpy texture across forehead.",
    tip: "Chemical exfoliation with glycolic or lactic acid smooths texture.",
  },
  {
    name: "Fine Lines",
    description: "Early fine lines present around the eye and mouth areas.",
    tip: "Retinol and peptide-rich moisturiser at night support collagen.",
  },
  {
    name: "Dark Circles",
    description: "Under-eye discolouration and mild puffiness detected.",
    tip: "Caffeine-infused eye cream AM + cold compress reduces puffiness.",
  },
  {
    name: "Redness",
    description:
      "Localised redness on nose sides and chin — possible sensitivity.",
    tip: "Switch to fragrance-free products and use centella asiatica serum.",
  },
  {
    name: "Crow's Feet",
    description: "Fine expression lines at outer eye corners are developing.",
    tip: "Eye cream with peptides and wearing SPF sunglasses helps prevent deepening.",
  },
  {
    name: "Skin Firmness",
    description: "Early elasticity loss detected — skin is losing its bounce.",
    tip: "Collagen-boosting peptide serum and a Gua Sha routine 3x per week.",
  },
  {
    name: "Lack of Smoothness",
    description:
      "Surface texture feels uneven — skin is not reflecting light well.",
    tip: "Double cleansing at night ensures product absorption and smoother texture.",
  },
  {
    name: "Overall Pigmentation",
    description:
      "Patchy pigmentation across the full face — multiple tones detected.",
    tip: "A brightening routine with tranexamic acid + SPF is your best approach.",
  },
];

const PRODUCT_POOL: Product[] = [
  {
    name: "Gentle Foaming Cleanser",
    type: "Cleanser",
    use: "Remove impurities without stripping the skin barrier",
    when: "AM/PM",
    emoji: "🫧",
    url: "https://example.com/products/gentle-foaming-cleanser?ref=afriskin",
  },
  {
    name: "Niacinamide 10% Serum",
    type: "Serum",
    use: "Fades dark spots, minimises pores, evens tone",
    when: "AM/PM",
    emoji: "💧",
    url: "https://example.com/products/niacinamide-10-serum?ref=afriskin",
  },
  {
    name: "Vitamin C Brightening Serum",
    type: "Serum",
    use: "Antioxidant protection and radiance boost",
    when: "AM",
    emoji: "🍊",
    url: "https://example.com/products/vitamin-c-brightening-serum?ref=afriskin",
  },
  {
    name: "Hyaluronic Acid Booster",
    type: "Hydration",
    use: "Draws moisture into skin for all-day plumpness",
    when: "AM/PM",
    emoji: "💦",
    url: "https://example.com/products/hyaluronic-acid-booster?ref=afriskin",
  },
  {
    name: "SPF 50 Sunscreen",
    type: "Sun Protection",
    use: "Prevents further dark spots and UV damage",
    when: "AM",
    emoji: "☀️",
    url: "https://example.com/products/spf-50-sunscreen?ref=afriskin",
  },
  {
    name: "Salicylic Acid Toner",
    type: "Exfoliant",
    use: "Clears pores and reduces active breakouts",
    when: "PM",
    emoji: "✨",
    url: "https://example.com/products/salicylic-acid-toner?ref=afriskin",
  },
  {
    name: "Retinol 0.3% Night Serum",
    type: "Treatment",
    use: "Speeds cell turnover, smooths texture, firms skin",
    when: "PM",
    emoji: "🌙",
    url: "https://example.com/products/retinol-03-night-serum?ref=afriskin",
  },
  {
    name: "Ceramide Barrier Moisturiser",
    type: "Moisturiser",
    use: "Repairs and strengthens the skin barrier",
    when: "AM/PM",
    emoji: "🧴",
    url: "https://example.com/products/ceramide-barrier-moisturiser?ref=afriskin",
  },
  {
    name: "Caffeine Eye Cream",
    type: "Eye Care",
    use: "Reduces puffiness and dark circles",
    when: "AM",
    emoji: "👁️",
    url: "https://example.com/products/caffeine-eye-cream?ref=afriskin",
  },
  {
    name: "AHA Exfoliating Mask",
    type: "Treatment Mask",
    use: "Weekly exfoliation for glow and smoothness",
    when: "PM",
    emoji: "🌿",
    url: "https://example.com/products/aha-exfoliating-mask?ref=afriskin",
  },
  {
    name: "Centella Cica Serum",
    type: "Calming Serum",
    use: "Soothes redness and strengthens sensitive skin",
    when: "AM/PM",
    emoji: "🍃",
    url: "https://example.com/products/centella-cica-serum?ref=afriskin",
  },
  {
    name: "Peptide Firming Cream",
    type: "Moisturiser",
    use: "Stimulates collagen and restores elasticity",
    when: "PM",
    emoji: "💎",
    url: "https://example.com/products/peptide-firming-cream?ref=afriskin",
  },
];

// ── Helpers ───────────────────────────────────────────────
function getRandInt(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function shuffle<T>(arr: T[]): T[] {
  return [...arr].sort(() => Math.random() - 0.5);
}

function generateResults(): Condition[] {
  const pool = shuffle(CONDITION_POOL).slice(0, getRandInt(5, 8));
  return pool
    .map((c) => {
      const score = getRandInt(20, 88);
      const severity: Condition["severity"] =
        score >= 65 ? "high" : score >= 38 ? "moderate" : "low";
      return { ...c, score, severity };
    })
    .sort((a, b) => b.score - a.score);
}

function generateProducts(): Product[] {
  return shuffle(PRODUCT_POOL).slice(0, 6);
}

function getScoreColor(score: number) {
  if (score >= 65) return "#D94F2C";
  if (score >= 38) return "#C8920A";
  return "#4A7C6F";
}

function getSkinScore(conditions: Condition[]) {
  if (!conditions.length) return 0;
  const avg = conditions.reduce((s, c) => s + c.score, 0) / conditions.length;
  return Math.round(100 - avg);
}

function loadScanHistory(): ScanRecord[] {
  try {
    const raw = localStorage.getItem(SCAN_HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(Boolean) as ScanRecord[];
  } catch {
    return [];
  }
}

function saveScanHistory(next: ScanRecord[]) {
  try {
    localStorage.setItem(SCAN_HISTORY_STORAGE_KEY, JSON.stringify(next));
  } catch {
    // ignore storage quota / disabled storage
  }
}

async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const ta = document.createElement("textarea");
  ta.value = text;
  ta.setAttribute("readonly", "true");
  ta.style.position = "fixed";
  ta.style.left = "-9999px";
  document.body.appendChild(ta);
  ta.select();
  document.execCommand("copy");
  document.body.removeChild(ta);
}

// ── Animated Score Ring ───────────────────────────────────
function ScoreRing({ score, size = 120 }: { score: number; size?: number }) {
  const [displayed, setDisplayed] = useState(0);
  const r = (size - 16) / 2;
  const circ = 2 * Math.PI * r;
  const progress = (displayed / 100) * circ;

  useEffect(() => {
    let frame: number;
    let current = 0;
    const step = () => {
      current += 1.2;
      if (current >= score) {
        setDisplayed(score);
        return;
      }
      setDisplayed(Math.round(current));
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [score]);

  const color = score >= 70 ? "#4A7C6F" : score >= 45 ? "#C8920A" : "#D94F2C";
  const label = score >= 70 ? "Good" : score >= 45 ? "Fair" : "Needs Care";

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 4,
      }}
    >
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke="rgba(44,26,14,0.08)"
          strokeWidth={8}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={8}
          strokeDasharray={`${progress} ${circ}`}
          strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.05s linear" }}
        />
        <text
          x="50%"
          y="50%"
          textAnchor="middle"
          dominantBaseline="middle"
          style={{
            transform: "rotate(90deg)",
            transformOrigin: "50% 50%",
            fontSize: size * 0.22,
            fontFamily: "'Playfair Display', serif",
            fontWeight: 900,
            fill: color,
          }}
        >
          {displayed}
        </text>
      </svg>
      <span
        style={{
          fontSize: 11,
          fontWeight: 700,
          letterSpacing: "0.12em",
          textTransform: "uppercase",
          color,
        }}
      >
        {label}
      </span>
    </div>
  );
}

// ── Scan Camera Mock ──────────────────────────────────────
function ScanFace({
  onCapture,
}: {
  onCapture: (photoDataUrl: string) => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [streaming, setStreaming] = useState(false);
  const [videoReady, setVideoReady] = useState(false);
  const [error, setError] = useState("");
  const [countdown, setCountdown] = useState<number | null>(null);
  const [captured, setCaptured] = useState(false);
  const [capturedPhotoDataUrl, setCapturedPhotoDataUrl] = useState<string>("");

  const capturePhoto = () => {
    const video = videoRef.current;
    if (!video) return null;
    if (!video.videoWidth || !video.videoHeight) return null;
    const w = video.videoWidth;
    const h = video.videoHeight;
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    // mirror horizontally to match the on-screen preview (scaleX(-1))
    ctx.translate(w, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, w, h);
    return canvas.toDataURL("image/jpeg", 0.88);
  };

  useEffect(() => {
    navigator.mediaDevices
      ?.getUserMedia({ video: { facingMode: "user" } })
      .then((stream) => {
        const video = videoRef.current;
        if (video) {
          video.srcObject = stream;
          const onLoaded = () => {
            setVideoReady(true);
            void video.play().catch(() => undefined);
          };
          video.addEventListener("loadedmetadata", onLoaded, { once: true });
        }
        setStreaming(true);
      })
      .catch(() => setError("Camera unavailable — using prototype mode"));
    return () => {
      if (videoRef.current?.srcObject) {
        (videoRef.current.srcObject as MediaStream)
          .getTracks()
          .forEach((t) => t.stop());
      }
    };
  }, []);

  const startCapture = () => {
    setCountdown(3);
    let c = 3;
    const iv = setInterval(() => {
      c--;
      if (c <= 0) {
        clearInterval(iv);
        setCountdown(null);
        setCaptured(true);
        window.setTimeout(() => {
          const photo = capturePhoto();
          const dataUrl =
            photo ||
            "data:image/svg+xml;charset=utf-8," +
              encodeURIComponent(
                `<svg xmlns="http://www.w3.org/2000/svg" width="720" height="1280"><defs><linearGradient id="g" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stop-color="#2C1A0E"/><stop offset="1" stop-color="#0e0a06"/></linearGradient></defs><rect width="100%" height="100%" fill="url(#g)"/><text x="50%" y="50%" fill="rgba(250,247,242,0.65)" font-family="Arial" font-size="22" text-anchor="middle">Prototype selfie</text></svg>`,
              );
          setCapturedPhotoDataUrl(dataUrl);
          onCapture(dataUrl);
        }, 120);
      } else {
        setCountdown(c);
      }
    }, 1000);
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        background: "#0e0a06",
      }}
    >
      {/* Viewfinder */}
      <div style={{ flex: 1, position: "relative", overflow: "hidden" }}>
        {capturedPhotoDataUrl && (
          <div
            style={{
              position: "absolute",
              inset: 0,
              backgroundImage: `url(${capturedPhotoDataUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
              filter: "blur(10px) saturate(1.2)",
              transform: "scale(1.12)",
              opacity: 0.55,
            }}
          />
        )}
        {streaming ? (
          capturedPhotoDataUrl ? (
            <img
              src={capturedPhotoDataUrl}
              alt="Captured scan"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: "scaleX(-1)",
                position: "relative",
              }}
            />
          ) : (
            <video
              ref={videoRef}
              autoPlay
              playsInline
              muted
              style={{
                width: "100%",
                height: "100%",
                objectFit: "cover",
                transform: "scaleX(-1)",
                position: "relative",
              }}
            />
          )
        ) : (
          <div
            style={{
              width: "100%",
              height: "100%",
              background: "#1a0e06",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 12,
            }}
          >
            <div style={{ fontSize: 48 }}>📷</div>
            <p
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 11,
                color: "rgba(250,247,242,0.4)",
                textAlign: "center",
                padding: "0 32px",
                letterSpacing: "0.1em",
              }}
            >
              {error || "Initialising camera..."}
            </p>
            <p
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 10,
                color: "rgba(250,247,242,0.25)",
                textAlign: "center",
                padding: "0 32px",
                letterSpacing: "0.08em",
              }}
            >
              Prototype mode active
            </p>
          </div>
        )}

        {/* Face frame overlay */}
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            pointerEvents: "none",
          }}
        >
          {/* Oval face guide */}
          <svg
            width="200"
            height="260"
            viewBox="0 0 200 260"
            style={{ opacity: captured ? 0 : 0.9, transition: "opacity 0.4s" }}
          >
            <ellipse
              cx="100"
              cy="130"
              rx="86"
              ry="110"
              fill="none"
              stroke="#C45C2A"
              strokeWidth="2"
              strokeDasharray="8 5"
            />
            {/* Corner brackets */}
            {[
              [14, 20],
              [186, 20],
              [14, 240],
              [186, 240],
            ].map(([x, y], i) => (
              <g key={i} transform={`translate(${x},${y})`}>
                <line
                  x1="0"
                  y1="0"
                  x2={i % 2 === 0 ? 14 : -14}
                  y2="0"
                  stroke="#C45C2A"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
                <line
                  x1="0"
                  y1="0"
                  x2="0"
                  y2={i < 2 ? 14 : -14}
                  stroke="#C45C2A"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                />
              </g>
            ))}
            {/* Scanning line animation */}
            <line
              x1="14"
              y1="50"
              x2="186"
              y2="50"
              stroke="#C45C2A"
              strokeWidth="1"
              opacity="0.6"
            >
              <animateTransform
                attributeName="transform"
                type="translate"
                values="0,0;0,160;0,0"
                dur="3s"
                repeatCount="indefinite"
              />
            </line>
          </svg>

          {/* Countdown */}
          {countdown !== null && (
            <div
              style={{
                position: "absolute",
                fontSize: 80,
                fontFamily: "'Playfair Display',serif",
                fontWeight: 900,
                color: "#C45C2A",
                textShadow: "0 0 40px rgba(196,92,42,0.5)",
              }}
            >
              {countdown}
            </div>
          )}

          {/* Captured flash */}
          {captured && (
            <div
              style={{
                position: "absolute",
                inset: 0,
                background: "white",
                animation: "flashFade 0.8s ease forwards",
              }}
            />
          )}
        </div>

        {/* Instruction */}
        <div
          style={{
            position: "absolute",
            top: 20,
            left: 0,
            right: 0,
            display: "flex",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              background: "rgba(14,10,6,0.72)",
              borderRadius: 20,
              padding: "6px 16px",
              backdropFilter: "blur(8px)",
              border: "1px solid rgba(196,92,42,0.3)",
            }}
          >
            <p
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 11,
                color: "rgba(250,247,242,0.8)",
                letterSpacing: "0.1em",
              }}
            >
              {captured
                ? "✓ Captured"
                : countdown
                  ? `Hold still...`
                  : "Centre your face in the oval"}
            </p>
          </div>
        </div>
      </div>

      {/* Capture button */}
      <div
        style={{
          padding: "28px 32px 40px",
          background: "#0e0a06",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 16,
        }}
      >
        <button
          onClick={startCapture}
          disabled={!videoReady || !!countdown || captured}
          style={{
            width: 72,
            height: 72,
            borderRadius: "50%",
            background: "transparent",
            border: "3px solid rgba(250,247,242,0.8)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            position: "relative",
            transition: "all 0.2s",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: "50%",
              background:
                countdown || captured ? "#C45C2A" : "rgba(250,247,242,0.9)",
              transition: "background 0.3s",
            }}
          />
        </button>
        <p
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: 10,
            color: "rgba(250,247,242,0.3)",
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Tap to scan
        </p>
      </div>
    </div>
  );
}

// ── Analyzing Screen ──────────────────────────────────────
function AnalyzingScreen({ photoDataUrl }: { photoDataUrl: string }) {
  const steps = [
    "Reading skin tone & texture",
    "Detecting active conditions",
    "Mapping pigmentation zones",
    "Scoring 15 parameters",
    "Building your routine",
  ];
  const [step, setStep] = useState(0);
  const [dots, setDots] = useState("");

  useEffect(() => {
    const iv = setInterval(
      () => setStep((s) => Math.min(s + 1, steps.length - 1)),
      900,
    );
    const dv = setInterval(
      () => setDots((d) => (d.length >= 3 ? "" : d + ".")),
      400,
    );
    return () => {
      clearInterval(iv);
      clearInterval(dv);
    };
  }, []);

  return (
    <div style={{ height: "100%", position: "relative", overflow: "hidden" }}>
      <div
        style={{
          position: "absolute",
          inset: -20,
          backgroundImage: `url(${photoDataUrl})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          filter: "blur(14px) saturate(1.2)",
          transform: "scale(1.1)",
          opacity: 0.45,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          background:
            "linear-gradient(180deg, rgba(14,10,6,0.78) 0%, rgba(14,10,6,0.92) 60%, rgba(14,10,6,1) 100%)",
        }}
      />
      <div
        style={{
          position: "relative",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          padding: "40px 32px",
          gap: 40,
        }}
      >
      {/* Orbiting rings */}
      <div style={{ position: "relative", width: 160, height: 160 }}>
        <svg
          width="160"
          height="160"
          viewBox="0 0 160 160"
          style={{ position: "absolute", animation: "spin 3s linear infinite" }}
        >
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="rgba(196,92,42,0.2)"
            strokeWidth="1.5"
          />
          <circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="#C45C2A"
            strokeWidth="2"
            strokeDasharray="40 400"
            strokeLinecap="round"
          />
        </svg>
        <svg
          width="160"
          height="160"
          viewBox="0 0 160 160"
          style={{
            position: "absolute",
            animation: "spinR 2s linear infinite",
          }}
        >
          <circle
            cx="80"
            cy="80"
            r="52"
            fill="none"
            stroke="rgba(196,92,42,0.15)"
            strokeWidth="1"
          />
          <circle
            cx="80"
            cy="80"
            r="52"
            fill="none"
            stroke="#C8920A"
            strokeWidth="1.5"
            strokeDasharray="20 300"
            strokeLinecap="round"
          />
        </svg>
        <div
          style={{
            position: "absolute",
            inset: 0,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "50%",
              background: "rgba(196,92,42,0.12)",
              border: "1px solid rgba(196,92,42,0.3)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 28,
            }}
          >
            🔬
          </div>
        </div>
      </div>

      <div style={{ textAlign: "center" }}>
        <h2
          style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: 24,
            fontWeight: 900,
            color: "rgba(250,247,242,0.9)",
            marginBottom: 8,
          }}
        >
          Analysing your skin{dots}
        </h2>
        <p
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: 11,
            color: "rgba(250,247,242,0.35)",
            letterSpacing: "0.12em",
          }}
        >
          AFRISKIN AI ENGINE
        </p>
      </div>

      <div
        style={{
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {steps.map((s, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              opacity: i <= step ? 1 : 0.25,
              transition: "opacity 0.4s",
            }}
          >
            <div
              style={{
                width: 20,
                height: 20,
                borderRadius: "50%",
                background:
                  i < step
                    ? "#4A7C6F"
                    : i === step
                      ? "#C45C2A"
                      : "rgba(250,247,242,0.1)",
                border: `1px solid ${i <= step ? "transparent" : "rgba(250,247,242,0.15)"}`,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 10,
                flexShrink: 0,
                transition: "all 0.4s",
              }}
            >
              {i < step ? "✓" : ""}
            </div>
            <p
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 12,
                color:
                  i === step
                    ? "#C45C2A"
                    : i < step
                      ? "rgba(250,247,242,0.6)"
                      : "rgba(250,247,242,0.25)",
                letterSpacing: "0.05em",
                transition: "color 0.4s",
              }}
            >
              {s}
            </p>
          </div>
        ))}
      </div>
      </div>
    </div>
  );
}

// ── Condition Bar ─────────────────────────────────────────
function ConditionBar({
  condition,
  delay,
}: {
  condition: Condition;
  delay: number;
}) {
  const [width, setWidth] = useState(0);
  useEffect(() => {
    const t = setTimeout(() => setWidth(condition.score), delay);
    return () => clearTimeout(t);
  }, [condition.score, delay]);

  const color = getScoreColor(condition.score);
  const severityLabel =
    condition.severity === "high"
      ? "HIGH"
      : condition.severity === "moderate"
        ? "MOD"
        : "LOW";

  return (
    <div
      style={{
        padding: "14px 0",
        borderBottom: "1px solid rgba(44,26,14,0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 8,
        }}
      >
        <span
          style={{
            fontFamily: "'Raleway',sans-serif",
            fontSize: 14,
            fontWeight: 600,
            color: "#2C1A0E",
          }}
        >
          {condition.name}
        </span>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span
            style={{
              fontFamily: "'DM Mono',monospace",
              fontSize: 9,
              letterSpacing: "0.1em",
              background: `${color}18`,
              color,
              border: `1px solid ${color}40`,
              borderRadius: 4,
              padding: "2px 6px",
            }}
          >
            {severityLabel}
          </span>
          <span
            style={{
              fontFamily: "'DM Mono',monospace",
              fontSize: 13,
              fontWeight: 500,
              color,
            }}
          >
            {condition.score}
          </span>
        </div>
      </div>
      <div
        style={{
          height: 5,
          background: "rgba(44,26,14,0.08)",
          borderRadius: 3,
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${width}%`,
            background: color,
            borderRadius: 3,
            transition: "width 1s cubic-bezier(0.4,0,0.2,1)",
          }}
        />
      </div>
      <p
        style={{
          fontFamily: "'DM Mono',monospace",
          fontSize: 11,
          color: "#8A7060",
          marginTop: 6,
          lineHeight: 1.5,
        }}
      >
        {condition.description}
      </p>
    </div>
  );
}

// ── Results Screen ────────────────────────────────────────
function ResultsScreen({
  conditions,
  onViewRoutine,
  photoDataUrl,
}: {
  conditions: Condition[];
  onViewRoutine: () => void;
  photoDataUrl: string;
}) {
  const score = getSkinScore(conditions);
  const highCount = conditions.filter((c) => c.severity === "high").length;
  const modCount = conditions.filter((c) => c.severity === "moderate").length;

  return (
    <div
      style={{ background: "#FAF7F2", minHeight: "100%", paddingBottom: 100 }}
    >
      {/* Header card */}
      <div
        style={{
          background: "linear-gradient(160deg, #2C1A0E 0%, #4A2E18 100%)",
          padding: "40px 24px 32px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            inset: 0,
            backgroundImage: `url(${photoDataUrl})`,
            backgroundSize: "cover",
            backgroundPosition: "center",
            filter: "blur(12px) saturate(1.1)",
            opacity: 0.35,
            transform: "scale(1.1)",
          }}
        />
        <div
          style={{
            position: "absolute",
            inset: 0,
            background:
              "linear-gradient(160deg, rgba(44,26,14,0.92) 0%, rgba(74,46,24,0.92) 100%)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: -60,
            right: -60,
            width: 200,
            height: 200,
            borderRadius: "50%",
            border: "1px solid rgba(250,247,242,0.06)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: -30,
            left: -30,
            width: 120,
            height: 120,
            borderRadius: "50%",
            border: "1px solid rgba(196,92,42,0.12)",
          }}
        />
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            position: "relative",
          }}
        >
          <div>
            <p
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 10,
                letterSpacing: "0.18em",
                color: "rgba(250,247,242,0.45)",
                textTransform: "uppercase",
                marginBottom: 8,
              }}
            >
              Your Skin Report
            </p>
            <h2
              style={{
                fontFamily: "'Playfair Display',serif",
                fontSize: 26,
                fontWeight: 900,
                color: "rgba(250,247,242,0.92)",
                lineHeight: 1.1,
              }}
            >
              {conditions.length} conditions
              <br />
              detected
            </h2>
            <div style={{ display: "flex", gap: 12, marginTop: 14 }}>
              {highCount > 0 && (
                <div
                  style={{
                    fontFamily: "'DM Mono',monospace",
                    fontSize: 10,
                    color: "#F0896A",
                    background: "rgba(208,73,44,0.18)",
                    border: "1px solid rgba(208,73,44,0.3)",
                    borderRadius: 12,
                    padding: "3px 10px",
                  }}
                >
                  {highCount} High
                </div>
              )}
              {modCount > 0 && (
                <div
                  style={{
                    fontFamily: "'DM Mono',monospace",
                    fontSize: 10,
                    color: "#E8B84B",
                    background: "rgba(200,146,10,0.18)",
                    border: "1px solid rgba(200,146,10,0.3)",
                    borderRadius: 12,
                    padding: "3px 10px",
                  }}
                >
                  {modCount} Moderate
                </div>
              )}
            </div>
          </div>
          <ScoreRing score={score} size={110} />
        </div>
      </div>

      <div style={{ padding: "16px 20px 0" }}>
        <div
          style={{
            background: "#fff",
            borderRadius: 16,
            border: "1px solid rgba(44,26,14,0.08)",
            padding: 12,
            display: "flex",
            gap: 12,
            alignItems: "center",
          }}
        >
          <div
            style={{
              width: 56,
              height: 56,
              borderRadius: 14,
              overflow: "hidden",
              background: "#f3ede6",
              flexShrink: 0,
              border: "1px solid rgba(44,26,14,0.08)",
            }}
          >
            <img
              src={photoDataUrl}
              alt="Your scan"
              style={{ width: "100%", height: "100%", objectFit: "cover" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <p
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 10,
                letterSpacing: "0.15em",
                textTransform: "uppercase",
                color: "#8A7060",
                marginBottom: 6,
              }}
            >
              Your scan photo
            </p>
            <p
              style={{
                fontFamily: "'Raleway',sans-serif",
                fontSize: 13,
                fontWeight: 700,
                color: "#2C1A0E",
                lineHeight: 1.2,
              }}
            >
              Saved to your device for tracking
            </p>
          </div>
        </div>
      </div>

      {/* Conditions list */}
      <div style={{ padding: "0 20px" }}>
        <p
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: 10,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#8A7060",
            padding: "18px 0 4px",
          }}
        >
          Condition Breakdown
        </p>
        {conditions.map((c, i) => (
          <ConditionBar key={c.name} condition={c} delay={i * 120} />
        ))}
      </div>

      {/* Priority tips */}
      <div
        style={{
          margin: "20px 20px 0",
          background: "#fff",
          borderRadius: 16,
          padding: "20px",
          border: "1px solid rgba(44,26,14,0.08)",
        }}
      >
        <p
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: 10,
            letterSpacing: "0.15em",
            textTransform: "uppercase",
            color: "#C45C2A",
            marginBottom: 14,
          }}
        >
          Top Priority Tips
        </p>
        {conditions.slice(0, 3).map((c, i) => (
          <div
            key={i}
            style={{
              display: "flex",
              gap: 12,
              marginBottom: 12,
              paddingBottom: 12,
              borderBottom: i < 2 ? "1px solid rgba(44,26,14,0.06)" : "none",
            }}
          >
            <div
              style={{
                width: 28,
                height: 28,
                borderRadius: 8,
                background: "#FCE8E0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 13,
                flexShrink: 0,
              }}
            >
              💡
            </div>
            <div>
              <p
                style={{
                  fontFamily: "'Raleway',sans-serif",
                  fontSize: 12,
                  fontWeight: 700,
                  color: "#2C1A0E",
                  marginBottom: 2,
                }}
              >
                {c.name}
              </p>
              <p
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 11,
                  color: "#8A7060",
                  lineHeight: 1.5,
                }}
              >
                {c.tip}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div style={{ padding: "20px 20px 0" }}>
        <button
          onClick={onViewRoutine}
          style={{
            width: "100%",
            padding: "16px",
            background: "#C45C2A",
            borderRadius: 14,
            border: "none",
            fontFamily: "'Playfair Display',serif",
            fontSize: 17,
            fontWeight: 700,
            color: "#FAF7F2",
            cursor: "pointer",
            letterSpacing: "-0.01em",
          }}
        >
          View My Personalised Routine →
        </button>
        <p
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: 10,
            color: "#8A7060",
            textAlign: "center",
            marginTop: 10,
            letterSpacing: "0.08em",
          }}
        >
          Dermatologist-approved recommendations
        </p>
      </div>
    </div>
  );
}

// ── Routine Screen ────────────────────────────────────────
function RoutineScreen({
  products,
  conditions,
  onCopyShoppingList,
}: {
  products: Product[];
  conditions: Condition[];
  onCopyShoppingList: () => Promise<void>;
}) {
  const [tab, setTab] = useState<"AM" | "PM">("AM");
  const [copied, setCopied] = useState(false);
  const amProducts = products.filter(
    (p) => p.when === "AM" || p.when === "AM/PM",
  );
  const pmProducts = products.filter(
    (p) => p.when === "PM" || p.when === "AM/PM",
  );
  const shown = tab === "AM" ? amProducts : pmProducts;

  return (
    <div
      style={{ background: "#FAF7F2", minHeight: "100%", paddingBottom: 100 }}
    >
      {/* Header */}
      <div style={{ background: "#FAF7F2", padding: "28px 24px 0" }}>
        <p
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: 10,
            letterSpacing: "0.18em",
            color: "#8A7060",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Your Routine
        </p>
        <h2
          style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: 28,
            fontWeight: 900,
            color: "#2C1A0E",
            lineHeight: 1.05,
            marginBottom: 6,
          }}
        >
          Personalised
          <br />
          <em style={{ color: "#C45C2A" }}>for your skin</em>
        </h2>
        <p
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: 11,
            color: "#8A7060",
            lineHeight: 1.5,
            marginBottom: 20,
          }}
        >
          Based on {conditions.length} detected conditions ·
          Dermatologist-approved
        </p>

        <div style={{ display: "flex", gap: 10, marginBottom: 18 }}>
          <button
            onClick={async () => {
              await onCopyShoppingList();
              setCopied(true);
              window.setTimeout(() => setCopied(false), 1400);
            }}
            style={{
              flex: 1,
              background: copied ? "#4A7C6F" : "#2C1A0E",
              border: "none",
              borderRadius: 12,
              padding: "12px 14px",
              fontFamily: "'DM Mono',monospace",
              fontSize: 11,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#FAF7F2",
              cursor: "pointer",
              transition: "all 0.2s",
            }}
          >
            {copied ? "Copied ✓" : "Copy shopping list"}
          </button>
        </div>

        {/* AM/PM Toggle */}
        <div
          style={{
            display: "flex",
            background: "rgba(44,26,14,0.06)",
            borderRadius: 12,
            padding: 4,
            marginBottom: 0,
          }}
        >
          {(["AM", "PM"] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              style={{
                flex: 1,
                padding: "10px",
                borderRadius: 10,
                border: "none",
                background: tab === t ? "#2C1A0E" : "transparent",
                color: tab === t ? "#FAF7F2" : "#8A7060",
                fontFamily: "'DM Mono',monospace",
                fontSize: 12,
                letterSpacing: "0.1em",
                cursor: "pointer",
                transition: "all 0.2s",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 6,
              }}
            >
              <span>{t === "AM" ? "☀️" : "🌙"}</span>{" "}
              {t === "AM" ? "Morning" : "Evening"}
            </button>
          ))}
        </div>
      </div>

      {/* Step counter */}
      <div style={{ padding: "16px 24px 4px" }}>
        <p
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: 10,
            color: "#8A7060",
            letterSpacing: "0.1em",
          }}
        >
          {shown.length} STEPS ·{" "}
          {tab === "AM" ? "MORNING ROUTINE" : "EVENING ROUTINE"}
        </p>
      </div>

      {/* Product cards */}
      <div
        style={{
          padding: "0 20px",
          display: "flex",
          flexDirection: "column",
          gap: 10,
        }}
      >
        {shown.map((p, i) => (
          <div
            key={p.name}
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "16px",
              border: "1px solid rgba(44,26,14,0.07)",
              display: "flex",
              gap: 14,
              alignItems: "flex-start",
              animation: "fadeUp 0.4s ease forwards",
              animationDelay: `${i * 80}ms`,
              opacity: 0,
            }}
          >
            <div
              style={{
                width: 48,
                height: 48,
                borderRadius: 14,
                background: "#FCE8E0",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 22,
                flexShrink: 0,
              }}
            >
              {p.emoji}
            </div>
            <div style={{ flex: 1 }}>
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "flex-start",
                  marginBottom: 4,
                }}
              >
                <div>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      marginBottom: 2,
                    }}
                  >
                    <span
                      style={{
                        fontFamily: "'DM Mono',monospace",
                        fontSize: 9,
                        color: "#8A7060",
                        background: "rgba(44,26,14,0.06)",
                        borderRadius: 4,
                        padding: "1px 6px",
                        letterSpacing: "0.08em",
                      }}
                    >
                      STEP {i + 1}
                    </span>
                    <span
                      style={{
                        fontFamily: "'DM Mono',monospace",
                        fontSize: 9,
                        color: tab === "AM" ? "#C8920A" : "#4A7C6F",
                        background: tab === "AM" ? "#F5E6C0" : "#E0F0EC",
                        borderRadius: 4,
                        padding: "1px 6px",
                      }}
                    >
                      {p.when}
                    </span>
                  </div>
                  <p
                    style={{
                      fontFamily: "'Raleway',sans-serif",
                      fontSize: 14,
                      fontWeight: 700,
                      color: "#2C1A0E",
                    }}
                  >
                    {p.name}
                  </p>
                </div>
              </div>
              <p
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 10,
                  color: "#8A7060",
                  lineHeight: 1.5,
                  marginBottom: 6,
                }}
              >
                {p.use}
              </p>
              <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <span
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 9,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  color: "#C45C2A",
                  background: "#FCE8E0",
                  borderRadius: 4,
                  padding: "2px 8px",
                }}
              >
                {p.type}
              </span>
                <a
                  href={p.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontFamily: "'DM Mono',monospace",
                    fontSize: 9,
                    letterSpacing: "0.1em",
                    textTransform: "uppercase",
                    color: "#4A7C6F",
                    background: "#E0F0EC",
                    borderRadius: 999,
                    padding: "4px 10px",
                    border: "1px solid rgba(74,124,111,0.25)",
                    textDecoration: "none",
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                  }}
                >
                  Shop ↗
                </a>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Partner note */}
      <div
        style={{
          margin: "20px 20px 0",
          background: "#E0F0EC",
          borderRadius: 14,
          padding: "14px 16px",
          border: "1px solid rgba(74,124,111,0.2)",
        }}
      >
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <span style={{ fontSize: 18 }}>🏥</span>
          <div>
            <p
              style={{
                fontFamily: "'Raleway',sans-serif",
                fontSize: 12,
                fontWeight: 700,
                color: "#2C1A0E",
                marginBottom: 3,
              }}
            >
              Dermatologist-Approved Brands
            </p>
            <p
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 11,
                color: "#4A7C6F",
                lineHeight: 1.5,
              }}
            >
              All recommended products are filtered through our network of
              partner dermatologists — safe and proven for African skin.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Tracker Screen ────────────────────────────────────────
function TrackerScreen({
  onRescan,
  history,
}: {
  onRescan: () => void;
  history: ScanRecord[];
}) {
  const [selected, setSelected] = useState<ScanRecord | null>(null);
  const sorted = [...history].sort((a, b) => a.createdAt - b.createdAt);
  const last = sorted[sorted.length - 1];
  const prev = sorted[sorted.length - 2];
  const points = sorted.slice(-5);
  const weeks = points.map((p) =>
    new Date(p.createdAt).toLocaleDateString(undefined, {
      month: "short",
      day: "numeric",
    }),
  );
  const scores = points.map((p) => p.skinScore);
  const max = 100;

  return (
    <div
      style={{ background: "#FAF7F2", minHeight: "100%", paddingBottom: 100 }}
    >
      {selected && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={() => setSelected(null)}
          style={{
            position: "absolute",
            inset: 0,
            zIndex: 50,
            background: "rgba(14,10,6,0.82)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            padding: 18,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: "100%",
              maxWidth: 420,
              background: "#0e0a06",
              borderRadius: 18,
              overflow: "hidden",
              border: "1px solid rgba(250,247,242,0.12)",
            }}
          >
            <div style={{ position: "relative" }}>
              <img
                src={selected.photoDataUrl}
                alt="Scan photo"
                style={{ width: "100%", height: 420, objectFit: "cover" }}
              />
              <button
                onClick={() => setSelected(null)}
                style={{
                  position: "absolute",
                  top: 10,
                  right: 10,
                  width: 36,
                  height: 36,
                  borderRadius: 999,
                  border: "1px solid rgba(250,247,242,0.18)",
                  background: "rgba(14,10,6,0.55)",
                  color: "rgba(250,247,242,0.92)",
                  cursor: "pointer",
                  fontFamily: "'DM Mono',monospace",
                }}
              >
                ✕
              </button>
            </div>
            <div style={{ padding: "12px 14px 14px" }}>
              <p
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "rgba(250,247,242,0.55)",
                  marginBottom: 6,
                }}
              >
                {new Date(selected.createdAt).toLocaleString()}
              </p>
              <p
                style={{
                  fontFamily: "'Raleway',sans-serif",
                  fontSize: 14,
                  fontWeight: 800,
                  color: "rgba(250,247,242,0.92)",
                }}
              >
                Skin score: {selected.skinScore}
              </p>
            </div>
          </div>
        </div>
      )}

      <div style={{ padding: "28px 24px 20px" }}>
        <p
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: 10,
            letterSpacing: "0.18em",
            color: "#8A7060",
            textTransform: "uppercase",
            marginBottom: 6,
          }}
        >
          Progress
        </p>
        <h2
          style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: 28,
            fontWeight: 900,
            color: "#2C1A0E",
            lineHeight: 1.05,
            marginBottom: 4,
          }}
        >
          Your skin is
          <br />
          <em style={{ color: "#4A7C6F" }}>improving</em>
        </h2>
        <p
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: 11,
            color: "#8A7060",
          }}
        >
          {sorted.length >= 2
            ? `Comparing your last ${Math.min(sorted.length, 5)} scans`
            : "Scan at least twice to compare"}
        </p>
      </div>

      {sorted.length < 2 && (
        <div style={{ padding: "0 20px" }}>
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: "18px 16px",
              border: "1px solid rgba(44,26,14,0.08)",
              marginBottom: 14,
            }}
          >
            <p
              style={{
                fontFamily: "'Raleway',sans-serif",
                fontSize: 14,
                fontWeight: 700,
                color: "#2C1A0E",
                marginBottom: 6,
              }}
            >
              No comparisons yet
            </p>
            <p
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 11,
                color: "#8A7060",
                lineHeight: 1.6,
              }}
            >
              Do a scan today, then scan again later to see your score trend and
              photo comparison.
            </p>
          </div>
        </div>
      )}

      {sorted.length >= 2 && last && prev && (
        <div style={{ padding: "0 20px" }}>
          <div
            style={{
              background: "#fff",
              borderRadius: 16,
              padding: 14,
              border: "1px solid rgba(44,26,14,0.08)",
              display: "flex",
              gap: 12,
              alignItems: "center",
              marginBottom: 14,
            }}
          >
            <button
              onClick={() => setSelected(prev)}
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                overflow: "hidden",
                border: "1px solid rgba(44,26,14,0.08)",
                background: "#f3ede6",
                flexShrink: 0,
                padding: 0,
                cursor: "pointer",
              }}
            >
              <img
                src={prev.photoDataUrl}
                alt="Previous scan"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </button>
            <button
              onClick={() => setSelected(last)}
              style={{
                width: 64,
                height: 64,
                borderRadius: 16,
                overflow: "hidden",
                border: "1px solid rgba(44,26,14,0.08)",
                background: "#f3ede6",
                flexShrink: 0,
                padding: 0,
                cursor: "pointer",
              }}
            >
              <img
                src={last.photoDataUrl}
                alt="Latest scan"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            </button>
            <div style={{ flex: 1 }}>
              <p
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 10,
                  letterSpacing: "0.14em",
                  textTransform: "uppercase",
                  color: "#8A7060",
                  marginBottom: 6,
                }}
              >
                Latest vs previous
              </p>
              <p
                style={{
                  fontFamily: "'Raleway',sans-serif",
                  fontSize: 14,
                  fontWeight: 800,
                  color: "#2C1A0E",
                }}
              >
                {prev.skinScore} → {last.skinScore}{" "}
                <span style={{ color: last.skinScore >= prev.skinScore ? "#4A7C6F" : "#D94F2C" }}>
                  ({last.skinScore - prev.skinScore >= 0 ? "+" : ""}
                  {last.skinScore - prev.skinScore})
                </span>
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Chart */}
      <div
        style={{
          margin: "0 20px",
          background: "#fff",
          borderRadius: 16,
          padding: "20px",
          border: "1px solid rgba(44,26,14,0.08)",
        }}
      >
        <p
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: 10,
            letterSpacing: "0.12em",
            color: "#8A7060",
            textTransform: "uppercase",
            marginBottom: 16,
          }}
        >
          Skin Score Over Time
        </p>
        <div
          style={{
            display: "flex",
            alignItems: "flex-end",
            gap: 8,
            height: 120,
          }}
        >
          {scores.map((s, i) => (
            <div
              key={i}
              style={{
                flex: 1,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 4,
              }}
            >
              <span
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 10,
                  color: i === scores.length - 1 ? "#4A7C6F" : "#8A7060",
                  fontWeight: i === scores.length - 1 ? 500 : 400,
                }}
              >
                {s}
              </span>
              <div
                style={{
                  width: "100%",
                  borderRadius: "4px 4px 0 0",
                  background:
                    i === scores.length - 1
                      ? "#4A7C6F"
                      : `rgba(74,124,111,${0.25 + i * 0.12})`,
                  height: `${(s / max) * 100}px`,
                  transition: "height 1s cubic-bezier(0.4,0,0.2,1)",
                  minHeight: 8,
                }}
              />
              <span
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 9,
                  color: "#8A7060",
                  letterSpacing: "0.05em",
                }}
              >
                {weeks[i]}
              </span>
            </div>
          ))}
        </div>
        <div
          style={{
            marginTop: 14,
            padding: "10px 14px",
            background: "#E0F0EC",
            borderRadius: 10,
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <span
            style={{
              fontFamily: "'DM Mono',monospace",
              fontSize: 11,
              color: "#4A7C6F",
            }}
          >
            Overall change
          </span>
          <span
            style={{
              fontFamily: "'Playfair Display',serif",
              fontSize: 18,
              fontWeight: 900,
              color: "#4A7C6F",
            }}
          >
            {scores.length >= 2
              ? `${scores[scores.length - 1] - scores[0] >= 0 ? "+" : ""}${
                  scores[scores.length - 1] - scores[0]
                } pts`
              : "—"}
          </span>
        </div>
      </div>

      {/* Condition improvements */}
      <div
        style={{
          margin: "16px 20px 0",
          background: "#fff",
          borderRadius: 16,
          padding: "20px",
          border: "1px solid rgba(44,26,14,0.08)",
        }}
      >
        <p
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: 10,
            letterSpacing: "0.12em",
            color: "#8A7060",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          Condition Changes
        </p>
        {[
          { name: "Acne & Blemishes", before: 78, after: 44 },
          { name: "Dark Spots", before: 65, after: 48 },
          { name: "Dullness", before: 70, after: 38 },
          { name: "Dryness", before: 60, after: 22 },
        ].map((c, i) => (
          <div
            key={i}
            style={{
              marginBottom: 12,
              paddingBottom: 12,
              borderBottom: i < 3 ? "1px solid rgba(44,26,14,0.06)" : "none",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginBottom: 6,
              }}
            >
              <span
                style={{
                  fontFamily: "'Raleway',sans-serif",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "#2C1A0E",
                }}
              >
                {c.name}
              </span>
              <span
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 11,
                  color: "#4A7C6F",
                }}
              >
                ↓ {c.before - c.after} pts
              </span>
            </div>
            <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
              <div
                style={{
                  flex: 1,
                  height: 4,
                  background: "rgba(44,26,14,0.06)",
                  borderRadius: 2,
                  overflow: "hidden",
                }}
              >
                <div style={{ height: "100%", display: "flex" }}>
                  <div
                    style={{
                      width: `${c.after}%`,
                      background: "#4A7C6F",
                      borderRadius: 2,
                    }}
                  />
                  <div
                    style={{
                      width: `${c.before - c.after}%`,
                      background: "rgba(212,73,44,0.25)",
                      borderRadius: 2,
                    }}
                  />
                </div>
              </div>
              <span
                style={{
                  fontFamily: "'DM Mono',monospace",
                  fontSize: 10,
                  color: "#8A7060",
                  minWidth: 48,
                  textAlign: "right",
                }}
              >
                {c.before} → {c.after}
              </span>
            </div>
          </div>
        ))}
      </div>

      {/* Rescan CTA */}
      <div style={{ padding: "16px 20px 0" }}>
        <button
          onClick={onRescan}
          style={{
            width: "100%",
            padding: "16px",
            background: "#2C1A0E",
            borderRadius: 14,
            border: "none",
            fontFamily: "'Playfair Display',serif",
            fontSize: 17,
            fontWeight: 700,
            color: "#FAF7F2",
            cursor: "pointer",
          }}
        >
          Re-scan My Skin
        </button>
      </div>
    </div>
  );
}

// ── Home Screen ───────────────────────────────────────────
function HomeScreen({ onScan }: { onScan: () => void }) {
  return (
    <div
      style={{ background: "#FAF7F2", minHeight: "100%", paddingBottom: 100 }}
    >
      {/* Hero */}
      <div
        style={{
          background:
            "linear-gradient(160deg, #2C1A0E 0%, #3D1E0B 50%, #4A2E18 100%)",
          padding: "48px 24px 40px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: -80,
            right: -80,
            width: 260,
            height: 260,
            borderRadius: "50%",
            border: "1px solid rgba(196,92,42,0.12)",
          }}
        />
        <div
          style={{
            position: "absolute",
            top: 20,
            right: 20,
            width: 130,
            height: 130,
            borderRadius: "50%",
            border: "1px solid rgba(250,247,242,0.05)",
          }}
        />
        <p
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: 10,
            letterSpacing: "0.2em",
            color: "rgba(196,92,42,0.8)",
            textTransform: "uppercase",
            marginBottom: 12,
            position: "relative",
          }}
        >
          Afriskin · AI Skincare
        </p>
        <h1
          style={{
            fontFamily: "'Playfair Display',serif",
            fontSize: 36,
            fontWeight: 900,
            color: "rgba(250,247,242,0.95)",
            lineHeight: 0.95,
            letterSpacing: "-0.02em",
            marginBottom: 16,
            position: "relative",
          }}
        >
          Your skin,
          <br />
          <em style={{ color: "#C45C2A" }}>finally</em>
          <br />
          understood.
        </h1>
        <p
          style={{
            fontFamily: "'Raleway',sans-serif",
            fontSize: 14,
            color: "rgba(250,247,242,0.55)",
            lineHeight: 1.6,
            maxWidth: 280,
            marginBottom: 28,
            position: "relative",
          }}
        >
          AI skin analysis built for African skin — scan, detect, and get a
          personalised routine in seconds.
        </p>
        <button
          onClick={onScan}
          style={{
            background: "#C45C2A",
            border: "none",
            borderRadius: 14,
            padding: "16px 28px",
            fontFamily: "'Playfair Display',serif",
            fontSize: 16,
            fontWeight: 700,
            color: "#FAF7F2",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            gap: 10,
            position: "relative",
          }}
        >
          <span>📸</span> Scan My Skin Now
        </button>
      </div>

      {/* How it works */}
      <div style={{ padding: "24px 20px 0" }}>
        <p
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: 10,
            letterSpacing: "0.15em",
            color: "#8A7060",
            textTransform: "uppercase",
            marginBottom: 14,
          }}
        >
          How It Works
        </p>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {[
            {
              icon: "📸",
              step: "01",
              title: "Take a selfie",
              desc: "One clear photo of your face — in good natural light",
            },
            {
              icon: "🔬",
              step: "02",
              title: "AI analyses your skin",
              desc: "15 conditions checked in seconds, built for African skin",
            },
            {
              icon: "📊",
              step: "03",
              title: "Get your skin report",
              desc: "A clear breakdown of what your skin needs right now",
            },
            {
              icon: "🌿",
              step: "04",
              title: "Follow your routine",
              desc: "AM & PM steps with dermatologist-approved products",
            },
          ].map((s, i) => (
            <div
              key={i}
              style={{
                background: "#fff",
                borderRadius: 14,
                padding: "14px 16px",
                border: "1px solid rgba(44,26,14,0.07)",
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
              }}
            >
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 12,
                  background: "#FCE8E0",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 20,
                  flexShrink: 0,
                }}
              >
                {s.icon}
              </div>
              <div>
                <div
                  style={{
                    display: "flex",
                    gap: 8,
                    alignItems: "center",
                    marginBottom: 3,
                  }}
                >
                  <span
                    style={{
                      fontFamily: "'DM Mono',monospace",
                      fontSize: 9,
                      color: "#C45C2A",
                      letterSpacing: "0.1em",
                    }}
                  >
                    STEP {s.step}
                  </span>
                </div>
                <p
                  style={{
                    fontFamily: "'Raleway',sans-serif",
                    fontSize: 14,
                    fontWeight: 700,
                    color: "#2C1A0E",
                    marginBottom: 2,
                  }}
                >
                  {s.title}
                </p>
                <p
                  style={{
                    fontFamily: "'DM Mono',monospace",
                    fontSize: 11,
                    color: "#8A7060",
                    lineHeight: 1.5,
                  }}
                >
                  {s.desc}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Conditions preview */}
      <div style={{ padding: "20px 20px 0" }}>
        <p
          style={{
            fontFamily: "'DM Mono',monospace",
            fontSize: 10,
            letterSpacing: "0.15em",
            color: "#8A7060",
            textTransform: "uppercase",
            marginBottom: 12,
          }}
        >
          15 Conditions We Detect
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
          {[
            "Acne",
            "Dark Spots",
            "Hyperpigmentation",
            "Dryness",
            "Uneven Tone",
            "Dullness",
            "Pores",
            "Texture",
            "Fine Lines",
            "Dark Circles",
            "Redness",
            "Crow's Feet",
            "Firmness",
            "Smoothness",
            "Pigmentation",
          ].map((c) => (
            <span
              key={c}
              style={{
                fontFamily: "'DM Mono',monospace",
                fontSize: 10,
                padding: "4px 12px",
                borderRadius: 16,
                background: "#FCE8E0",
                color: "#C45C2A",
                border: "1px solid rgba(196,92,42,0.2)",
              }}
            >
              {c}
            </span>
          ))}
        </div>
      </div>

      {/* CTA bottom */}
      <div style={{ padding: "24px 20px 0" }}>
        <button
          onClick={onScan}
          style={{
            width: "100%",
            padding: "16px",
            background: "#2C1A0E",
            borderRadius: 14,
            border: "none",
            fontFamily: "'Playfair Display',serif",
            fontSize: 17,
            fontWeight: 700,
            color: "#FAF7F2",
            cursor: "pointer",
          }}
        >
          Start My Skin Scan →
        </button>
      </div>
    </div>
  );
}

// ── Splash ────────────────────────────────────────────────
function SplashScreen({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 2400);
    return () => clearTimeout(t);
  }, [onDone]);
  return (
    <div
      style={{
        height: "100%",
        background: "#2C1A0E",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: 0,
        position: "relative",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          position: "absolute",
          top: "20%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 300,
          height: 300,
          borderRadius: "50%",
          border: "1px solid rgba(196,92,42,0.15)",
          animation: "pulseRing 2s ease-out",
        }}
      />
      <div
        style={{
          position: "absolute",
          top: "27%",
          left: "50%",
          transform: "translateX(-50%)",
          width: 200,
          height: 200,
          borderRadius: "50%",
          border: "1px solid rgba(196,92,42,0.1)",
          animation: "pulseRing 2s ease-out 0.3s",
        }}
      />
      <h1
        style={{
          fontFamily: "'Playfair Display',serif",
          fontSize: 52,
          fontWeight: 900,
          color: "#FAF7F2",
          letterSpacing: "-0.03em",
          lineHeight: 1,
          animation: "fadeUp 0.8s ease forwards",
        }}
      >
        Afri<em style={{ color: "#C45C2A" }}>skin</em>
      </h1>
      <p
        style={{
          fontFamily: "'DM Mono',monospace",
          fontSize: 11,
          color: "rgba(250,247,242,0.35)",
          letterSpacing: "0.2em",
          textTransform: "uppercase",
          marginTop: 10,
          animation: "fadeUp 0.8s ease 0.2s forwards",
          opacity: 0,
        }}
      >
        AI Skincare · African Skin
      </p>
      <div
        style={{ position: "absolute", bottom: 60, display: "flex", gap: 5 }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: 5,
              height: 5,
              borderRadius: "50%",
              background: i === 0 ? "#C45C2A" : "rgba(250,247,242,0.2)",
              animation: `dotPulse 1.2s ease ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ── Bottom Nav ────────────────────────────────────────────
const NAV_ITEMS = [
  { id: "home", label: "Home", emoji: "🏠", highlight: false },
  { id: "scan", label: "Scan", emoji: "📸", highlight: true },
  { id: "results", label: "Report", emoji: "📊", highlight: false },
  { id: "tracker", label: "Track", emoji: "📈", highlight: false },
] as const;

// ── App ────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState<Screen>("splash");
  const [conditions, setConditions] = useState<Condition[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [analyzed, setAnalyzed] = useState(false);
  const [scanPhotoDataUrl, setScanPhotoDataUrl] = useState<string>("");
  const [history, setHistory] = useState<ScanRecord[]>([]);

  const goTo = (s: Screen) => setScreen(s);

  useEffect(() => {
    setHistory(loadScanHistory());
  }, []);

  const handleCapture = (photoDataUrl: string) => {
    setScanPhotoDataUrl(photoDataUrl);
    goTo("analyzing");
    setTimeout(() => {
      const nextConditions = generateResults();
      const nextProducts = generateProducts();
      setConditions(nextConditions);
      setProducts(nextProducts);
      setAnalyzed(true);

      const record: ScanRecord = {
        id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
        createdAt: Date.now(),
        photoDataUrl,
        skinScore: getSkinScore(nextConditions),
        conditions: nextConditions,
        products: nextProducts,
      };
      setHistory((prev) => {
        const next = [record, ...prev].slice(0, SCAN_HISTORY_MAX_ITEMS);
        saveScanHistory(next);
        return next;
      });

      goTo("results");
    }, 5200);
  };

  const handleCopyShoppingList = async () => {
    const list = products
      .map((p) => `- ${p.name} (${p.when}) — ${p.url}`)
      .join("\n");
    const title = "AFRISKIN shopping list";
    const text = `${title}\n\n${list}\n`;
    await copyToClipboard(text);
  };

  const visibleNav = !["splash", "scan", "analyzing"].includes(screen);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,700;0,900;1,700;1,900&family=Raleway:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; -webkit-tap-highlight-color: transparent; }
        html, body, #root { height: 100%; overflow: hidden; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes spinR { from { transform: rotate(360deg); } to { transform: rotate(0deg); } }
        @keyframes fadeUp { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
        @keyframes flashFade { 0% { opacity: 1; } 100% { opacity: 0; } }
        @keyframes pulseRing { 0% { transform: translateX(-50%) scale(0.5); opacity: 0; } 50% { opacity: 1; } 100% { transform: translateX(-50%) scale(1.1); opacity: 0; } }
        @keyframes dotPulse { 0%, 100% { opacity: 0.3; transform: scale(1); } 50% { opacity: 1; transform: scale(1.3); } }
        @keyframes slideUp { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
      `}</style>

      <div
        style={{
          height: "100%",
          display: "flex",
          flexDirection: "column",
          maxWidth: 430,
          margin: "0 auto",
          position: "relative",
          overflow: "hidden",
          background: "#FAF7F2",
          boxShadow: "0 0 60px rgba(0,0,0,0.3)",
        }}
      >
        {/* Screen area */}
        <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
          <div
            style={{
              height: "100%",
              overflowY:
                screen === "scan" ||
                screen === "analyzing" ||
                screen === "splash"
                  ? "hidden"
                  : "auto",
              WebkitOverflowScrolling: "touch",
            }}
          >
            {screen === "splash" && (
              <SplashScreen onDone={() => goTo("home")} />
            )}
            {screen === "home" && <HomeScreen onScan={() => goTo("scan")} />}
            {screen === "scan" && <ScanFace onCapture={handleCapture} />}
            {screen === "analyzing" && (
              <AnalyzingScreen photoDataUrl={scanPhotoDataUrl} />
            )}
            {screen === "results" && analyzed && (
              <ResultsScreen
                conditions={conditions}
                onViewRoutine={() => goTo("routine")}
                photoDataUrl={scanPhotoDataUrl}
              />
            )}
            {screen === "results" && !analyzed && (
              <HomeScreen onScan={() => goTo("scan")} />
            )}
            {screen === "routine" && (
              <RoutineScreen
                products={products}
                conditions={conditions}
                onCopyShoppingList={handleCopyShoppingList}
              />
            )}
            {screen === "tracker" && (
              <TrackerScreen onRescan={() => goTo("scan")} history={history} />
            )}
          </div>
        </div>

        {/* Bottom nav */}
        {visibleNav && (
          <div
            style={{
              flexShrink: 0,
              background: "#FAF7F2",
              borderTop: "1px solid rgba(44,26,14,0.08)",
              padding: "10px 8px 24px",
              display: "flex",
              gap: 4,
              animation: "slideUp 0.3s ease",
            }}
          >
            {NAV_ITEMS.map((item) => {
              const isActive =
                screen === item.id ||
                (item.id === "results" && screen === "routine");
              const isHighlight = item.highlight;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    if (item.id === "scan") goTo("scan");
                    else if (item.id === "results" && !analyzed) goTo("scan");
                    else goTo(item.id as Screen);
                  }}
                  style={{
                    flex: 1,
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: 4,
                    padding: "8px 4px",
                    borderRadius: 12,
                    border: "none",
                    background: isHighlight
                      ? "#C45C2A"
                      : isActive
                        ? "rgba(196,92,42,0.08)"
                        : "transparent",
                    cursor: "pointer",
                    transition: "all 0.2s",
                  }}
                >
                  <span style={{ fontSize: 20 }}>{item.emoji}</span>
                  <span
                    style={{
                      fontFamily: "'DM Mono',monospace",
                      fontSize: 9,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: isHighlight
                        ? "#FAF7F2"
                        : isActive
                          ? "#C45C2A"
                          : "#8A7060",
                      fontWeight: isActive ? 500 : 400,
                    }}
                  >
                    {item.label}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
