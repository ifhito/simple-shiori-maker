/** @vitest-environment node */

import { brotliCompressSync, constants, gzipSync } from 'node:zlib';
import { describe, expect, it } from 'vitest';
import { handleDecryptRequest } from './decrypt';
import { handleEncryptRequest } from './encrypt';

const ITERATION = 120_000;

const validJson = JSON.stringify({
  title: '箱根1泊2日しおり',
  destination: '箱根',
  startDateTime: '2026-03-20T09:00',
  endDateTime: '2026-03-21T18:00',
  days: [
    {
      date: '2026-03-20',
      label: 'DAY 1',
      items: [
        {
          time: '09:00',
          title: '新宿駅集合',
          description: 'ロマンスカーで移動',
          place: '新宿駅'
        }
      ]
    }
  ]
});

function toBytes(text: string): Uint8Array {
  return new TextEncoder().encode(text);
}

function bytesToBase64Url(bytes: Uint8Array): string {
  const base64 = Buffer.from(bytes).toString('base64');
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
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

async function createLegacyPayload(version: 1 | 2, plainText: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveLegacyAesKey(password, salt);
  const plainBytes = toBytes(plainText);
  const source = version === 2 ? new Uint8Array(gzipSync(Buffer.from(plainBytes))) : plainBytes;

  const cipherBuffer = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv
    },
    key,
    source
  );

  return bytesToBase64Url(
    toBytes(
      JSON.stringify({
        v: version,
        ...(version === 2 ? { z: 'gzip' } : {}),
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

  return bytesToBase64Url(
    toBytes(
      JSON.stringify({
        v: 3,
        z: 'gzip',
        s: bytesToBase64Url(salt),
        i: bytesToBase64Url(iv),
        c: bytesToBase64Url(new Uint8Array(cipherBuffer))
      })
    )
  );
}

async function createLegacyBase64UrlV4Payload(plainText: string, password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveLegacyAesKey(password, salt);
  const compressed = new Uint8Array(
    brotliCompressSync(Buffer.from(toBytes(plainText)), {
      params: { [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY }
    })
  );

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    compressed
  );

  const ciphertext = new Uint8Array(cipherBuffer);
  const packed = new Uint8Array(1 + 16 + 12 + ciphertext.length);
  packed[0] = 0x04;
  packed.set(salt, 1);
  packed.set(iv, 17);
  packed.set(ciphertext, 29);

  return bytesToBase64Url(packed);
}

async function createEncryptedPayload() {
  const encryptRequest = new Request('http://localhost/api/encrypt', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ plainText: validJson, password: 'secret-123' })
  });
  const encryptResponse = await handleEncryptRequest(encryptRequest);
  return encryptResponse.json() as Promise<{ d: string }>;
}

describe('POST /api/decrypt', () => {
  it('decrypts and returns plain text', async () => {
    const encrypted = await createEncryptedPayload();

    const request = new Request('http://localhost/api/decrypt', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ d: encrypted.d, password: 'secret-123' })
    });

    const response = await handleDecryptRequest(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.plainText).toBe(validJson);
  });

  it('returns 400 for legacy v1 payload', async () => {
    const legacy = await createLegacyPayload(1, validJson, 'secret-123');
    const request = new Request('http://localhost/api/decrypt', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ d: legacy, password: 'secret-123' })
    });

    const response = await handleDecryptRequest(request);
    expect(response.status).toBe(400);
  });

  it('returns 400 for legacy v2 payload', async () => {
    const legacy = await createLegacyPayload(2, validJson, 'secret-123');
    const request = new Request('http://localhost/api/decrypt', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ d: legacy, password: 'secret-123' })
    });

    const response = await handleDecryptRequest(request);
    expect(response.status).toBe(400);
  });

  it('returns 400 for wrong password', async () => {
    const encrypted = await createEncryptedPayload();

    const request = new Request('http://localhost/api/decrypt', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ d: encrypted.d, password: 'wrong' })
    });

    const response = await handleDecryptRequest(request);
    expect(response.status).toBe(400);
  });

  it('decrypts legacy v3 payload (backward compatibility)', async () => {
    const compactJson = JSON.stringify({
      cv: 1,
      t: '箱根1泊2日しおり',
      d: '箱根',
      s: '2026-03-20T09:00',
      e: '2026-03-21T18:00',
      y: [['2026-03-20', 'DAY 1', [['09:00', '新宿駅集合', 'ロマンスカーで移動', '新宿駅']]]]
    });
    const legacy = await createLegacyV3Payload(compactJson, 'secret-123');
    const request = new Request('http://localhost/api/decrypt', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ d: legacy, password: 'secret-123' })
    });

    const response = await handleDecryptRequest(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.plainText).toBe(validJson);
  });

  it('decrypts legacy base64url v4 payload (backward compatibility)', async () => {
    const compactJson = JSON.stringify({
      cv: 1,
      t: '箱根1泊2日しおり',
      d: '箱根',
      s: '2026-03-20T09:00',
      e: '2026-03-21T18:00',
      y: [['2026-03-20', 'DAY 1', [['09:00', '新宿駅集合', 'ロマンスカーで移動', '新宿駅']]]]
    });
    const legacy = await createLegacyBase64UrlV4Payload(compactJson, 'secret-123');

    expect(legacy.charCodeAt(0)).toBeLessThan(128);

    const request = new Request('http://localhost/api/decrypt', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ d: legacy, password: 'secret-123' })
    });

    const response = await handleDecryptRequest(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.plainText).toBe(validJson);
  });
});
