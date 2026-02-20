import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { PasshashRecord } from '../../domain/entities/Shiori';
import {
  ExistingShareAuthorizationError,
  createShareLinkFromStructuredText,
  createShareLinkViaApi
} from './createShareLink';

const passhash: PasshashRecord = {
  v: 1,
  salt: 'salt',
  hash: 'hash',
  iter: 100000
};
const fixedNow = 1_700_000_000_000;

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(fixedNow);
});

afterEach(() => {
  vi.restoreAllMocks();
});

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
        encryptPayload: async () => new Uint8Array([0x05, 0x01]),
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

    expect(result).toEqual({ key: 'key-001', passhash, expiresAt: fixedNow + 600_000 });
    expect(put).toHaveBeenCalledWith('key-001', expect.any(Uint8Array), 600, fixedNow + 600_000);
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
        encryptPayload: async () => new Uint8Array([0x05, 0x01]),
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
    expect(result.expiresAt).toBe(fixedNow + 600_000);
    expect(exists).toHaveBeenCalledTimes(2);
    expect(createShareKey).toHaveBeenCalledTimes(2);
  });
});

describe('createShareLinkViaApi', () => {
  it('saves passhash by key and returns key + expiresAt', async () => {
    const save = vi.fn();
    const result = await createShareLinkViaApi(
      { plainText: '{}', password: 'secret-123' },
      {
        encryptApi: async () => ({ key: 'key-999', passhash, expiresAt: fixedNow + 2_592_000_000 }),
        passhashRepository: { save, load: () => null }
      }
    );

    expect(result).toEqual({ key: 'key-999', expiresAt: fixedNow + 2_592_000_000 });
    expect(save).toHaveBeenCalledWith('key-999', passhash);
  });
});

describe('createShareLinkFromStructuredText – existingKey', () => {
  it('authorizes existingKey with currentPassword and skips exists()', async () => {
    const exists = vi.fn(async () => false);
    const put = vi.fn(async () => {});
    const authorizeExistingKeyOverwrite = vi.fn(async () => {});

    const result = await createShareLinkFromStructuredText(
      {
        plainText: '{"title":"x"}',
        password: 'secret-123',
        existingKey: 'fixed-key',
        currentPassword: 'current-pass'
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
        encryptPayload: async () => new Uint8Array([0x05, 0x01]),
        createPasswordHashRecord: async () => passhash,
        createShareKey: () => 'should-not-be-called',
        authorizeExistingKeyOverwrite,
        sharePayloadRepository: { exists, put, get: async () => null },
        shareTtlSeconds: 600,
        maxKeyGenerationAttempts: 3
      }
    );

    expect(result.key).toBe('fixed-key');
    expect(put).toHaveBeenCalledWith('fixed-key', expect.any(Uint8Array), 600, fixedNow + 600_000);
    expect(authorizeExistingKeyOverwrite).toHaveBeenCalledWith({
      key: 'fixed-key',
      currentPassword: 'current-pass'
    });
    // exists() should NOT be called when existingKey is provided
    expect(exists).not.toHaveBeenCalled();
  });

  it('throws when existingKey is provided without currentPassword', async () => {
    await expect(
      createShareLinkFromStructuredText(
        { plainText: '{"title":"x"}', password: 'secret-123', existingKey: 'fixed-key' },
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
          encryptPayload: async () => new Uint8Array([0x05, 0x01]),
          createPasswordHashRecord: async () => passhash,
          createShareKey: () => 'should-not-be-called',
          sharePayloadRepository: {
            exists: async () => false,
            put: async () => {},
            get: async () => null
          },
          shareTtlSeconds: 600,
          maxKeyGenerationAttempts: 3
        }
      )
    ).rejects.toBeInstanceOf(ExistingShareAuthorizationError);
  });
});

describe('createShareLinkViaApi – existingKey', () => {
  it('passes key and currentPassword to encryptApi when existingKey provided', async () => {
    const encryptApi = vi.fn(async () => ({
      key: 'fixed-key',
      passhash,
      expiresAt: fixedNow + 600_000
    }));

    await createShareLinkViaApi(
      {
        plainText: '{}',
        password: 'secret-123',
        existingKey: 'fixed-key',
        currentPassword: 'current-pass'
      },
      {
        encryptApi,
        passhashRepository: { save: vi.fn(), load: () => null }
      }
    );

    expect(encryptApi).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'fixed-key', currentPassword: 'current-pass' })
    );
  });
});
