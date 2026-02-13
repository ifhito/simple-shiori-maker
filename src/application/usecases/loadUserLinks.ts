import type { UserLinkEntry, UserLinkList } from '../../domain/entities/UserLinkList';
import type { UserLinkListRepository } from '../../domain/repositories/UserLinkListRepository';
import type { LoadLinksApiRequest, LoadLinksApiResponse } from '../dto/userLinks';

export interface LoadUserLinksServerDeps {
  hashPassphrase: (passphrase: string) => Promise<string>;
  decryptPayload: (raw: Uint8Array, passphrase: string) => Promise<string>;
  validateUserLinkList: (value: unknown) => UserLinkList;
  parseJson: (text: string) => unknown;
  encryptPayload: (plainText: string, passphrase: string) => Promise<Uint8Array>;
  userLinkListRepository: UserLinkListRepository;
  linksTtlSeconds: number;
}

export async function loadUserLinksOnServer(
  passphrase: string,
  deps: LoadUserLinksServerDeps
): Promise<UserLinkEntry[]> {
  const hashedKey = await deps.hashPassphrase(passphrase);
  const kvKey = `links:${hashedKey}`;

  const raw = await deps.userLinkListRepository.get(kvKey);
  if (!raw) {
    return [];
  }

  const plainText = await deps.decryptPayload(raw, passphrase);
  const parsed = deps.parseJson(plainText);
  const validated = deps.validateUserLinkList(parsed);

  // TTL reset: re-encrypt and re-put with fresh TTL
  const payload = JSON.stringify(validated);
  const encrypted = await deps.encryptPayload(payload, passphrase);
  await deps.userLinkListRepository.put(kvKey, encrypted, deps.linksTtlSeconds);

  return validated.links;
}

export interface LoadUserLinksClientDeps {
  loadLinksApi: (request: LoadLinksApiRequest) => Promise<LoadLinksApiResponse>;
}

export async function loadUserLinksViaApi(
  passphrase: string,
  deps: LoadUserLinksClientDeps
): Promise<UserLinkEntry[]> {
  const result = await deps.loadLinksApi({ passphrase });
  return result.links;
}
