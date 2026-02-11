/** @vitest-environment node */

import { describe, expect, it } from 'vitest';
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
});
