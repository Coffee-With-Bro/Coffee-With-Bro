import { useEffect } from "react";
import { NavBar } from "./components/NavBar";
import { Link } from "./components/Link";
import { useRoute } from "./lib/useRoute";
import { Home } from "./pages/Home";
import { About } from "./pages/About";
import { Team } from "./pages/Team";
import { Resources } from "./pages/Resources";
import { Legal } from "./pages/Legal";
import { NotFound } from "./pages/NotFound";
import { getThemeColor } from "./lib/theme";
import favicon from "./assets/favicon.svg?raw";
import "./App.css";
import "./pages/pages.css";

const TITLES: Record<string, string> = {
  "/": "Coffee with Bro — Sign language translator",
  "/about": "About — Coffee with Bro",
  "/team": "Team & Contact — Coffee with Bro",
  "/resources": "Resources used — Coffee with Bro",
  "/legal": "Terms & Privacy — Coffee with Bro",
};

function App() {
  const route = useRoute();

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
    document.title = route === null ? "404 — Page not found" : TITLES[route];

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

      {route === "/" && <Home />}
      {route === "/about" && <About />}
      {route === "/team" && <Team />}
      {route === "/resources" && <Resources />}
      {route === "/legal" && <Legal />}
      {route === null && <NotFound />}

      <footer className="footer">
        <span>UCS503 Software Engineering · Thapar Institute · 2026–27</span>
        <Link to="/legal">Terms &amp; Privacy</Link>
      </footer>
    </div>
  );
}

export default App;
