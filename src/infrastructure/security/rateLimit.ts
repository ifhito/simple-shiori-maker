interface RateBucket {
  count: number;
  resetAt: number;
}

const STORE_KEY = '__shioriRateLimitStore__';

function getStore(): Map<string, RateBucket> {
  const scoped = globalThis as typeof globalThis & {
    [STORE_KEY]?: Map<string, RateBucket>;
  };
  if (!scoped[STORE_KEY]) {
    scoped[STORE_KEY] = new Map<string, RateBucket>();
  }
  return scoped[STORE_KEY];
}

export interface ConsumeRateLimitInput {
  key: string;
  limit: number;
  windowMs: number;
  now?: number;
}

export function consumeRateLimit(input: ConsumeRateLimitInput): boolean {
  if (input.limit <= 0) {
    return true;
  }

  const now = input.now ?? Date.now();
  const store = getStore();
  const current = store.get(input.key);

  if (!current || now >= current.resetAt) {
    store.set(input.key, { count: 1, resetAt: now + input.windowMs });
    return true;
  }

  if (current.count >= input.limit) {
    return false;
  }

  current.count += 1;
  store.set(input.key, current);
  return true;
}

export function resetRateLimitStoreForTest(): void {
  getStore().clear();
}

export function getRateLimitSubject(request: Request): string {
  const cloudflareIp = request.headers.get('cf-connecting-ip');
  if (cloudflareIp) {
    return cloudflareIp;
  }

  const forwarded = request.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0]?.trim() || 'unknown';
  }

  const realIp = request.headers.get('x-real-ip');
  return realIp?.trim() || 'unknown';
}
