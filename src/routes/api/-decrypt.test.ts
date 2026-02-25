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
  ],
  design: { v: 1, layout: { preset: 'timeline' } }
});

async function createSharedKey(password = 'secret-123'): Promise<string> {
  const encryptRequest = new Request('http://localhost/api/encrypt', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ plainText: validJson, password })
  });
  const encryptResponse = await handleEncryptRequest(encryptRequest);
  const body = (await encryptResponse.json()) as { key: string };
  return body.key;
}

function createDecryptRequest(body: Record<string, unknown>, headers: Record<string, string> = {}): Request {
  return new Request('http://localhost/api/decrypt', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
}

describe('POST /api/decrypt', () => {
  const fixedNow = 1_700_000_000_000;

  beforeEach(() => {
    resetSharedPayloadStoreForTest();
    resetRateLimitStoreForTest();
    delete process.env.RATE_LIMIT_CREATE_PER_MIN;
    delete process.env.RATE_LIMIT_CREATE_PER_DAY;
    delete process.env.RATE_LIMIT_READ_PER_MIN;
    delete process.env.SHARE_TTL_SECONDS;
    vi.spyOn(Date, 'now').mockReturnValue(fixedNow);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('decrypts and returns plain text by key lookup', async () => {
    const key = await createSharedKey();
    const request = createDecryptRequest({ key, password: 'secret-123' });
    const response = await handleDecryptRequest(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.plainText).toBe(validJson);
    expect(body.expiresAt).toBe(fixedNow + 2_592_000_000);
  });

  it('returns 404 when key does not exist', async () => {
    const request = createDecryptRequest({ key: 'missing-key', password: 'secret-123' });
    const response = await handleDecryptRequest(request);
    expect(response.status).toBe(404);
  });

  it('returns 400 for wrong password', async () => {
    const key = await createSharedKey();
    const request = createDecryptRequest({ key, password: 'wrong' });
    const response = await handleDecryptRequest(request);

    expect(response.status).toBe(400);
  });

  it('returns 400 when required fields are missing', async () => {
    const request = createDecryptRequest({ password: 'secret-123' });
    const response = await handleDecryptRequest(request);

    expect(response.status).toBe(400);
  });

  it('returns 429 when read rate limit is exceeded', async () => {
    process.env.RATE_LIMIT_READ_PER_MIN = '1';
    const key = await createSharedKey();
    const headers = { 'cf-connecting-ip': '203.0.113.20' };

    const first = await handleDecryptRequest(createDecryptRequest({ key, password: 'secret-123' }, headers));
    const second = await handleDecryptRequest(createDecryptRequest({ key, password: 'secret-123' }, headers));

    expect(first.status).toBe(200);
    expect(second.status).toBe(429);
  });
});
