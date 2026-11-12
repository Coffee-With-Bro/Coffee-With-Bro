import { useState, useEffect } from "react";
import { Link } from "./Link";

const STORAGE_KEY = "cwb_cookie_consent";

export function CookieBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      const consent = localStorage.getItem(STORAGE_KEY);
      if (!consent) {
        
        const timer = setTimeout(() => setVisible(true), 600);
        return () => clearTimeout(timer);
      }
    } catch (e) {
      void e;
    }
  }, []);

  function handleAccept() {
    try {
      localStorage.setItem(STORAGE_KEY, "accepted");
    } catch (e) {
      void e;
    }
    setVisible(false);
  }

  if (!visible) return null;

  return (
    <aside
      className="cookie-banner"
      role="region"
      aria-label="Privacy and local storage notification"
    >
      <div className="cookie-banner-content">
        <span className="cookie-icon" role="img" aria-label="Cookie">
          🍪
        </span>
        <div className="cookie-text">
          <strong>Privacy &amp; Local Storage Notice:</strong> We do not use any
          tracking or marketing cookies. We only use local device storage to
          save your session transcripts and UI preferences. Read our{" "}
          <Link to="/privacy">Privacy Policy</Link> for details.
        </div>
      </div>
      <div className="cookie-actions">
        <button
          type="button"
          className="btn btn-tiny btn-start"
          onClick={handleAccept}
          aria-label="Acknowledge cookie policy"
        >
          Got it
        </button>
      </div>
    </aside>
  );
}
