export function resolveMapUrl(place: string, mapUrl?: string): string {
  if (mapUrl && mapUrl.trim()) {
    return mapUrl;
  }
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(place)}`;
}

