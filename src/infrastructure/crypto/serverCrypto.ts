import { decode as base2048Decode, encode as base2048Encode } from 'base2048';
import type { EncryptedPayload, PasshashRecord } from '../../domain/entities/Shiori';

// Cloudflare Workers currently caps PBKDF2 iterations at 100,000.
const ITERATION = 100_000;
const KEY_LENGTH = 256;

function getCrypto(): Crypto {
  const instance = globalThis.crypto;
  if (!instance?.subtle) {
    throw new Error('Web Crypto API が利用できません');
  }
  return instance;
}

function toBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function toText(bytes: Uint8Array): string {
  return new TextDecoder().decode(bytes);
}

type ZlibModule = typeof import('node:zlib');
let zlibModulePromise: Promise<ZlibModule> | null = null;

async function getZlibModule(): Promise<ZlibModule> {
  if (!zlibModulePromise) {
    zlibModulePromise = import('node:zlib');
  }
  return zlibModulePromise;
}

async function brotliCompress(bytes: Uint8Array): Promise<Uint8Array> {
  const zlib = await getZlibModule();
  return new Uint8Array(zlib.brotliCompressSync(Buffer.from(bytes)));
}

async function brotliDecompress(bytes: Uint8Array): Promise<Uint8Array> {
  const zlib = await getZlibModule();
  return new Uint8Array(zlib.brotliDecompressSync(Buffer.from(bytes)));
}

async function gunzipBytes(bytes: Uint8Array): Promise<Uint8Array> {
  const zlib = await getZlibModule();
  return new Uint8Array(zlib.gunzipSync(Buffer.from(bytes)));
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const base64 = Buffer.from(bytes).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const base64 = padded + '='.repeat((4 - (padded.length % 4)) % 4);
  return new Uint8Array(Buffer.from(base64, 'base64'));
}

function randomBytes(length: number): Uint8Array {
  const bytes = new Uint8Array(length);
  getCrypto().getRandomValues(bytes);
  return bytes;
}

async function importPasswordKey(password: string): Promise<CryptoKey> {
  return getCrypto().subtle.importKey('raw', toBytes(password), { name: 'PBKDF2' }, false, [
    'deriveBits',
    'deriveKey'
  ]);
}

async function deriveAesKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await importPasswordKey(password);
  return getCrypto().subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATION,
      hash: 'SHA-256'
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: KEY_LENGTH
    },
    false,
    ['encrypt', 'decrypt']
  );
}

async function deriveHash(password: string, salt: Uint8Array, iter: number): Promise<Uint8Array> {
  const baseKey = await importPasswordKey(password);
  const bits = await getCrypto().subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: iter,
      hash: 'SHA-256'
    },
    baseKey,
    KEY_LENGTH
  );
  return new Uint8Array(bits);
}

export type EncryptCompression = 'none' | 'brotli';

export async function encryptPayloadBytes(
  plainText: string,
  password: string,
  options?: { compression?: EncryptCompression }
): Promise<Uint8Array> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveAesKey(password, salt);
  const compression = options?.compression ?? 'brotli';
  const plainBytes =
    compression === 'brotli' ? await brotliCompress(toBytes(plainText)) : toBytes(plainText);

  const cipherBuffer = await getCrypto().subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    plainBytes
  );

  const ciphertext = new Uint8Array(cipherBuffer);
  const packed = new Uint8Array(1 + 16 + 12 + ciphertext.length);
  packed[0] = compression === 'brotli' ? 0x06 : 0x05;
  packed.set(salt, 1);
  packed.set(iv, 17);
  packed.set(ciphertext, 29);

  return packed;
}

export async function encryptPayload(plainText: string, password: string): Promise<string> {
  const packed = await encryptPayloadBytes(plainText, password, { compression: 'none' });
  return base2048Encode(packed);
}

async function decryptV3(raw: Uint8Array, password: string): Promise<string> {
  let payload: Partial<EncryptedPayload>;
  try {
    payload = JSON.parse(toText(raw));
  } catch {
    throw new Error('暗号化データの形式が不正です');
  }

  if (
    !payload ||
    payload.v !== 3 ||
    payload.z !== 'gzip' ||
    typeof payload.s !== 'string' ||
    typeof payload.i !== 'string' ||
    typeof payload.c !== 'string'
  ) {
    throw new Error('暗号化データの形式が不正です');
  }

  const key = await deriveAesKey(password, base64UrlToBytes(payload.s));

  let decryptedBytes: Uint8Array;
  try {
    const decryptedBuffer = await getCrypto().subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: base64UrlToBytes(payload.i)
      },
      key,
      base64UrlToBytes(payload.c)
    );
    decryptedBytes = new Uint8Array(decryptedBuffer);
  } catch {
    throw new Error('復号に失敗しました（パスワード不一致またはデータ破損）');
  }

  try {
    return toText(await gunzipBytes(decryptedBytes));
  } catch {
    throw new Error('暗号化データの形式が不正です');
  }
}

