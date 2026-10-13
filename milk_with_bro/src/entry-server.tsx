import { renderToString } from "react-dom/server";
import { App } from "./App";
import { ROUTE_METADATA } from "./lib/seo";
import type { Route } from "./lib/useRoute";

export function render(url: string | null) {
  const normalizedRoute = url ? ((url.replace(/\/+$/, "") || "/") as Route) : null;
  const html = renderToString(<App ssrRoute={normalizedRoute} />);
  const metadata = (normalizedRoute && ROUTE_METADATA[normalizedRoute]) || {
    title: "404 Page Not Found — Coffee with Bro",
    description: "The requested page does not exist on the Coffee with Bro application.",
    robots: "noindex, nofollow",
  };

  return { html, metadata, route: normalizedRoute };
}
