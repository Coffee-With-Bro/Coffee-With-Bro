import { useSyncExternalStore } from "react";

export const ROUTES = [
  "/",
  "/about",
  "/team",
  "/resources",
  "/legal",
  "/privacy",
  "/thank-you",
] as const;

export type Route = (typeof ROUTES)[number];

const NAV_EVENT = "app:navigate";

function subscribe(onChange: () => void) {
  if (typeof window === "undefined") {
    return () => {};
  }
  window.addEventListener("popstate", onChange);
  window.addEventListener(NAV_EVENT, onChange);
  return () => {
    window.removeEventListener("popstate", onChange);
    window.removeEventListener(NAV_EVENT, onChange);
  };
}

function readRoute(): Route | null {
  if (typeof window === "undefined") {
    return "/";
  }
  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  return (ROUTES as readonly string[]).includes(path) ? (path as Route) : null;
}

export function useRoute(): Route | null {
  return useSyncExternalStore(subscribe, readRoute, () => "/" as Route);
}

export function navigate(to: string) {
  if (typeof window === "undefined") return;

  const url = new URL(to, window.location.origin);
  const unchanged =
    url.pathname === window.location.pathname && url.hash === window.location.hash;

  if (unchanged) return;

  window.history.pushState(null, "", url);
  window.dispatchEvent(new Event(NAV_EVENT));
}
