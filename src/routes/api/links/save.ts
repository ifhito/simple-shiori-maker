import { createFileRoute } from '@tanstack/react-router';
import { saveUserLinksOnServer } from '../../../application/usecases/saveUserLinks';
import { validateUserLinkList } from '../../../domain/services/UserLinkListValidationService';
import { DomainValidationError } from '../../../domain/services/ShioriValidationService';
import { getRuntimeConfig } from '../../../infrastructure/config/runtimeConfig';
import { encryptPayloadBytes } from '../../../infrastructure/crypto/serverCrypto';
import { consumeRateLimit, getRateLimitSubject } from '../../../infrastructure/security/rateLimit';
import { createUserLinkListRepository } from '../../../infrastructure/storage/userLinkListStorage';

interface SaveLinksRequestBody {
  passphraseHash: string;
  links: unknown[];
}

const LINKS_LIMIT_WINDOW_MS = 60_000;
const PASSPHRASE_HASH_PATTERN = /^[A-Za-z0-9_-]{43}$/;

export async function handleSaveLinksRequest(request: Request, context?: unknown): Promise<Response> {
  let payload: Partial<SaveLinksRequestBody>;

  try {
    payload = (await request.json()) as Partial<SaveLinksRequestBody>;
  } catch {
    return Response.json({ message: 'リクエストJSONが不正です' }, { status: 400 });
  }

  if (!payload.passphraseHash || !Array.isArray(payload.links)) {
    return Response.json({ message: 'passphraseHash と links は必須です' }, { status: 400 });
  }

  if (!PASSPHRASE_HASH_PATTERN.test(payload.passphraseHash)) {
    return Response.json({ message: 'passphraseHash の形式が不正です' }, { status: 400 });
  }

  const config = getRuntimeConfig();
  const subject = getRateLimitSubject(request);
  const allowed = consumeRateLimit({
    key: `links:save:min:${subject}`,
    limit: config.rateLimitLinksPerMin,
    windowMs: LINKS_LIMIT_WINDOW_MS
  });
  if (!allowed) {
    return Response.json({ message: 'リクエストが多すぎます。少し待って再試行してください' }, { status: 429 });
  }

  try {
    const validated = validateUserLinkList({ v: 1, links: payload.links });

    if (validated.links.length > config.maxLinksCount) {
      return Response.json(
        { message: `links が多すぎます（最大 ${config.maxLinksCount} 件）` },
        { status: 413 }
      );
    }

    const plainText = JSON.stringify(validated);
    const byteLength = new TextEncoder().encode(plainText).byteLength;
    if (byteLength > config.maxLinksPlaintextBytes) {
      return Response.json(
        { message: `links が大きすぎます（最大 ${config.maxLinksPlaintextBytes} bytes）` },
        { status: 413 }
      );
    }

    const userLinkListRepository = await createUserLinkListRepository(context);
    await saveUserLinksOnServer(
      {
        passphraseHash: payload.passphraseHash,
        links: validated.links
      },
      {
        encryptPayload: encryptPayloadBytes,
        userLinkListRepository,
        linksTtlSeconds: config.linksTtlSeconds
      }
    );

    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    if (error instanceof DomainValidationError) {
      return Response.json({ message: error.message }, { status: 400 });
    }
    console.error('Unexpected error in /api/links/save', error);
    return Response.json({ message: 'リンク保存に失敗しました' }, { status: 500 });
  }
}

export const Route = createFileRoute('/api/links/save')({
  server: {
    handlers: {
      POST: ({ request, context }) => handleSaveLinksRequest(request, context)
    }
  }
});
