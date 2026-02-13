export type SharedEncryptedPayload = string | Uint8Array;

export interface SharedPayloadRecord {
  encryptedPayload: SharedEncryptedPayload;
  expiresAt: number | null;
}

export interface SharedPayloadRepository {
  exists(key: string): Promise<boolean>;
  put(
    key: string,
    encryptedPayload: SharedEncryptedPayload,
    ttlSeconds: number,
    expiresAt: number
  ): Promise<void>;
  get(key: string): Promise<SharedPayloadRecord | null>;
}
