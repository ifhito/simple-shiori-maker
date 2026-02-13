import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { createSharedPayloadRepository, resetSharedPayloadStoreForTest } from './sharedPayloadStorage';

describe('sharedPayloadStorage (in-memory fallback)', () => {
  beforeEach(() => {
    resetSharedPayloadStoreForTest();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('stores and returns payload with expiresAt metadata', async () => {
    const repository = await createSharedPayloadRepository();
    vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    await repository.put('k1', 'cipher', 600, 1_700_000_600_000);

    const record = await repository.get('k1');
    expect(record).toEqual({
      encryptedPayload: 'cipher',
      expiresAt: 1_700_000_600_000
    });
  });

  it('returns null after expiration', async () => {
    const repository = await createSharedPayloadRepository();
    const nowSpy = vi.spyOn(Date, 'now').mockReturnValue(1_700_000_000_000);
    await repository.put('k1', 'cipher', 1, 1_700_000_001_000);
    nowSpy.mockReturnValue(1_700_000_002_000);

    const record = await repository.get('k1');
    expect(record).toBeNull();
  });
});
