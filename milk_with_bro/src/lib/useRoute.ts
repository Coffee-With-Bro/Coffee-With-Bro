import { useSyncExternalStore } from "react";

/**
 * Minimal history-based router: real paths like /about rather than #/about.
 *
 * Five static pages don't justify pulling in react-router, but they do need
 * three things it would otherwise give us - reading the current path, changing
 * it without a page reload, and re-rendering when the visitor uses the back
 * button. That's all this is.
 *
 * Deploy note: because these are real paths, the host must serve index.html for
 * any unknown path. `npm run dev` and `npm run preview` already do. A plain
 * static host (GitHub Pages, S3) needs a rewrite rule or a 404.html fallback,
 * otherwise loading /about directly returns a 404.
 */

export const ROUTES = ["/", "/about", "/team", "/resources", "/legal"] as const;

export type Route = (typeof ROUTES)[number];

/** Fired on programmatic navigation; popstate only covers back/forward. */
const NAV_EVENT = "app:navigate";

function subscribe(onChange: () => void) {
  window.addEventListener("popstate", onChange);
  window.addEventListener(NAV_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(NAV_EVENT, onChange);
  };
}

function readRoute(): Route {
  // Tolerate a trailing slash so /about/ and /about are the same page.
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  return (ROUTES as readonly string[]).includes(path) ? (path as Route) : "/";
}

export function useRoute(): Route {
  // The server snapshot keeps this safe if the app is ever pre-rendered,
  // where window doesn't exist.
  return useSyncExternalStore(subscribe, readRoute, () => "/" as Route);
}

export function navigate(to: string) {
  const url = new URL(to, window.location.origin);
  const unchanged =
    url.pathname === window.location.pathname && url.hash === window.location.hash;

  if (unchanged) return;

  window.history.pushState(null, "", url);
  window.dispatchEvent(new Event(NAV_EVENT));
}
