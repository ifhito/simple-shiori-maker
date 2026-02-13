import { describe, expect, it } from 'vitest';
import { buildShareUrl, formatExpiryDateTime, formatRemainingTime } from './shareLink';

describe('shareLink utilities', () => {
  it('builds share URL with key path segment', () => {
    const url = buildShareUrl('https://example.com', 'abc123');

    expect(url).toBe('https://example.com/s/abc123');

    const parsed = new URL(url);
    expect(parsed.pathname).toBe('/s/abc123');
  });

  it('percent-encodes unsafe key characters', () => {
    const url = buildShareUrl('https://example.com', 'ab c/123');

    expect(url).toBe('https://example.com/s/ab%20c%2F123');
  });

  it('formats absolute expiry date in ja-JP locale', () => {
    const text = formatExpiryDateTime(Date.UTC(2026, 1, 13, 0, 0), 'ja-JP');
    expect(text).toContain('2026');
  });

  it('formats remaining time as days and hours', () => {
    const now = 1_700_000_000_000;
    const expiresAt = now + (2 * 24 + 5) * 60 * 60 * 1000;
    const text = formatRemainingTime(expiresAt, now);

    expect(text).toBe('残り2日 5時間');
  });

  it('returns expired label when time is up', () => {
    expect(formatRemainingTime(1_000, 1_001)).toBe('期限切れ');
  });
});
