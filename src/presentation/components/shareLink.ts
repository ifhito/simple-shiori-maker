export function buildShareUrl(origin: string, id: string, d: string): string {
  const search = new URLSearchParams({ id }).toString();
  return `${origin}/shiori?${search}#d=${d}`;
}

export function readEncryptedPayloadFromHash(hash: string): string | undefined {
  const rawHash = hash.startsWith('#') ? hash.slice(1) : hash;
  if (!rawHash.trim()) {
    return undefined;
  }

  const params = new URLSearchParams(rawHash);
  const d = params.get('d');
  if (!d || !d.trim()) {
    return undefined;
  }

  return d;
}
