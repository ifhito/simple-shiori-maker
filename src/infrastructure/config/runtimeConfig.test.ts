import { afterEach, describe, expect, it } from 'vitest';
import { getRuntimeConfig } from './runtimeConfig';

describe('runtimeConfig', () => {
  afterEach(() => {
    delete process.env.SHARE_TTL_SECONDS;
  });

  it('uses 30 days as default share ttl', () => {
    const config = getRuntimeConfig();
    expect(config.shareTtlSeconds).toBe(2_592_000);
  });

  it('allows SHARE_TTL_SECONDS override', () => {
    process.env.SHARE_TTL_SECONDS = '3600';
    const config = getRuntimeConfig();
    expect(config.shareTtlSeconds).toBe(3600);
  });
});
