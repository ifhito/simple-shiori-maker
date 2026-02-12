import { describe, expect, it } from 'vitest';
import { buildShareUrl, readEncryptedPayloadFromHash } from './shareLink';

describe('shareLink utilities', () => {
  it('builds share URL with id in query and d in hash (ASCII payload)', () => {
    const url = buildShareUrl('https://example.com', 'abc123', 'ABCdef123');

    expect(url).toBe('https://example.com/shiori?id=abc123#d=ABCdef123');

    const parsed = new URL(url);
    expect(parsed.searchParams.get('id')).toBe('abc123');
    expect(parsed.searchParams.get('d')).toBeNull();
  });

  it('builds share URL with Unicode payload without percent-encoding', () => {
    const unicodePayload = '\u3400\u3401\u3402';
    const url = buildShareUrl('https://example.com', 'abc123', unicodePayload);

    expect(url).toBe(`https://example.com/shiori?id=abc123#d=${unicodePayload}`);
    expect(url).not.toContain('%');
  });

  it('reads encrypted payload from hash with Unicode characters', () => {
    const unicodePayload = '\u3400\u3401\u3402';
    expect(readEncryptedPayloadFromHash(`#d=${unicodePayload}`)).toBe(unicodePayload);
  });

  it('reads encrypted payload from hash query string', () => {
    expect(readEncryptedPayloadFromHash('#id=ignore&d=abc%2Fdef')).toBe('abc/def');
    expect(readEncryptedPayloadFromHash('d=xyz')).toBe('xyz');
  });

  it('returns undefined when hash has no usable d value', () => {
    expect(readEncryptedPayloadFromHash('')).toBeUndefined();
    expect(readEncryptedPayloadFromHash('#id=abc')).toBeUndefined();
    expect(readEncryptedPayloadFromHash('#d=')).toBeUndefined();
  });
});
