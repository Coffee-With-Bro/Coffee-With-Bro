import { Link } from "./Link";
import BoostConfetti from "../Confetti/BoostIconConfetti";
import type { Route } from "../lib/useRoute";

const LINKS: { route: Route; label: string }[] = [
  { route: "/", label: "Translator" },
  { route: "/about", label: "About" },
  { route: "/team", label: "Team & Contact" },
  { route: "/resources", label: "Resources" },
  { route: "/legal", label: "Legal" },
  { route: "/privacy", label: "Privacy" },
];

export function NavBar({ current }: { current: Route | null }) {
  return (
    <header className="topbar">
      
      <Link className="topbar-brand" to="/">
        <BoostConfetti>
          <span className="topbar-brand-title">
            <span className="topbar-mug" aria-hidden="true">☕</span>
            <span className="topbar-mark">Coffee with Bro</span>
          </span>
        </BoostConfetti>
        <span className="topbar-sub">Offline sign language translator</span>
      </Link>


      <nav className="nav" aria-label="Main Navigation">
        <ul className="nav-list">
          {LINKS.map(({ route, label }) => {
            const isCurrent = current !== null && route === current;
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
