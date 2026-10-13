// Privacy-preserving client analytics helper for Coffee With Bro

export interface AnalyticsEvent {
  event: string;
  category?: string;
  action?: string;
  label?: string;
  value?: number;
  [key: string]: unknown;
}

declare global {
  interface Window {
    cwbAnalytics?: {
      pageViews: number;
      events: AnalyticsEvent[];
      track: (eventName: string, details?: Record<string, unknown>) => void;
    };
    gtag?: (...args: unknown[]) => void;
  }
}

export function trackPageView(path: string) {
  if (typeof window === "undefined") return;

  if (window.cwbAnalytics) {
    window.cwbAnalytics.pageViews += 1;
    window.cwbAnalytics.track("page_view", { page_path: path, title: document.title });
  }

  // If Google Analytics GA4 or compatible is configured
  if (typeof window.gtag === "function") {
    window.gtag("event", "page_view", {
      page_path: path,
      page_title: document.title,
    });
  }
}

export function trackEvent(name: string, payload: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;

  if (window.cwbAnalytics) {
    window.cwbAnalytics.track(name, payload);
  }

  if (typeof window.gtag === "function") {
    window.gtag("event", name, payload);
  }
}
