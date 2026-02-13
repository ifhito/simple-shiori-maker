import type { UserLinkEntry, UserLinkList } from '../../domain/entities/UserLinkList';
import type { UserLinkListRepository } from '../../domain/repositories/UserLinkListRepository';
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
}

export interface LoadUserLinksClientPassphraseDeps extends LoadUserLinksClientDeps {
  hashPassphrase: (passphrase: string) => Promise<string>;
}

export async function loadUserLinksViaApi(
  passphrase: string,
  deps: LoadUserLinksClientPassphraseDeps
): Promise<{ passphraseHash: string; links: UserLinkEntry[] }> {
  const passphraseHash = await deps.hashPassphrase(passphrase);
  const links = await loadUserLinksViaApiWithHash(passphraseHash, deps);
  return { passphraseHash, links };
}

export async function loadUserLinksViaApiWithHash(
  passphraseHash: string,
  deps: LoadUserLinksClientDeps
): Promise<UserLinkEntry[]> {
  const result = await deps.loadLinksApi({ passphraseHash });
  return result.links;
}
