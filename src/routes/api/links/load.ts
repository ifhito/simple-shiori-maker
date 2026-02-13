import { createFileRoute } from '@tanstack/react-router';
import { loadUserLinksOnServer } from '../../../application/usecases/loadUserLinks';
import { validateUserLinkList } from '../../../domain/services/UserLinkListValidationService';
import { getRuntimeConfig } from '../../../infrastructure/config/runtimeConfig';
import { decryptPayloadBytes } from '../../../infrastructure/crypto/serverCrypto';
import { consumeRateLimit, getRateLimitSubject } from '../../../infrastructure/security/rateLimit';
import { createUserLinkListRepository } from '../../../infrastructure/storage/userLinkListStorage';

interface LoadLinksRequestBody {
  passphraseHash: string;
}

const LINKS_LIMIT_WINDOW_MS = 60_000;
const PASSPHRASE_HASH_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export async function handleLoadLinksRequest(request: Request, context?: unknown): Promise<Response> {
  let payload: Partial<LoadLinksRequestBody>;

  try {
    payload = (await request.json()) as Partial<LoadLinksRequestBody>;
  } catch {
    return Response.json({ message: 'リクエストJSONが不正です' }, { status: 400 });
  }

  if (!payload.passphraseHash) {
    return Response.json({ message: 'passphraseHash は必須です' }, { status: 400 });
  }

  if (!PASSPHRASE_HASH_PATTERN.test(payload.passphraseHash)) {
    return Response.json({ message: 'passphraseHash の形式が不正です' }, { status: 400 });
  }

  const config = getRuntimeConfig();
  const subject = getRateLimitSubject(request);
  const allowed = consumeRateLimit({
    key: `links:load:min:${subject}`,
    limit: config.rateLimitLinksPerMin,
    windowMs: LINKS_LIMIT_WINDOW_MS
  });
  if (!allowed) {
    return Response.json({ message: 'リクエストが多すぎます。少し待って再試行してください' }, { status: 429 });
  }

  try {
    const userLinkListRepository = await createUserLinkListRepository(context);
    const links = await loadUserLinksOnServer(payload.passphraseHash, {
      decryptPayload: decryptPayloadBytes,
      validateUserLinkList,
      parseJson: JSON.parse,
      userLinkListRepository,
      linksTtlSeconds: config.linksTtlSeconds
    });

    return Response.json({ links }, { status: 200 });
  } catch (error) {
    const message = error instanceof Error ? error.message : '読み込みに失敗しました';
    if (message.includes('復号に失敗しました')) {
      return Response.json({ message: '合言葉が一致しません' }, { status: 401 });
    }

    console.error('Unexpected error in /api/links/load', error);
    return Response.json({ message: 'リンク読み込みに失敗しました' }, { status: 500 });
  }
}

export const Route = createFileRoute('/api/links/load')({
  server: {
    handlers: {
      POST: ({ request, context }) => handleLoadLinksRequest(request, context)
    }
  }
});
