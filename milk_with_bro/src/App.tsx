import { useEffect, useState } from "react";
import { NavBar } from "./components/NavBar";
import { Breadcrumbs } from "./components/Breadcrumbs";
import { Link } from "./components/Link";
import { useRoute, type Route } from "./lib/useRoute";
import { Home } from "./pages/Home";
import { About } from "./pages/About";
import { Team } from "./pages/Team";
import { Resources } from "./pages/Resources";
import { Legal } from "./pages/Legal";
import { Privacy } from "./pages/Privacy";
import { ThankYou } from "./pages/ThankYou";
import { Diagnostics } from "./pages/Diagnostics";
import { NotFound } from "./pages/NotFound";
import { CookieBanner } from "./components/CookieBanner";
import { StickyMobileCta } from "./components/StickyMobileCta";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { updatePageMetadata } from "./lib/seo";
import { trackPageView } from "./lib/analytics";
import { getThemeColor } from "./lib/theme";
import favicon from "./assets/favicon.svg?raw";
import "./App.css";
import "./pages/pages.css";

interface HomeMobileSyncState {
  cameraOn: boolean;
  liveGuessLabel?: string;
  confidencePct: number;
  toggleCamera: () => void;
  openGuide: () => void;
}

interface AppProps {
  ssrRoute?: Route | null;
}

export function App({ ssrRoute }: AppProps = {}) {
  const clientRoute = useRoute();
  const route = ssrRoute !== undefined ? ssrRoute : clientRoute;
  const [homeSync, setHomeSync] = useState<HomeMobileSyncState | null>(null);

  useEffect(() => {
    const icon = document.querySelector<HTMLLinkElement>('link[rel="icon"]');
    if (!icon) return;

    // A favicon is a separate document and cannot inherit the app's CSS tokens.
    const svg = favicon.replace(/var\((--[\w-]+)\)/g, (_, token: string) => getThemeColor(token));
    const url = URL.createObjectURL(new Blob([svg], { type: "image/svg+xml" }));
    icon.href = url;
    return () => URL.revokeObjectURL(url);
  }, []);

  useEffect(() => {
    // Update SEO meta title, description, and Open Graph tags
    updatePageMetadata(route);
    // Track page view event
    trackPageView(route || "/404");

    const anchor = window.location.hash.slice(1);
    const target = anchor ? document.getElementById(anchor) : null;

    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "start" });
    } else {
      window.scrollTo(0, 0);
    }
  }, [route]);

  return (
    <div className="shell">
      <NavBar current={route} />

      {/* Breadcrumbs with JSON-LD Schema on all subpages */}
      <Breadcrumbs currentRoute={route} />

      {route === "/" && <Home onStateChange={setHomeSync} />}
      {route === "/diagnostics" && <Diagnostics />}
      {route === "/about" && <About />}
      {route === "/team" && <Team />}
      {route === "/resources" && <Resources />}
      {route === "/legal" && <Legal />}
      {route === "/privacy" && <Privacy />}
      {route === "/thank-you" && <ThankYou />}
      {route === null && <NotFound />}

      {/* Complete Footer Navigation — Eliminates all orphan pages */}
      <footer className="footer" role="contentinfo">
        <div className="footer-line">
          <span>UCS503 Software Engineering · Thapar Institute · 2026–27</span>
        </div>
        <div className="footer-links">
          <Link to="/">Translator</Link>
          <span aria-hidden="true">·</span>
          <Link to="/diagnostics">System Diagnostics</Link>
          <span aria-hidden="true">·</span>
          <Link to="/about">About</Link>
          <span aria-hidden="true">·</span>
          <Link to="/team">Team &amp; Contact</Link>
          <span aria-hidden="true">·</span>
          <Link to="/resources">Resources</Link>
          <span aria-hidden="true">·</span>
          <Link to="/legal">Terms of Use</Link>
          <span aria-hidden="true">·</span>
          <Link to="/privacy">Privacy Policy</Link>
          <span aria-hidden="true">·</span>
          <Link to="/thank-you">Status</Link>
        </div>
      </footer>

      {/* Floating Privacy Notice / Cookie Banner */}
      <CookieBanner />

      {/* Vercel Web Analytics */}
      <Analytics />

      {/* Vercel Speed Insights */}
      <SpeedInsights />

      {/* Responsive Sticky Mobile Call-to-Action Bar */}
      <StickyMobileCta
        currentRoute={route}
        cameraOn={homeSync?.cameraOn}
        onToggleCamera={homeSync?.toggleCamera}
        onOpenGuide={homeSync?.openGuide}
        liveGuessLabel={homeSync?.liveGuessLabel}
        confidencePct={homeSync?.confidencePct}
      />
    </div>
  );
}

export default App;
