export interface SharedPayloadRepository {
  exists(key: string): Promise<boolean>;
  put(key: string, encryptedPayload: string, ttlSeconds: number): Promise<void>;
  get(key: string): Promise<string | null>;
}
