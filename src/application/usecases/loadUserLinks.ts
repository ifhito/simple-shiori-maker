import type { UserLinkEntry, UserLinkList } from '../../domain/entities/UserLinkList';
import type { UserLinkListRepository } from '../../domain/repositories/UserLinkListRepository';
import type { PassphraseHashCacheRepository } from '../../domain/repositories/PassphraseHashCacheRepository';
import type { LoadLinksApiRequest, LoadLinksApiResponse } from '../dto/userLinks';

export interface LoadUserLinksServerDeps {
  decryptPayload: (raw: Uint8Array, passphrase: string) => Promise<string>;
  validateUserLinkList: (value: unknown) => UserLinkList;
  parseJson: (text: string) => unknown;
  userLinkListRepository: UserLinkListRepository;
  linksTtlSeconds: number;
}

export async function loadUserLinksOnServer(
  passphraseHash: string,
  deps: LoadUserLinksServerDeps
): Promise<UserLinkEntry[]> {
  const kvKey = `links:${passphraseHash}`;

  const raw = await deps.userLinkListRepository.get(kvKey);
  if (!raw) {
    return [];
  }

  const plainText = await deps.decryptPayload(raw, passphraseHash);
  const parsed = deps.parseJson(plainText);
  const validated = deps.validateUserLinkList(parsed);

  // TTL reset: re-put the original encrypted bytes with fresh TTL.
  await deps.userLinkListRepository.put(kvKey, raw, deps.linksTtlSeconds);

  return validated.links;
}

export interface LoadUserLinksClientDeps {
  loadLinksApi: (request: LoadLinksApiRequest) => Promise<LoadLinksApiResponse>;
  passphraseHashCache?: PassphraseHashCacheRepository;
}

export interface LoadUserLinksClientPassphraseDeps extends LoadUserLinksClientDeps {
  hashPassphrase: (passphrase: string) => Promise<string>;
}

export async function loadUserLinksViaApi(
  passphrase: string,
  deps: LoadUserLinksClientPassphraseDeps
): Promise<{ passphraseHash: string; links: UserLinkEntry[] }> {
  const passphraseHash = await deps.hashPassphrase(passphrase);
  try {
    const links = await loadUserLinksViaApiWithHash(passphraseHash, deps);
    deps.passphraseHashCache?.save(passphraseHash);
    return { passphraseHash, links };
  } catch (e) {
    deps.passphraseHashCache?.clear();
    throw e;
  }
}

export async function loadUserLinksViaApiWithHash(
  passphraseHash: string,
  deps: LoadUserLinksClientDeps
): Promise<UserLinkEntry[]> {
  try {
    const result = await deps.loadLinksApi({ passphraseHash });
    deps.passphraseHashCache?.save(passphraseHash);
    return result.links;
  } catch (e) {
    deps.passphraseHashCache?.clear();
    throw e;
  }
}
