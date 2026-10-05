/** Canvas and standalone SVGs need resolved colors, rather than CSS var() strings. */
export function getThemeColor(token: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
}
