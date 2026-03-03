import type { Shiori } from '../../domain/entities/Shiori';
import type { UserLinkEntry } from '../../domain/entities/UserLinkList';
import type { PassphraseHashCacheRepository } from '../../domain/repositories/PassphraseHashCacheRepository';
import type { LoadLinksApiRequest, LoadLinksApiResponse, SaveLinksApiRequest, SaveLinksApiResponse } from '../dto/userLinks';
import { loadUserLinksViaApi } from './loadUserLinks';
import { saveUserLinksViaApi } from './saveUserLinks';

export interface UpsertUserLinkEntryInput {
  shiori: Shiori;
  key: string;
  expiresAt: number;
  passphrase: string;
}

export interface UpsertUserLinkEntryDeps {
  loadLinksApi: (request: LoadLinksApiRequest) => Promise<LoadLinksApiResponse>;
  saveLinksApi: (request: SaveLinksApiRequest) => Promise<SaveLinksApiResponse>;
  hashPassphrase: (passphrase: string) => Promise<string>;
  passphraseHashCache: PassphraseHashCacheRepository;
}

export async function upsertUserLinkEntryUseCase(
  input: UpsertUserLinkEntryInput,
  deps: UpsertUserLinkEntryDeps
): Promise<void> {
  const { shiori, key, expiresAt, passphrase } = input;

  const newEntry: UserLinkEntry = {
    key,
    title: shiori.title,
    destination: shiori.destination,
    createdAt: Date.now(),
    expiresAt
  };

  const loaded = await loadUserLinksViaApi(passphrase, {
    loadLinksApi: deps.loadLinksApi,
    hashPassphrase: deps.hashPassphrase,
    passphraseHashCache: deps.passphraseHashCache
  });

  const existing = loaded.links;
  const existingEntry = existing.find((entry) => entry.key === key);

  const merged: UserLinkEntry = existingEntry
    ? {
        ...existingEntry,
        ...newEntry,
        title: newEntry.title || existingEntry.title,
        destination: newEntry.destination || existingEntry.destination
      }
    : newEntry;

  const updated = [merged, ...existing.filter((entry) => entry.key !== key)].sort(
    (a, b) => b.createdAt - a.createdAt
  );

  await saveUserLinksViaApi(
    { passphraseHash: loaded.passphraseHash, links: updated },
    { saveLinksApi: deps.saveLinksApi }
  );

  deps.passphraseHashCache.save(loaded.passphraseHash);
}
