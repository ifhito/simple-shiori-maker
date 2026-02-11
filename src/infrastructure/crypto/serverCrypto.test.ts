/** @vitest-environment node */

import { describe, expect, it } from 'vitest';
import {
  createPasswordHashRecord,
  decryptPayload,
  encryptPayload,
  verifyPasswordHashRecord
} from './serverCrypto';

describe('serverCrypto', () => {
  it('encrypts and decrypts data', async () => {
    const source = JSON.stringify({ hello: 'world' });
    const encrypted = await encryptPayload(source, 'secret-123');
    const decrypted = await decryptPayload(encrypted, 'secret-123');

    expect(decrypted).toBe(source);
  });

  it('fails decryption on wrong password', async () => {
    const source = JSON.stringify({ hello: 'world' });
    const encrypted = await encryptPayload(source, 'secret-123');

    await expect(decryptPayload(encrypted, 'wrong-pass')).rejects.toThrow();
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
