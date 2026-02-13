import type { UserLinkListRepository } from '../../domain/repositories/UserLinkListRepository';

interface KvNamespaceLike {
  get(key: string, type?: unknown): Promise<unknown>;
  put(
    key: string,
    value: unknown,
    options?: { expirationTtl?: number }
  ): Promise<void>;
}

function isKvNamespaceLike(value: unknown): value is KvNamespaceLike {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const candidate = value as Record<string, unknown>;
  return typeof candidate.get === 'function' && typeof candidate.put === 'function';
}

function toArrayBuffer(value: unknown): ArrayBuffer | null {
  if (!value) {
    return null;
  }
  if (value instanceof ArrayBuffer) {
    return value;
  }
  if (ArrayBuffer.isView(value)) {
    return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
  }
  return null;
}

async function kvGetArrayBuffer(kv: KvNamespaceLike, key: string): Promise<ArrayBuffer | null> {
  const getter = kv.get as unknown as (...args: unknown[]) => Promise<unknown>;
  let lastError: unknown = null;

  for (const arg of ['arrayBuffer', { type: 'arrayBuffer' }]) {
    try {
      const value = await getter(key, arg);
      if (value === null || value === undefined) {
        return null;
      }
      const buffer = toArrayBuffer(value);
      if (buffer) {
        return buffer;
      }
      return null;
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }
  return null;
}

const CLOUDFLARE_WORKERS_MODULE = 'cloudflare:workers';
let cloudflareEnvPromise: Promise<Record<string, unknown> | null> | null = null;

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

export async function resolveKvBinding(context?: unknown): Promise<KvNamespaceLike | null> {
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

export class CloudflareKvUserLinkListRepository implements UserLinkListRepository {
  constructor(private readonly kv: KvNamespaceLike) {}

  async get(hashedKey: string): Promise<Uint8Array | null> {
    const buffer = await kvGetArrayBuffer(this.kv, hashedKey);
    if (!buffer) {
      return null;
    }
    return new Uint8Array(buffer);
  }

  async put(hashedKey: string, encryptedPayload: Uint8Array, ttlSeconds: number): Promise<void> {
    const value =
      encryptedPayload.byteOffset === 0 && encryptedPayload.byteLength === encryptedPayload.buffer.byteLength
        ? encryptedPayload.buffer
        : encryptedPayload;

    await this.kv.put(hashedKey, value, { expirationTtl: ttlSeconds });
  }
}

interface InMemoryRecord {
  value: Uint8Array;
  expiresAt: number;
}

const MEMORY_STORE_KEY = '__shioriUserLinkListStore__';

function getMemoryStore(): Map<string, InMemoryRecord> {
  const scoped = globalThis as typeof globalThis & {
    [MEMORY_STORE_KEY]?: Map<string, InMemoryRecord>;
  };
  if (!scoped[MEMORY_STORE_KEY]) {
    scoped[MEMORY_STORE_KEY] = new Map<string, InMemoryRecord>();
  }
  return scoped[MEMORY_STORE_KEY];
}

export class InMemoryUserLinkListRepository implements UserLinkListRepository {
  async get(hashedKey: string): Promise<Uint8Array | null> {
    const store = getMemoryStore();
    const record = store.get(hashedKey);
    if (!record) {
      return null;
    }
    if (Date.now() >= record.expiresAt) {
      store.delete(hashedKey);
      return null;
    }
    return record.value;
  }

  async put(hashedKey: string, encryptedPayload: Uint8Array, ttlSeconds: number): Promise<void> {
    getMemoryStore().set(hashedKey, {
      value: encryptedPayload,
      expiresAt: Date.now() + ttlSeconds * 1000
    });
  }
}

export async function createUserLinkListRepository(context?: unknown): Promise<UserLinkListRepository> {
  const kv = await resolveKvBinding(context);
  if (kv) {
    return new CloudflareKvUserLinkListRepository(kv);
  }
  return new InMemoryUserLinkListRepository();
}

export function resetUserLinkListStoreForTest(): void {
  getMemoryStore().clear();
}
