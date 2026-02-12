import { describe, expect, it, vi } from 'vitest';
import type { PasshashRecord } from '../../domain/entities/Shiori';
import {
  createShareLinkFromStructuredText,
  createShareLinkViaApi
} from './createShareLink';

const passhash: PasshashRecord = {
  v: 1,
  salt: 'salt',
  hash: 'hash',
  iter: 100000
};

describe('createShareLinkFromStructuredText', () => {
  it('stores encrypted payload with generated key and returns key + passhash', async () => {
    const put = vi.fn(async () => {});
    const result = await createShareLinkFromStructuredText(
      {
        plainText: '{"title":"x"}',
        password: 'secret-123'
      },
      {
        parseJsonText: () => ({ title: 't' }),
        validateShioriData: () =>
          ({
            title: 't',
            destination: 'd',
            startDateTime: '2026-01-01T10:00',
            endDateTime: '2026-01-01T12:00',
            days: []
          }) as never,
        toCompactShiori: () => ({ cv: 1 }),
        serializeJson: () => '{"cv":1}',
        encryptPayload: async () => 'cipher',
        createPasswordHashRecord: async () => passhash,
        createShareKey: () => 'key-001',
        sharePayloadRepository: {
          exists: async () => false,
          put,
          get: async () => null
        },
        shareTtlSeconds: 600,
        maxKeyGenerationAttempts: 3
      }
    );

    expect(result).toEqual({ key: 'key-001', passhash });
    expect(put).toHaveBeenCalledWith('key-001', 'cipher', 600);
  });

  it('retries when generated key already exists', async () => {
    const exists = vi.fn(async (key: string) => key === 'dup');
    const keys = ['dup', 'ok-key'];
    const createShareKey = vi.fn(() => keys.shift() ?? 'fallback');

    const result = await createShareLinkFromStructuredText(
      { plainText: '{"title":"x"}', password: 'secret-123' },
      {
        parseJsonText: () => ({ title: 't' }),
        validateShioriData: () =>
          ({
            title: 't',
            destination: 'd',
            startDateTime: '2026-01-01T10:00',
            endDateTime: '2026-01-01T12:00',
            days: []
          }) as never,
        toCompactShiori: () => ({ cv: 1 }),
        serializeJson: () => '{"cv":1}',
        encryptPayload: async () => 'cipher',
        createPasswordHashRecord: async () => passhash,
        createShareKey,
        sharePayloadRepository: {
          exists,
          put: async () => {},
          get: async () => null
        },
        shareTtlSeconds: 600,
        maxKeyGenerationAttempts: 3
      }
    );

    expect(result.key).toBe('ok-key');
    expect(exists).toHaveBeenCalledTimes(2);
    expect(createShareKey).toHaveBeenCalledTimes(2);
  });
});

describe('createShareLinkViaApi', () => {
  it('saves passhash by key and returns key', async () => {
    const save = vi.fn();
    const result = await createShareLinkViaApi(
      { plainText: '{}', password: 'secret-123' },
      {
        encryptApi: async () => ({ key: 'key-999', passhash }),
        passhashRepository: { save, load: () => null }
      }
    );

    expect(result).toEqual({ key: 'key-999' });
    expect(save).toHaveBeenCalledWith('key-999', passhash);
  });
});
