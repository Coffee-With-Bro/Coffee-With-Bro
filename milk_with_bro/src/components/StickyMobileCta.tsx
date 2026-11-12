import { Link } from "./Link";
import { type Route } from "../lib/useRoute";

interface StickyMobileCtaProps {
  currentRoute: Route | null;
  cameraOn?: boolean;
  onToggleCamera?: () => void;
  onOpenGuide?: () => void;
  liveGuessLabel?: string;
  confidencePct?: number;
}

export function StickyMobileCta({
  currentRoute,
  cameraOn = false,
  onToggleCamera,
  onOpenGuide,
  liveGuessLabel,
  confidencePct = 0,
}: StickyMobileCtaProps) {
  
  if (currentRoute !== "/") {
    return (
      <div className="sticky-mobile-cta" role="complementary" aria-label="Mobile quick action">
        <Link to="/" className="btn btn-start sticky-btn">
          ☕ Launch ASL Translator
        </Link>
      </div>
    );
  }

  return (
    <div className="sticky-mobile-cta" role="complementary" aria-label="Mobile camera controls">
      <div className="sticky-inner">
        {cameraOn && liveGuessLabel && (
          <div className="sticky-readout" aria-live="polite">
            <span className="sticky-label">Sign:</span>
            <strong className="sticky-char">{liveGuessLabel}</strong>
            <span className="sticky-pct">{confidencePct}%</span>
          </div>
        )}

        <button
          type="button"
          className={`btn ${cameraOn ? "btn-stop" : "btn-start"} sticky-btn`}
          onClick={onToggleCamera}
          aria-label={cameraOn ? "Stop webcam signing" : "Start webcam signing"}
        >
          {cameraOn ? "⏹ Stop Camera" : "📷 Start Camera"}
        </button>

        {onOpenGuide && (
          <button
            type="button"
            className="btn btn-ghost sticky-btn-aux"
            onClick={onOpenGuide}
            aria-label="View sign guide"
          >
            📖 Guide
          </button>
        )}
      </div>
    </div>
  );
}
