import type {
  SharedEncryptedPayload,
  SharedPayloadRecord,
  SharedPayloadRepository
} from '../../domain/repositories/SharedPayloadRepository';

interface KvGetWithMetadataResultLike {
  value: unknown;
  metadata: unknown;
}

interface KvNamespaceLike {
  get(key: string, type?: unknown): Promise<unknown>;
  getWithMetadata?(key: string, type?: unknown): Promise<KvGetWithMetadataResultLike>;
  put(
    key: string,
    value: unknown,
    options?: {
      expirationTtl?: number;
      metadata?: Record<string, unknown>;
    }
  ): Promise<void>;
}

interface InMemoryRecord {
  value: SharedEncryptedPayload;
  expiresAt: number;
}

interface SharedPayloadMetadataLike {
  expiresAt?: unknown;
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

function resolveExpiresAt(metadata: unknown): number | null {
  if (!metadata || typeof metadata !== 'object') {
    return null;
  }
  const value = (metadata as SharedPayloadMetadataLike).expiresAt;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return null;
  }
  return value;
}

function toArrayBuffer(value: unknown): ArrayBuffer | null {
  if (!value) {
    return null;
  }
  if (value instanceof ArrayBuffer) {
    return value;
  }
  if (ArrayBuffer.isView(value)) {
    // Copy to detach from the original backing buffer slice.
    return value.buffer.slice(value.byteOffset, value.byteOffset + value.byteLength);
  }
  return null;
}

function looksLikePackedCipher(bytes: Uint8Array): boolean {
  if (bytes.length < 29) {
    return false;
  }
  return bytes[0] === 0x04 || bytes[0] === 0x05 || bytes[0] === 0x06;
}

async function kvGetArrayBuffer(kv: KvNamespaceLike, key: string): Promise<ArrayBuffer | null> {
  const getter = kv.get as unknown as (...args: unknown[]) => Promise<unknown>;
  let lastError: unknown = null;

  for (const arg of ['arrayBuffer', { type: 'arrayBuffer' }]) {
    try {
      const value = await getter.call(kv, key, arg);
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

async function kvGetText(kv: KvNamespaceLike, key: string): Promise<string | null> {
  const getter = kv.get as unknown as (...args: unknown[]) => Promise<unknown>;
  let lastError: unknown = null;

  for (const arg of ['text', { type: 'text' }, undefined]) {
    try {
      const value = arg === undefined ? await getter.call(kv, key) : await getter.call(kv, key, arg);
      if (value === null || value === undefined) {
        return null;
      }
      if (typeof value === 'string') {
        return value;
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

async function kvGetWithMetadataArrayBuffer(
  kv: KvNamespaceLike,
  key: string
): Promise<{ value: ArrayBuffer | null; metadata: unknown } | null> {
  if (typeof kv.getWithMetadata !== 'function') {
    return null;
  }

  const getter = kv.getWithMetadata as unknown as (...args: unknown[]) => Promise<unknown>;
  let lastError: unknown = null;

  for (const arg of ['arrayBuffer', { type: 'arrayBuffer' }]) {
    try {
      const record = (await getter.call(kv, key, arg)) as KvGetWithMetadataResultLike;
      if (!record) {
        return null;
      }
      return {
        value: toArrayBuffer(record.value),
        metadata: record.metadata
      };
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }
  return null;
}

async function kvGetWithMetadataText(
  kv: KvNamespaceLike,
  key: string
): Promise<{ value: string | null; metadata: unknown } | null> {
  if (typeof kv.getWithMetadata !== 'function') {
    return null;
  }

  const getter = kv.getWithMetadata as unknown as (...args: unknown[]) => Promise<unknown>;
  let lastError: unknown = null;

  for (const arg of ['text', { type: 'text' }, undefined]) {
    try {
      const record =
        arg === undefined
          ? ((await getter.call(kv, key)) as KvGetWithMetadataResultLike)
          : ((await getter.call(kv, key, arg)) as KvGetWithMetadataResultLike);
      if (!record) {
        return null;
      }
      return {
        value: typeof record.value === 'string' ? record.value : null,
        metadata: record.metadata
      };
    } catch (error) {
      lastError = error;
    }
  }

  if (lastError) {
    throw lastError;
  }
  return null;
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
    const bytes = await kvGetArrayBuffer(this.kv, key);
    if (bytes !== null) {
      return true;
    }
    const value = await kvGetText(this.kv, key);
    return value !== null;
  }

  async put(
    key: string,
    encryptedPayload: SharedEncryptedPayload,
    ttlSeconds: number,
    expiresAt: number
  ): Promise<void> {
    const value =
      typeof encryptedPayload === 'string'
        ? encryptedPayload
        : encryptedPayload.byteOffset === 0 && encryptedPayload.byteLength === encryptedPayload.buffer.byteLength
          ? encryptedPayload.buffer
          : encryptedPayload;

    await this.kv.put(key, value, {
      expirationTtl: ttlSeconds,
      metadata: { expiresAt }
    });
  }

  async get(key: string): Promise<SharedPayloadRecord | null> {
    const bytesRecord = await kvGetWithMetadataArrayBuffer(this.kv, key);
    if (bytesRecord) {
      if (bytesRecord.value === null) {
        return null;
      }
      const bytes = new Uint8Array(bytesRecord.value);
      if (looksLikePackedCipher(bytes)) {
        return {
          encryptedPayload: bytes,
          expiresAt: resolveExpiresAt(bytesRecord.metadata)
        };
      }
      // Likely legacy text payload; re-fetch as text to avoid corrupting base2048 content.
      const textRecord = await kvGetWithMetadataText(this.kv, key);
      if (!textRecord?.value) {
        return null;
      }
      return {
        encryptedPayload: textRecord.value,
        expiresAt: resolveExpiresAt(textRecord.metadata)
      };
    }

    const buffer = await kvGetArrayBuffer(this.kv, key);
    if (buffer) {
      const bytes = new Uint8Array(buffer);
      if (looksLikePackedCipher(bytes)) {
        return { encryptedPayload: bytes, expiresAt: null };
      }
    }

    const value = await kvGetText(this.kv, key);
    if (!value) {
      return null;
    }
    return {
      encryptedPayload: value,
      expiresAt: null
    };
  }
}

export class InMemorySharedPayloadRepository implements SharedPayloadRepository {
  async exists(key: string): Promise<boolean> {
    const record = this.getRecord(key);
    return Boolean(record);
  }

  async put(
    key: string,
    encryptedPayload: SharedEncryptedPayload,
    _ttlSeconds: number,
    expiresAt: number
  ): Promise<void> {
    getMemoryStore().set(key, {
      value: encryptedPayload,
      expiresAt
    });
  }

  async get(key: string): Promise<SharedPayloadRecord | null> {
    const record = this.getRecord(key);
    if (!record) {
      return null;
    }
    return {
      encryptedPayload: record.value,
      expiresAt: record.expiresAt
    };
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
