import type { SharedPayloadRepository } from '../../domain/repositories/SharedPayloadRepository';

interface KvNamespaceLike {
  get(key: string): Promise<string | null>;
  put(
    key: string,
    value: string,
    options?: {
      expirationTtl?: number;
    }
  ): Promise<void>;
}

interface InMemoryRecord {
  value: string;
  expiresAt: number;
}

const MEMORY_STORE_KEY = '__shioriSharedPayloadStore__';
const CLOUDFLARE_WORKERS_MODULE = 'cloudflare:workers';
let cloudflareEnvPromise: Promise<Record<string, unknown> | null> | null = null;

function getMemoryStore(): Map<string, InMemoryRecord> {
  const scoped = globalThis as typeof globalThis & {
    [MEMORY_STORE_KEY]?: Map<string, InMemoryRecord>;
  };
  if (!scoped[MEMORY_STORE_KEY]) {
    scoped[MEMORY_STORE_KEY] = new Map<string, InMemoryRecord>();
  }
  return scoped[MEMORY_STORE_KEY];
}

function isKvNamespaceLike(value: unknown): value is KvNamespaceLike {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.get === 'function' && typeof candidate.put === 'function';
}

async function resolveCloudflareEnvBindings(): Promise<Record<string, unknown> | null> {
  if (!cloudflareEnvPromise) {
    cloudflareEnvPromise = import(
      /* @vite-ignore */ CLOUDFLARE_WORKERS_MODULE
    )
      .then((module) => {
        const candidate = (module as { env?: unknown }).env;
        if (candidate && typeof candidate === 'object') {
          return candidate as Record<string, unknown>;
        }
        return null;
      })
      .catch(() => null);
  }

  return cloudflareEnvPromise;
}

async function resolveKvBinding(context?: unknown): Promise<KvNamespaceLike | null> {
  const scoped = context as
    | {
        SHARE_KV?: unknown;
        env?: { SHARE_KV?: unknown };
        cloudflare?: { env?: { SHARE_KV?: unknown } };
      }
    | undefined;

  const candidates = [
    scoped?.SHARE_KV,
    scoped?.env?.SHARE_KV,
    scoped?.cloudflare?.env?.SHARE_KV,
    (globalThis as typeof globalThis & { SHARE_KV?: unknown }).SHARE_KV
  ];

  const cloudflareEnv = await resolveCloudflareEnvBindings();
  if (cloudflareEnv) {
    candidates.push(cloudflareEnv.SHARE_KV);
  }

  for (const candidate of candidates) {
    if (isKvNamespaceLike(candidate)) {
      return candidate;
    }
  }

  return null;
}

export class CloudflareKvSharedPayloadRepository implements SharedPayloadRepository {
  constructor(private readonly kv: KvNamespaceLike) {}

  async exists(key: string): Promise<boolean> {
    const value = await this.kv.get(key);
    return value !== null;
  }

  async put(key: string, encryptedPayload: string, ttlSeconds: number): Promise<void> {
    await this.kv.put(key, encryptedPayload, { expirationTtl: ttlSeconds });
  }

  async get(key: string): Promise<string | null> {
    return this.kv.get(key);
  }
}

export class InMemorySharedPayloadRepository implements SharedPayloadRepository {
  async exists(key: string): Promise<boolean> {
    const record = this.getRecord(key);
    return Boolean(record);
  }

  async put(key: string, encryptedPayload: string, ttlSeconds: number): Promise<void> {
    const expiresAt = Date.now() + Math.max(1, ttlSeconds) * 1000;
    getMemoryStore().set(key, {
      value: encryptedPayload,
      expiresAt
    });
  }

  async get(key: string): Promise<string | null> {
    return this.getRecord(key)?.value ?? null;
  }

  private getRecord(key: string): InMemoryRecord | null {
    const store = getMemoryStore();
    const record = store.get(key);
    if (!record) {
      return null;
    }

    if (Date.now() >= record.expiresAt) {
      store.delete(key);
      return null;
    }

    return record;
  }
}

export async function createSharedPayloadRepository(context?: unknown): Promise<SharedPayloadRepository> {
  const kv = await resolveKvBinding(context);
  if (kv) {
    return new CloudflareKvSharedPayloadRepository(kv);
  }
  return new InMemorySharedPayloadRepository();
}

export function resetSharedPayloadStoreForTest(): void {
  getMemoryStore().clear();
}
