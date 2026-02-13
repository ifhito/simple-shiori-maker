import type { UserLinkEntry } from '../../domain/entities/UserLinkList';

export interface SaveLinksApiRequest {
  passphrase: string;
  links: UserLinkEntry[];
}

export interface SaveLinksApiResponse {
  ok: true;
}

export interface LoadLinksApiRequest {
  passphrase: string;
}

export interface LoadLinksApiResponse {
  links: UserLinkEntry[];
}
