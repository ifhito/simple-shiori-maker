function ensureCrypto(): Crypto {
  const instance = globalThis.crypto;
  if (!instance?.subtle) {
    throw new Error('Web Crypto API が利用できません');
  }
  return instance;
}

function bytesToBase64Url(bytes: Uint8Array): string {
  let base64: string;

  // Node.js and Workers(nodejs_compat) generally provide Buffer.
  if (typeof Buffer !== 'undefined') {
    base64 = Buffer.from(bytes).toString('base64');
  } else if (typeof btoa !== 'undefined') {
    let binary = '';
    for (let i = 0; i < bytes.length; i += 1) {
      binary += String.fromCharCode(bytes[i]);
    }
    base64 = btoa(binary);
  } else {
    throw new Error('base64 エンコードが利用できません');
  }

  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
}

export async function hashPassphraseToKey(passphrase: string): Promise<string> {
  const digest = await ensureCrypto().subtle.digest('SHA-256', new TextEncoder().encode(passphrase));
  return bytesToBase64Url(new Uint8Array(digest));
}

