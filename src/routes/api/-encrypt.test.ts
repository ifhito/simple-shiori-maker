/** @vitest-environment node */

import { describe, expect, it } from 'vitest';
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

describe('POST /api/encrypt', () => {
  it('returns id, encrypted payload, and passhash', async () => {
    const request = new Request('http://localhost/api/encrypt', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ plainText: validJson, password: 'secret-123' })
    });

    const response = await handleEncryptRequest(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.id).toBeTypeOf('string');
    expect(body.d).toBeTypeOf('string');
    expect(body.passhash).toEqual(
      expect.objectContaining({
        v: 1,
        salt: expect.any(String),
        hash: expect.any(String),
        iter: 120000
      })
    );
  });

  it('returns 400 for invalid structured JSON', async () => {
    const request = new Request('http://localhost/api/encrypt', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ plainText: '{"title":"broken"}', password: 'secret-123' })
    });

    const response = await handleEncryptRequest(request);
    expect(response.status).toBe(400);
  });
});
