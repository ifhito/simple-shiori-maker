export function buildShareUrl(origin: string, key: string): string {
  return `${origin}/s/${encodeURIComponent(key)}`;
}

export function formatExpiryDateTime(expiresAt: number, locale = 'ja-JP'): string {
  return new Intl.DateTimeFormat(locale, {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(expiresAt));
}

export function formatRemainingTime(expiresAt: number, now = Date.now()): string {
  const diff = expiresAt - now;
  if (diff <= 0) {
    return '期限切れ';
  }

  const totalHours = Math.floor(diff / (60 * 60 * 1000));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;

  if (days > 0) {
    return hours > 0 ? `残り${days}日 ${hours}時間` : `残り${days}日`;
  }
  if (hours > 0) {
    return `残り${hours}時間`;
  }

  const minutes = Math.max(1, Math.floor(diff / (60 * 1000)));
  return `残り${minutes}分`;
}
