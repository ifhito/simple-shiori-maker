import type { PasshashRecord } from '../../domain/entities/Shiori';
import type { PasshashRepository } from '../../domain/repositories/PasshashRepository';

const PREFIX = 'shiori:passhash:';

function toKey(id: string): string {
  return `${PREFIX}${id}`;
}

function getCrypto(): Crypto {
  const instance = globalThis.crypto;
  if (!instance?.subtle) {
    throw new Error('Web Crypto API が利用できません');
  }
  return instance;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const raw = typeof btoa === 'function' ? btoa(String.fromCharCode(...bytes)) : Buffer.from(bytes).toString('base64');
  return raw.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

function base64UrlToBytes(value: string): Uint8Array {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/');
  const base64 = padded + '='.repeat((4 - (padded.length % 4)) % 4);
  const binary = typeof atob === 'function' ? atob(base64) : Buffer.from(base64, 'base64').toString('binary');
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    out[i] = binary.charCodeAt(i);
  }
  return out;
}

async function deriveHash(password: string, record: PasshashRecord): Promise<string> {
  const subtle = getCrypto().subtle;
  const key = await subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits']
  );

  const bits = await subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt: base64UrlToBytes(record.salt),
      iterations: record.iter,
      hash: 'SHA-256'
    },
    key,
    256
  );

  return bytesToBase64Url(new Uint8Array(bits));
}

export class LocalPasshashStorage implements PasshashRepository {
  save(id: string, record: PasshashRecord): void {
    if (typeof localStorage === 'undefined') {
      return;
    }
    localStorage.setItem(toKey(id), JSON.stringify(record));
  }

  load(id: string): PasshashRecord | null {
    if (typeof localStorage === 'undefined') {
      return null;
    }

    const raw = localStorage.getItem(toKey(id));
    if (!raw) {
      return null;
    }

    try {
      const parsed = JSON.parse(raw) as Partial<PasshashRecord>;
      if (
        parsed.v === 1 &&
        typeof parsed.salt === 'string' &&
        typeof parsed.hash === 'string' &&
        typeof parsed.iter === 'number'
      ) {
        return {
          v: 1,
          salt: parsed.salt,
          hash: parsed.hash,
          iter: parsed.iter
        };
      }
      return null;
    } catch {
      return null;
    }
  }
}

export async function verifyPasswordAgainstRecord(
  password: string,
  record: PasshashRecord
): Promise<boolean> {
  const actual = await deriveHash(password, record);
  return actual === record.hash;
}
