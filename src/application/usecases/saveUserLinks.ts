import type { UserLinkEntry } from '../../domain/entities/UserLinkList';
import type { UserLinkListRepository } from '../../domain/repositories/UserLinkListRepository';
import type { SaveLinksApiRequest, SaveLinksApiResponse } from '../dto/userLinks';

export interface SaveUserLinksServerDeps {
  hashPassphrase: (passphrase: string) => Promise<string>;
  encryptPayload: (plainText: string, passphrase: string) => Promise<Uint8Array>;
  userLinkListRepository: UserLinkListRepository;
  linksTtlSeconds: number;
}

export interface SaveUserLinksServerInput {
  passphrase: string;
  links: UserLinkEntry[];
}

export async function saveUserLinksOnServer(
  input: SaveUserLinksServerInput,
  deps: SaveUserLinksServerDeps
): Promise<void> {
  const hashedKey = await deps.hashPassphrase(input.passphrase);
  const kvKey = `links:${hashedKey}`;

  const payload = JSON.stringify({ v: 1, links: input.links });
  const encrypted = await deps.encryptPayload(payload, input.passphrase);

  await deps.userLinkListRepository.put(kvKey, encrypted, deps.linksTtlSeconds);
}

export interface SaveUserLinksClientDeps {
  saveLinksApi: (request: SaveLinksApiRequest) => Promise<SaveLinksApiResponse>;
}

export async function saveUserLinksViaApi(
  input: SaveUserLinksServerInput,
  deps: SaveUserLinksClientDeps
): Promise<void> {
  await deps.saveLinksApi({ passphrase: input.passphrase, links: input.links });
}
