import type { PasshashRecord, Shiori } from '../../domain/entities/Shiori';

export interface PromptInput {
  requestText: string;
}

export interface EncryptApiRequest {
  plainText: string;
  password: string;
  id?: string;
}

export interface EncryptApiResponse {
  id: string;
  d: string;
  passhash: PasshashRecord;
}

export interface DecryptApiRequest {
  d: string;
  password: string;
}

export interface DecryptApiResponse {
  plainText: string;
}

export interface UnlockResult {
  plainText: string;
  shiori: Shiori;
}
