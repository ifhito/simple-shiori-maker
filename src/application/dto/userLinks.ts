import type { UserLinkEntry } from '../../domain/entities/UserLinkList';

export interface SaveLinksApiRequest {
  passphraseHash: string;
  links: UserLinkEntry[];
}

export interface SaveLinksApiResponse {
  ok: true;
}

export interface LoadLinksApiRequest {
  passphraseHash: string;
}

export interface LoadLinksApiResponse {
  links: UserLinkEntry[];
}
