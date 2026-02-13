const CACHE_KEY = 'shiori:links:passphraseHash';

export function cachePassphraseHash(passphraseHash: string): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.setItem(CACHE_KEY, passphraseHash);
}

export function getCachedPassphraseHash(): string | null {
  if (typeof sessionStorage === 'undefined') {
    return null;
  }
  return sessionStorage.getItem(CACHE_KEY);
}

export function clearCachedPassphraseHash(): void {
  if (typeof sessionStorage === 'undefined') {
    return;
  }
  sessionStorage.removeItem(CACHE_KEY);
}

