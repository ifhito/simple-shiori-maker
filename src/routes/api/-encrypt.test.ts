/** @vitest-environment node */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRateLimitStoreForTest } from '../../infrastructure/security/rateLimit';
import { resetSharedPayloadStoreForTest } from '../../infrastructure/storage/sharedPayloadStorage';
import { handleDecryptRequest } from './decrypt';
import { handleEncryptRequest } from './encrypt';

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

function createEncryptRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {}
): Request {
  return new Request('http://localhost/api/encrypt', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
}

describe('POST /api/encrypt', () => {
  const fixedNow = 1_700_000_000_000;

  beforeEach(() => {
    resetSharedPayloadStoreForTest();
    resetRateLimitStoreForTest();
    delete process.env.MAX_PLAINTEXT_BYTES;
    delete process.env.DISABLE_SHARE_CREATE;
    delete process.env.RATE_LIMIT_CREATE_PER_MIN;
    delete process.env.RATE_LIMIT_CREATE_PER_DAY;
    delete process.env.RATE_LIMIT_READ_PER_MIN;
    delete process.env.SHARE_TTL_SECONDS;
    vi.spyOn(Date, 'now').mockReturnValue(fixedNow);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('returns key and passhash, and decrypt API can resolve key', async () => {
    const request = createEncryptRequest({ plainText: validJson, password: 'secret-123' });
    const response = await handleEncryptRequest(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.key).toBeTypeOf('string');
    expect(body.key.length).toBeGreaterThanOrEqual(8);
    expect(body.d).toBeUndefined();
    expect(body.passhash).toEqual(
      expect.objectContaining({
        v: 1,
        salt: expect.any(String),
        hash: expect.any(String),
        iter: 100000
      })
    );
    expect(body.expiresAt).toBe(fixedNow + 2_592_000_000);

    const decryptRequest = new Request('http://localhost/api/decrypt', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ key: body.key, password: 'secret-123' })
    });
    const decryptResponse = await handleDecryptRequest(decryptRequest);
    const decryptBody = await decryptResponse.json();

    expect(decryptResponse.status).toBe(200);
    expect(decryptBody.plainText).toBe(validJson);
    expect(decryptBody.expiresAt).toBe(fixedNow + 2_592_000_000);
  });

  it('returns 400 for invalid structured JSON', async () => {
    const request = createEncryptRequest({ plainText: '{"title":"broken"}', password: 'secret-123' });
    const response = await handleEncryptRequest(request);
    expect(response.status).toBe(400);
  });

  it('returns 413 when plainText is too large', async () => {
    process.env.MAX_PLAINTEXT_BYTES = '10';
    const request = createEncryptRequest({ plainText: validJson, password: 'secret-123' });
    const response = await handleEncryptRequest(request);

    expect(response.status).toBe(413);
  });

  it('returns 429 when create rate limit is exceeded', async () => {
    process.env.RATE_LIMIT_CREATE_PER_MIN = '1';
    process.env.RATE_LIMIT_CREATE_PER_DAY = '100';

    const headers = { 'cf-connecting-ip': '203.0.113.10' };
    const first = await handleEncryptRequest(
      createEncryptRequest({ plainText: validJson, password: 'secret-123' }, headers)
    );
    const second = await handleEncryptRequest(
      createEncryptRequest({ plainText: validJson, password: 'secret-123' }, headers)
    );

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
  });

  it('returns 503 when share creation is disabled', async () => {
    process.env.DISABLE_SHARE_CREATE = 'true';
    const response = await handleEncryptRequest(
      createEncryptRequest({ plainText: validJson, password: 'secret-123' })
    );

    expect(response.status).toBe(503);
  });

  it('overwrites existing key when key is provided in request body', async () => {
    // First, create a link to get an initial key
    const first = await handleEncryptRequest(
      createEncryptRequest({ plainText: validJson, password: 'pass-1' })
    );
    const { key: existingKey } = (await first.json()) as { key: string };

    resetRateLimitStoreForTest();

    // Update with same key but new password
    const update = await handleEncryptRequest(
      createEncryptRequest({
        plainText: validJson,
        password: 'pass-2',
        key: existingKey,
        currentPassword: 'pass-1'
      })
    );
    const updateBody = (await update.json()) as { key: string };

    expect(update.status).toBe(200);
    // Returned key should be the same as the existing key
    expect(updateBody.key).toBe(existingKey);

    // Decrypt with new password should succeed
    const decryptResponse = await handleDecryptRequest(
      new Request('http://localhost/api/decrypt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: existingKey, password: 'pass-2' })
      })
    );
    expect(decryptResponse.status).toBe(200);
  });

  it('returns 400 when key update request is missing currentPassword', async () => {
    const first = await handleEncryptRequest(
      createEncryptRequest({ plainText: validJson, password: 'pass-1' })
    );
    const { key: existingKey } = (await first.json()) as { key: string };

    resetRateLimitStoreForTest();

    const update = await handleEncryptRequest(
      createEncryptRequest({ plainText: validJson, password: 'pass-2', key: existingKey })
    );

    expect(update.status).toBe(400);
  });

  it('returns 403 and does not overwrite when currentPassword is invalid', async () => {
    const first = await handleEncryptRequest(
      createEncryptRequest({ plainText: validJson, password: 'pass-1' })
    );
    const { key: existingKey } = (await first.json()) as { key: string };

    resetRateLimitStoreForTest();

    const update = await handleEncryptRequest(
      createEncryptRequest({
        plainText: validJson,
        password: 'pass-2',
        key: existingKey,
        currentPassword: 'wrong-pass'
      })
    );

    expect(update.status).toBe(403);

    const decryptWithOldPassword = await handleDecryptRequest(
      new Request('http://localhost/api/decrypt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: existingKey, password: 'pass-1' })
      })
    );
    const decryptWithNewPassword = await handleDecryptRequest(
      new Request('http://localhost/api/decrypt', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ key: existingKey, password: 'pass-2' })
      })
    );

    expect(decryptWithOldPassword.status).toBe(200);
    expect(decryptWithNewPassword.status).toBe(400);
  });
});
