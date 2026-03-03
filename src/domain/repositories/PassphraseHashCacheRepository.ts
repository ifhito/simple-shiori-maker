export interface PassphraseHashCacheRepository {
  load(): string | null;
  save(hash: string): void;
  clear(): void;
}
