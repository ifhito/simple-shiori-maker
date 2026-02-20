import type { PasshashRecord, Shiori } from '../../domain/entities/Shiori';

export interface PromptInput {
  requestText: string;
}

export interface EncryptApiRequest {
  plainText: string;
  password: string;
  /** 指定された場合、新規キー生成をスキップしてこのキーで KV を上書きする */
  key?: string;
  /** key 指定時に必要な既存リンク認証用パスワード */
  currentPassword?: string;
}

export interface EncryptApiResponse {
  key: string;
  passhash: PasshashRecord;
  expiresAt: number;
}

export interface DecryptApiRequest {
  key: string;
  password: string;
}

export interface DecryptApiResponse {
  plainText: string;
  expiresAt: number | null;
}

export interface UnlockResult {
  plainText: string;
  shiori: Shiori;
  expiresAt: number | null;
}
