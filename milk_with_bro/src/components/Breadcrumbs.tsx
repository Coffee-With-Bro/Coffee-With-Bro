import { Link } from "./Link";
import type { Route } from "../lib/useRoute";

interface BreadcrumbItem {
  name: string;
  path: string;
}

const ROUTE_NAMES: Record<string, string> = {
  "/": "Home",
  "/about": "About",
  "/team": "Team & Contact",
  "/resources": "Resources",
  "/legal": "Terms of Use",
  "/privacy": "Privacy Policy",
  "/thank-you": "Confirmation",
};

interface BreadcrumbsProps {
  currentRoute: Route | null;
}

export function Breadcrumbs({ currentRoute }: BreadcrumbsProps) {
  if (!currentRoute || currentRoute === "/") {
    return null; // No breadcrumb needed on root homepage
  }

  const items: BreadcrumbItem[] = [
    { name: "Home", path: "/" },
    { name: ROUTE_NAMES[currentRoute] ?? "Page", path: currentRoute },
  ];

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: `https://coffeewithbro.local${item.path}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <nav aria-label="Breadcrumb" className="breadcrumbs">
        <ol className="breadcrumbs-list">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li
                key={item.path}
                className={`breadcrumb-item ${isLast ? "is-active" : ""}`}
                aria-current={isLast ? "page" : undefined}
              >
                {isLast ? (
                  <span className="breadcrumb-current">{item.name}</span>
                ) : (
                  <>
                    <Link to={item.path} className="breadcrumb-link">
                      {item.name}
                    </Link>
                    <span className="breadcrumb-separator" aria-hidden="true">
                      /
                    </span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>
    </>
  );
}
