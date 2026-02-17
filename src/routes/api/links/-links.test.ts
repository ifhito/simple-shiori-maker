/** @vitest-environment node */

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { resetRateLimitStoreForTest } from '../../../infrastructure/security/rateLimit';
import { resetUserLinkListStoreForTest } from '../../../infrastructure/storage/userLinkListStorage';
import { handleLoadLinksRequest } from './load';
import { handleSaveLinksRequest } from './save';

function createSaveRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {}
): Request {
  return new Request('http://localhost/api/links/save', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
}

function createLoadRequest(
  body: Record<string, unknown>,
  headers: Record<string, string> = {}
): Request {
  return new Request('http://localhost/api/links/load', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...headers },
    body: JSON.stringify(body)
  });
}

describe('POST /api/links/save + /api/links/load', () => {
  const fixedNow = 1_700_000_000_000;
  const passphraseHash = 'a'.repeat(43);

  beforeEach(() => {
    resetRateLimitStoreForTest();
    resetUserLinkListStoreForTest();
    delete process.env.RATE_LIMIT_LINKS_PER_MIN;
    delete process.env.LINKS_TTL_SECONDS;
    delete process.env.MAX_LINKS_COUNT;
    delete process.env.MAX_LINKS_PLAINTEXT_BYTES;
    vi.spyOn(Date, 'now').mockReturnValue(fixedNow);
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('saves and loads links', async () => {
    const links = [
      {
        key: 'abc123',
        title: '箱根1泊2日しおり',
        destination: '箱根',
        createdAt: fixedNow,
        expiresAt: fixedNow + 2_592_000_000
      }
    ];

    const saveResponse = await handleSaveLinksRequest(
      createSaveRequest({ passphraseHash, links })
    );
    expect(saveResponse.status).toBe(200);

    const loadResponse = await handleLoadLinksRequest(
      createLoadRequest({ passphraseHash })
    );
    const body = await loadResponse.json();

    expect(loadResponse.status).toBe(200);
    expect(body.links).toEqual(links);
  });

  it('returns [] when no links exist', async () => {
    const response = await handleLoadLinksRequest(createLoadRequest({ passphraseHash }));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.links).toEqual([]);
  });

  it('returns 400 for missing passphraseHash', async () => {
    const response = await handleLoadLinksRequest(createLoadRequest({}));
    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid passphraseHash format', async () => {
    const response = await handleLoadLinksRequest(createLoadRequest({ passphraseHash: 'oops' }));
    expect(response.status).toBe(400);
  });

  it('returns 400 for invalid links payload', async () => {
    const response = await handleSaveLinksRequest(
      createSaveRequest({
        passphraseHash,
        links: [{ key: 'abc123', title: '', destination: '', createdAt: fixedNow, expiresAt: fixedNow }]
      })
    );
    expect(response.status).toBe(400);
  });

  it('returns 413 when link count exceeds limit', async () => {
    process.env.MAX_LINKS_COUNT = '1';
    const response = await handleSaveLinksRequest(
      createSaveRequest({
        passphraseHash,
        links: [
          { key: 'a', title: 't', destination: 'd', createdAt: fixedNow, expiresAt: fixedNow },
          { key: 'b', title: 't', destination: 'd', createdAt: fixedNow, expiresAt: fixedNow }
        ]
      })
    );
    expect(response.status).toBe(413);
  });

  it('rate limits saves and loads independently', async () => {
    process.env.RATE_LIMIT_LINKS_PER_MIN = '1';

    const headers = { 'cf-connecting-ip': '203.0.113.10' };
    const links = [
      {
        key: 'abc123',
        title: '箱根1泊2日しおり',
        destination: '箱根',
        createdAt: fixedNow,
        expiresAt: fixedNow + 2_592_000_000
      }
    ];

    const firstSave = await handleSaveLinksRequest(
      createSaveRequest({ passphraseHash, links }, headers)
    );
    const secondSave = await handleSaveLinksRequest(
      createSaveRequest({ passphraseHash, links }, headers)
    );

    expect(firstSave.status).toBe(200);
    expect(secondSave.status).toBe(429);

    const load = await handleLoadLinksRequest(createLoadRequest({ passphraseHash }, headers));
    expect(load.status).toBe(200);
  });
});

