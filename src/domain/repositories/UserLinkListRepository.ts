export interface UserLinkListRepository {
  get(hashedKey: string): Promise<Uint8Array | null>;
  put(hashedKey: string, encryptedPayload: Uint8Array, ttlSeconds: number): Promise<void>;
}
