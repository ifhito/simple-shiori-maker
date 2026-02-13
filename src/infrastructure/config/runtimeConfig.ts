function parsePositiveInt(value: string | undefined, fallback: number): number {
  if (!value) {
    return fallback;
  }
  const parsed = Number.parseInt(value, 10);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }
  return parsed;
}

function parseBoolean(value: string | undefined): boolean {
  return value === '1' || value?.toLowerCase() === 'true';
}

export interface RuntimeConfig {
  disableShareCreate: boolean;
  maxPlainTextBytes: number;
  maxLinksPlaintextBytes: number;
  maxLinksCount: number;
  shareTtlSeconds: number;
  maxKeyGenerationAttempts: number;
  rateLimitCreatePerMin: number;
  rateLimitCreatePerDay: number;
  rateLimitReadPerMin: number;
  rateLimitLinksPerMin: number;
  linksTtlSeconds: number;
}

export function getRuntimeConfig(): RuntimeConfig {
  return {
    disableShareCreate: parseBoolean(process.env.DISABLE_SHARE_CREATE),
    maxPlainTextBytes: parsePositiveInt(process.env.MAX_PLAINTEXT_BYTES, 32_768),
    maxLinksPlaintextBytes: parsePositiveInt(process.env.MAX_LINKS_PLAINTEXT_BYTES, 32_768),
    maxLinksCount: parsePositiveInt(process.env.MAX_LINKS_COUNT, 200),
    shareTtlSeconds: parsePositiveInt(process.env.SHARE_TTL_SECONDS, 2_592_000),
    maxKeyGenerationAttempts: parsePositiveInt(process.env.MAX_KEY_GENERATION_ATTEMPTS, 5),
    rateLimitCreatePerMin: parsePositiveInt(process.env.RATE_LIMIT_CREATE_PER_MIN, 10),
    rateLimitCreatePerDay: parsePositiveInt(process.env.RATE_LIMIT_CREATE_PER_DAY, 200),
    rateLimitReadPerMin: parsePositiveInt(process.env.RATE_LIMIT_READ_PER_MIN, 60),
    rateLimitLinksPerMin: parsePositiveInt(process.env.RATE_LIMIT_LINKS_PER_MIN, 20),
    linksTtlSeconds: parsePositiveInt(process.env.LINKS_TTL_SECONDS, 2_592_000)
  };
}
