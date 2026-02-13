export interface SharedPayloadRecord {
  encryptedPayload: string;
  expiresAt: number | null;
}

export interface SharedPayloadRepository {
  exists(key: string): Promise<boolean>;
  put(key: string, encryptedPayload: string, ttlSeconds: number, expiresAt: number): Promise<void>;
  get(key: string): Promise<SharedPayloadRecord | null>;
}
