/** @vitest-environment node */

import { brotliCompressSync, gzipSync } from 'node:zlib';
import { decode as base2048Decode, encode as base2048Encode } from 'base2048';
import { describe, expect, it } from 'vitest';
import type { EncryptedPayload } from '../../domain/entities/Shiori';
import {
  createPasswordHashRecord,
  decryptPayload,
  decryptPayloadBytes,
  encryptPayload,
  encryptPayloadBytes,
  verifyPasswordHashRecord
} from './serverCrypto';

const ITERATION = 100_000;

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

function decodeEnvelope(encodedPayload: string): Record<string, unknown> {
  return JSON.parse(toText(base64UrlToBytes(encodedPayload))) as Record<string, unknown>;
}

async function deriveLegacyAesKey(password: string, salt: Uint8Array): Promise<CryptoKey> {
  const baseKey = await crypto.subtle.importKey('raw', toBytes(password), { name: 'PBKDF2' }, false, [
    'deriveBits',
    'deriveKey'
  ]);
  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt,
      iterations: ITERATION,
      hash: 'SHA-256'
    },
    baseKey,
    {
      name: 'AES-GCM',
      length: 256
    },
    false,
    ['encrypt', 'decrypt']
  );
}

async function createLegacyV1Payload(plainText: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveLegacyAesKey(password, salt);

  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    toBytes(plainText)
  );

  return bytesToBase64Url(
    toBytes(
      JSON.stringify({
        v: 1,
        s: bytesToBase64Url(salt),
        i: bytesToBase64Url(iv),
        c: bytesToBase64Url(new Uint8Array(cipherBuffer))
      })
    )
  );
}

async function createLegacyV2Payload(plainText: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveLegacyAesKey(password, salt);
  const compressed = new Uint8Array(gzipSync(Buffer.from(toBytes(plainText))));

  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    compressed
  );

  return bytesToBase64Url(
    toBytes(
      JSON.stringify({
        v: 2,
        z: 'gzip',
        s: bytesToBase64Url(salt),
        i: bytesToBase64Url(iv),
        c: bytesToBase64Url(new Uint8Array(cipherBuffer))
      })
    )
  );
}

async function createLegacyV3Payload(plainText: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveLegacyAesKey(password, salt);
  const compressed = new Uint8Array(gzipSync(Buffer.from(toBytes(plainText))));

  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    compressed
  );

  const payload: EncryptedPayload = {
    v: 3,
    z: 'gzip',
    s: bytesToBase64Url(salt),
    i: bytesToBase64Url(iv),
    c: bytesToBase64Url(new Uint8Array(cipherBuffer))
  };

  return bytesToBase64Url(toBytes(JSON.stringify(payload)));
}

async function createLegacyV4Payload(plainText: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveLegacyAesKey(password, salt);
  const compressed = new Uint8Array(brotliCompressSync(Buffer.from(toBytes(plainText))));

  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    compressed
  );

  const ciphertext = new Uint8Array(cipherBuffer);
  const packed = new Uint8Array(1 + 16 + 12 + ciphertext.length);
  packed[0] = 0x04;
  packed.set(salt, 1);
  packed.set(iv, 17);
  packed.set(ciphertext, 29);
  return base2048Encode(packed);
}

describe('serverCrypto', () => {
  it('encrypts and decrypts data', async () => {
    const source = JSON.stringify({ hello: 'world' });
    const encrypted = await encryptPayload(source, 'secret-123');
    const decrypted = await decryptPayload(encrypted, 'secret-123');

    expect(decrypted).toBe(source);
  });

  it('encrypts and decrypts brotli-compressed v6 binary payload bytes', async () => {
    const source = JSON.stringify({ hello: 'v6-bytes' });
    const encrypted = await encryptPayloadBytes(source, 'secret-123');

    expect(encrypted[0]).toBe(0x06);

    const decrypted = await decryptPayloadBytes(encrypted, 'secret-123');
    expect(decrypted).toBe(source);
  });

  it('fails decryption on wrong password', async () => {
    const source = JSON.stringify({ hello: 'world' });
    const encrypted = await encryptPayload(source, 'secret-123');

    await expect(decryptPayload(encrypted, 'wrong-pass')).rejects.toThrow();
  });

  it('emits base2048-encoded v5 binary format with version byte 0x05', async () => {
    const source = JSON.stringify({ hello: 'world' });
    const encrypted = await encryptPayload(source, 'secret-123');

    expect(/^[A-Za-z0-9_-]+$/.test(encrypted)).toBe(false);

    const raw = base2048Decode(encrypted);
    expect(raw[0]).toBe(0x05);
    expect(raw.length).toBeGreaterThanOrEqual(29);
  });

  it('decrypts legacy base64url v4 payload (backward compatibility)', async () => {
    const source = JSON.stringify({ hello: 'v4-base64url-compat' });
    const encrypted = await createLegacyV4Payload(source, 'secret-123');

    const raw = base2048Decode(encrypted);
    const legacyBase64Url = bytesToBase64Url(raw);

    const decrypted = await decryptPayload(legacyBase64Url, 'secret-123');
    expect(decrypted).toBe(source);
  });

  it('decrypts legacy v3 envelopes (backward compatibility)', async () => {
    const source = JSON.stringify({ hello: 'v3-compat' });
    const encrypted = await createLegacyV3Payload(source, 'secret-123');
    const decrypted = await decryptPayload(encrypted, 'secret-123');

    expect(decrypted).toBe(source);
  });

  it('rejects legacy v1 envelopes', async () => {
    const source = JSON.stringify({ hello: 'legacy' });
    const encrypted = await createLegacyV1Payload(source, 'secret-123');

    await expect(decryptPayload(encrypted, 'secret-123')).rejects.toThrow('暗号化データの形式が不正です');
  });

  it('rejects legacy v2 envelopes', async () => {
    const source = JSON.stringify({ hello: 'legacy-v2' });
    const encrypted = await createLegacyV2Payload(source, 'secret-123');

    await expect(decryptPayload(encrypted, 'secret-123')).rejects.toThrow('暗号化データの形式が不正です');
  });

  it('fails for invalid v3 compression metadata', async () => {
    const source = JSON.stringify({ hello: 'world' });
    const encrypted = await createLegacyV3Payload(source, 'secret-123');
    const envelope = decodeEnvelope(encrypted);
    envelope.z = 'unsupported';
    const tampered = bytesToBase64Url(toBytes(JSON.stringify(envelope)));

    await expect(decryptPayload(tampered, 'secret-123')).rejects.toThrow('暗号化データの形式が不正です');
  });

  it('base2048 output is shorter than base64url for same binary', async () => {
    const source = JSON.stringify({ hello: 'world', data: 'あいうえおかきくけこ'.repeat(100) });
    const base2048Payload = await encryptPayload(source, 'secret-123');

    const raw = base2048Decode(base2048Payload);
    const base64UrlPayload = bytesToBase64Url(raw);

    expect(base2048Payload.length).toBeLessThan(base64UrlPayload.length);
  });

  it('fails for corrupted payload', async () => {
    await expect(decryptPayload('broken_payload', 'secret-123')).rejects.toThrow();
  });

  it('creates and verifies passhash records', async () => {
    const record = await createPasswordHashRecord('secret-123');

    await expect(verifyPasswordHashRecord('secret-123', record)).resolves.toBe(true);
    await expect(verifyPasswordHashRecord('not-match', record)).resolves.toBe(false);
  });
});
