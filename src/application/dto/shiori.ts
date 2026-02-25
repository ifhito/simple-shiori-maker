import type { PasshashRecord, Shiori } from '../../domain/entities/Shiori';

export interface PromptInput {
  basicInfo: string;       // 行き先・開始日時・終了日時・人数（必須）
  tripStyle: string;       // どのような旅行にしたいか（必須）
  mustVisit?: string;      // 絶対行きたい場所（任意）
  designRequest?: string;  // デザイン希望（任意）
}

export interface EncryptApiRequest {
  plainText: string;
  password: string;
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
