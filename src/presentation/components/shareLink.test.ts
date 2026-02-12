import { describe, expect, it } from 'vitest';
import { buildShareUrl } from './shareLink';

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
});
