import { describe, expect, it } from 'vitest';
import { buildShareUrl, readEncryptedPayloadFromHash } from './shareLink';

describe('shareLink utilities', () => {
  it('builds share URL with id in query and d in hash', () => {
    const url = buildShareUrl('https://example.com', 'abc123', 'A+B/=');
    const parsed = new URL(url);

    expect(parsed.searchParams.get('id')).toBe('abc123');
    expect(parsed.searchParams.get('d')).toBeNull();
    expect(parsed.hash).toBe('#d=A%2BB%2F%3D');
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
