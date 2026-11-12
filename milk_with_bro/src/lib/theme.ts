
export function getThemeColor(token: string): string {
  return getComputedStyle(document.documentElement).getPropertyValue(token).trim();
}
