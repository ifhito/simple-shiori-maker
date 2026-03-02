import { describe, expect, it, vi } from 'vitest';
import type { PasshashRecord, Shiori } from '../../domain/entities/Shiori';
import { unlockShioriViaApi } from './unlockShiori';

const passhash: PasshashRecord = {
  v: 1,
  salt: 'salt',
  hash: 'hash',
  iter: 100000
};

const shiori: Shiori = {
  title: 'test',
  destination: 'dest',
  startDateTime: '2026-01-01T09:00',
  endDateTime: '2026-01-01T18:00',
  design: { v: 1, layout: { preset: 'timeline' } },
  days: [
    {
      date: '2026-01-01',
      label: 'DAY 1',
      items: [{ time: '09:00', title: 'a', description: 'b', place: 'c' }]
    }
  ]
};

describe('unlockShioriViaApi', () => {
  it('throws when key is missing', async () => {
    await expect(
      unlockShioriViaApi(
        { password: 'secret-123' },
        {
          decryptApi: async () => ({ plainText: '{}', expiresAt: 1_700_000_000_000 }),
          parseJsonText: JSON.parse,
          validateShioriData: () => shiori,
          passhashRepository: { load: () => null, save: () => {} },
          verifyPasswordHashRecord: async () => true
        }
      )
    ).rejects.toThrow('共有リンクが不正です。URLを確認してください。');
  });

  it('blocks when local passhash does not match', async () => {
    await expect(
      unlockShioriViaApi(
        { key: 'k1', password: 'wrong' },
        {
          decryptApi: async () => ({ plainText: '{}', expiresAt: 1_700_000_000_000 }),
          parseJsonText: JSON.parse,
          validateShioriData: () => shiori,
          passhashRepository: { load: () => passhash, save: () => {} },
          verifyPasswordHashRecord: async () => false
        }
      )
    ).rejects.toThrow('保存済みパスワードと一致しません');
  });

  it('decrypts by key and returns validated shiori', async () => {
    const decryptApi = vi.fn(async () => ({
      plainText: JSON.stringify(shiori),
      expiresAt: 1_700_000_000_000
    }));
    const result = await unlockShioriViaApi(
      { key: 'k1', password: 'secret-123' },
      {
        decryptApi,
        parseJsonText: JSON.parse,
        validateShioriData: () => shiori,
        passhashRepository: { load: () => null, save: () => {} },
        verifyPasswordHashRecord: async () => true
      }
    );

    expect(decryptApi).toHaveBeenCalledWith({ key: 'k1', password: 'secret-123' });
    expect(result.shiori).toEqual(shiori);
    expect(result.expiresAt).toBe(1_700_000_000_000);
  });
});
