import type { EncryptedPayload, PasshashRecord } from '../../domain/entities/Shiori';

const ITERATION = 120_000;
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

export async function encryptPayload(plainText: string, password: string): Promise<string> {
  const salt = randomBytes(16);
  const iv = randomBytes(12);
  const key = await deriveAesKey(password, salt);

  const cipherBuffer = await getCrypto().subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    toBytes(plainText)
  );

  const payload: EncryptedPayload = {
    v: 1,
    s: bytesToBase64Url(salt),
    i: bytesToBase64Url(iv),
    c: bytesToBase64Url(new Uint8Array(cipherBuffer))
  };

  return bytesToBase64Url(toBytes(JSON.stringify(payload)));
}

export async function decryptPayload(encodedPayload: string, password: string): Promise<string> {
  let payload: Partial<EncryptedPayload>;
  try {
    payload = JSON.parse(toText(base64UrlToBytes(encodedPayload)));
  } catch {
    throw new Error('暗号化データの形式が不正です');
  }

  if (payload.v !== 1 || !payload.s || !payload.i || !payload.c) {
    throw new Error('暗号化データの形式が不正です');
  }

  const key = await deriveAesKey(password, base64UrlToBytes(payload.s));

  try {
    const plainBuffer = await getCrypto().subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: base64UrlToBytes(payload.i)
      },
      key,
      base64UrlToBytes(payload.c)
    );
    return toText(new Uint8Array(plainBuffer));
  } catch {
    throw new Error('復号に失敗しました（パスワード不一致またはデータ破損）');
  }
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

export function createShareId(): string {
  return bytesToBase64Url(randomBytes(9));
}
