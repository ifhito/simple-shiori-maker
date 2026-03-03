import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { upsertUserLinkEntryUseCase } from './upsertUserLinkEntry';
import type { Shiori } from '../../domain/entities/Shiori';
import type { UserLinkEntry } from '../../domain/entities/UserLinkList';
import type { PassphraseHashCacheRepository } from '../../domain/repositories/PassphraseHashCacheRepository';
import type { LoadLinksApiRequest, LoadLinksApiResponse, SaveLinksApiRequest, SaveLinksApiResponse } from '../dto/userLinks';

const fixedNow = 1_700_000_000_000;

beforeEach(() => {
  vi.spyOn(Date, 'now').mockReturnValue(fixedNow);
});

afterEach(() => {
  vi.restoreAllMocks();
});

const mockShiori: Shiori = {
  title: 'Tokyo Trip',
  destination: 'Tokyo, Japan',
  startDateTime: '2026-04-01T09:00',
  endDateTime: '2026-04-05T20:00',
  days: [],
  design: {} as Shiori['design']
};

function makeDeps(existingLinks: UserLinkEntry[] = []) {
  const passphraseHash = 'hash-abc';
  const saveLinksApi = vi.fn(
    async (_req: SaveLinksApiRequest): Promise<SaveLinksApiResponse> => ({ ok: true as const })
  );
  const loadLinksApi = vi.fn(
    async (_req: LoadLinksApiRequest): Promise<LoadLinksApiResponse> => ({ links: existingLinks })
  );
  const hashPassphrase = vi.fn(async (_p: string) => passphraseHash);
  const passphraseHashCache: PassphraseHashCacheRepository = {
    load: vi.fn(() => null),
    save: vi.fn(),
    clear: vi.fn()
  };
  return { loadLinksApi, saveLinksApi, hashPassphrase, passphraseHashCache, passphraseHash };
}

describe('upsertUserLinkEntryUseCase', () => {
  it('creates a new entry when no existing links', async () => {
    const { loadLinksApi, saveLinksApi, hashPassphrase, passphraseHashCache, passphraseHash } = makeDeps();

    await upsertUserLinkEntryUseCase(
      { shiori: mockShiori, key: 'key-001', expiresAt: fixedNow + 1000, passphrase: 'my-pass' },
      { loadLinksApi, saveLinksApi, hashPassphrase, passphraseHashCache }
    );

    expect(saveLinksApi).toHaveBeenCalledWith({
      passphraseHash,
      links: [{
        key: 'key-001',
        title: 'Tokyo Trip',
        destination: 'Tokyo, Japan',
        createdAt: fixedNow,
        expiresAt: fixedNow + 1000
      }]
    });
    expect(passphraseHashCache.save).toHaveBeenCalledWith(passphraseHash);
  });

  it('overwrites an existing entry with the same key', async () => {
    const existingEntry: UserLinkEntry = {
      key: 'key-001',
      title: 'Old Title',
      destination: 'Old Dest',
      createdAt: fixedNow - 5000,
      expiresAt: fixedNow + 500
    };
    const { loadLinksApi, saveLinksApi, hashPassphrase, passphraseHashCache, passphraseHash } = makeDeps([existingEntry]);

    await upsertUserLinkEntryUseCase(
      { shiori: mockShiori, key: 'key-001', expiresAt: fixedNow + 1000, passphrase: 'my-pass' },
      { loadLinksApi, saveLinksApi, hashPassphrase, passphraseHashCache }
    );

    expect(saveLinksApi).toHaveBeenCalledWith(
      expect.objectContaining({
        passphraseHash,
        links: expect.arrayContaining([
          expect.objectContaining({ key: 'key-001', title: 'Tokyo Trip', destination: 'Tokyo, Japan' })
        ])
      })
    );
    const callArg = saveLinksApi.mock.calls[0]?.[0];
    expect(callArg?.links).toHaveLength(1);
  });

  it('preserves existing title/destination when new ones are empty', async () => {
    const existingEntry: UserLinkEntry = {
      key: 'key-001',
      title: 'Existing Title',
      destination: 'Existing Dest',
      createdAt: fixedNow - 5000,
      expiresAt: fixedNow + 500
    };
    const emptyShiori: Shiori = { ...mockShiori, title: '', destination: '' };
    const { loadLinksApi, saveLinksApi, hashPassphrase, passphraseHashCache } = makeDeps([existingEntry]);

    await upsertUserLinkEntryUseCase(
      { shiori: emptyShiori, key: 'key-001', expiresAt: fixedNow + 1000, passphrase: 'my-pass' },
      { loadLinksApi, saveLinksApi, hashPassphrase, passphraseHashCache }
    );

    expect(saveLinksApi).toHaveBeenCalledWith(
      expect.objectContaining({
        links: expect.arrayContaining([
          expect.objectContaining({ title: 'Existing Title', destination: 'Existing Dest' })
        ])
      })
    );
  });

  it('keeps other entries intact when adding a new one', async () => {
    const other: UserLinkEntry = {
      key: 'key-999',
      title: 'Other',
      destination: 'Other Dest',
      createdAt: fixedNow - 1000,
      expiresAt: fixedNow + 9999
    };
    const { loadLinksApi, saveLinksApi, hashPassphrase, passphraseHashCache } = makeDeps([other]);

    await upsertUserLinkEntryUseCase(
      { shiori: mockShiori, key: 'key-001', expiresAt: fixedNow + 1000, passphrase: 'my-pass' },
      { loadLinksApi, saveLinksApi, hashPassphrase, passphraseHashCache }
    );

    const callArg = saveLinksApi.mock.calls[0]?.[0];
    expect(callArg?.links).toHaveLength(2);
    const keys = (callArg?.links ?? []).map((e) => e.key);
    expect(keys).toContain('key-001');
    expect(keys).toContain('key-999');
  });
});