async function decryptV4(raw: Uint8Array, password: string): Promise<string> {
  if (raw.length < 29) {
    throw new Error('暗号化データの形式が不正です');
  }

  const salt = raw.slice(1, 17);
  const iv = raw.slice(17, 29);
  const ciphertext = raw.slice(29);

  const key = await deriveAesKey(password, salt);

  let decryptedBytes: Uint8Array;
  try {
    const decryptedBuffer = await getCrypto().subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      ciphertext
    );
    decryptedBytes = new Uint8Array(decryptedBuffer);
  } catch {
    throw new Error('復号に失敗しました（パスワード不一致またはデータ破損）');
  }

  try {
    return toText(await brotliDecompress(decryptedBytes));
  } catch {
    throw new Error('暗号化データの形式が不正です');
  }
}

async function decryptV5(raw: Uint8Array, password: string): Promise<string> {
  if (raw.length < 29) {
    throw new Error('暗号化データの形式が不正です');
  }

  const salt = raw.slice(1, 17);
  const iv = raw.slice(17, 29);
  const ciphertext = raw.slice(29);

  const key = await deriveAesKey(password, salt);

  try {
    const decryptedBuffer = await getCrypto().subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      ciphertext
    );
    return toText(new Uint8Array(decryptedBuffer));
  } catch {
    throw new Error('復号に失敗しました（パスワード不一致またはデータ破損）');
  }
}

async function decryptV6(raw: Uint8Array, password: string): Promise<string> {
  if (raw.length < 29) {
    throw new Error('暗号化データの形式が不正です');
  }

  const salt = raw.slice(1, 17);
  const iv = raw.slice(17, 29);
  const ciphertext = raw.slice(29);

  const key = await deriveAesKey(password, salt);

  let decryptedBytes: Uint8Array;
  try {
    const decryptedBuffer = await getCrypto().subtle.decrypt(
      {
        name: 'AES-GCM',
        iv
      },
      key,
      ciphertext
    );
    decryptedBytes = new Uint8Array(decryptedBuffer);
  } catch {
    throw new Error('復号に失敗しました（パスワード不一致またはデータ破損）');
  }

  try {
    return toText(await brotliDecompress(decryptedBytes));
  } catch {
    throw new Error('暗号化データの形式が不正です');
  }
}

export async function decryptPayloadBytes(raw: Uint8Array, password: string): Promise<string> {
  if (raw.length === 0) {
    throw new Error('暗号化データの形式が不正です');
  }

  if (raw[0] === 0x06) {
    return decryptV6(raw, password);
  }

  if (raw[0] === 0x05) {
    return decryptV5(raw, password);
  }

  if (raw[0] === 0x04) {
    return decryptV4(raw, password);
  }

  if (raw[0] === 0x7b) {
    return decryptV3(raw, password);
  }

  throw new Error('暗号化データの形式が不正です');
}

export async function decryptPayload(encodedPayload: string, password: string): Promise<string> {
  const isBase64Url = /^[A-Za-z0-9_-]+$/.test(encodedPayload);
  const raw = isBase64Url ? base64UrlToBytes(encodedPayload) : base2048Decode(encodedPayload);

  return decryptPayloadBytes(raw, password);
}

export async function createPasswordHashRecord(password: string): Promise<PasshashRecord> {
  const salt = randomBytes(16);
  const hash = await deriveHash(password, salt, ITERATION);

  return {
    v: 1,
    salt: bytesToBase64Url(salt),
    hash: bytesToBase64Url(hash),
    iter: ITERATION
  };
}

export async function verifyPasswordHashRecord(
  password: string,
  record: PasshashRecord
): Promise<boolean> {
  const derived = await deriveHash(password, base64UrlToBytes(record.salt), record.iter);
  const expected = base64UrlToBytes(record.hash);

  if (derived.length !== expected.length) {
    return false;
  }

  let mismatch = 0;
  for (let i = 0; i < derived.length; i += 1) {
    mismatch |= derived[i] ^ expected[i];
  }

  return mismatch === 0;
}

export function createShareKey(): string {
  return bytesToBase64Url(randomBytes(9));
}

export const createShareId = createShareKey;
