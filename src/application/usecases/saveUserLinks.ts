import type { UserLinkEntry } from '../../domain/entities/UserLinkList';
import type { UserLinkListRepository } from '../../domain/repositories/UserLinkListRepository';
import type { SaveLinksApiRequest, SaveLinksApiResponse } from '../dto/userLinks';

export interface SaveUserLinksServerDeps {
  encryptPayload: (plainText: string, passphrase: string) => Promise<Uint8Array>;
  userLinkListRepository: UserLinkListRepository;
  linksTtlSeconds: number;
}

export interface SaveUserLinksServerInput {
  passphraseHash: string;
  links: UserLinkEntry[];
}

export async function saveUserLinksOnServer(
  input: SaveUserLinksServerInput,
  deps: SaveUserLinksServerDeps
): Promise<void> {
  const kvKey = `links:${input.passphraseHash}`;

  const payload = JSON.stringify({ v: 1, links: input.links });
  const encrypted = await deps.encryptPayload(payload, input.passphraseHash);

  await deps.userLinkListRepository.put(kvKey, encrypted, deps.linksTtlSeconds);
}

export interface SaveUserLinksClientDeps {
  saveLinksApi: (request: SaveLinksApiRequest) => Promise<SaveLinksApiResponse>;
}

export async function saveUserLinksViaApi(
  input: SaveUserLinksServerInput,
  deps: SaveUserLinksClientDeps
): Promise<void> {
  await deps.saveLinksApi({ passphraseHash: input.passphraseHash, links: input.links });
}
