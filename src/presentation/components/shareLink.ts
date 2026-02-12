export function buildShareUrl(origin: string, key: string): string {
  return `${origin}/s/${encodeURIComponent(key)}`;
}
