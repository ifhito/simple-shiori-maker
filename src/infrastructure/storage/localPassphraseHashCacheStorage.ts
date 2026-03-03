import type { PassphraseHashCacheRepository } from '../../domain/repositories/PassphraseHashCacheRepository';
import {
  cachePassphraseHash,
  getCachedPassphraseHash,
  clearCachedPassphraseHash
} from './passphraseHashCache';

export class LocalPassphraseHashCacheStorage implements PassphraseHashCacheRepository {
  load(): string | null {
    return getCachedPassphraseHash();
  }

  save(hash: string): void {
    cachePassphraseHash(hash);
  }

  clear(): void {
    clearCachedPassphraseHash();
  }
}
