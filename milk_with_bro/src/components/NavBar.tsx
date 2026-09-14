import { Link } from "./Link";
import BoostConfetti from "../Confetti/BoostIconConfetti";
import type { Route } from "../lib/useRoute";

const LINKS: { route: Route; label: string }[] = [
  { route: "/", label: "Translator" },
  { route: "/about", label: "About" },
  { route: "/team", label: "Team" },
  { route: "/resources", label: "Resources" },
  { route: "/legal", label: "Legal" },
];

export function NavBar({ current }: { current: Route }) {
  return (
    <header className="topbar">
      <Link className="topbar-brand" to="/">
        {/* Confetti on hovering the wordmark - Bhuvaneesh's touch, which lived
            in App.tsx before the brand moved into this nav bar. */}
        <BoostConfetti>
          <span className="topbar-mark">Coffee with Bro</span>
        </BoostConfetti>
        <span className="topbar-sub">Sign language translator</span>
      </Link>

      <nav className="nav" aria-label="Main">
        <ul className="nav-list">
          {LINKS.map(({ route, label }) => {
            const isCurrent = route === current;
            return (
              <li key={route}>
                <Link
                  className={`nav-link ${isCurrent ? "is-current" : ""}`}
                  to={route}
                  aria-current={isCurrent ? "page" : undefined}
                >
                  {label}
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
