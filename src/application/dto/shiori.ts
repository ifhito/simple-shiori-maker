import type { PasshashRecord, Shiori } from '../../domain/entities/Shiori';

export interface PromptInput {
  requestText: string;
}

export interface EncryptApiRequest {
  plainText: string;
  password: string;
}

export interface EncryptApiResponse {
  key: string;
  passhash: PasshashRecord;
}

export interface DecryptApiRequest {
  key: string;
  password: string;
}

export interface DecryptApiResponse {
  plainText: string;
}

export interface UnlockResult {
  plainText: string;
  shiori: Shiori;
}
