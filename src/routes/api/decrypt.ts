import { createFileRoute } from '@tanstack/react-router';
import {
  CompactShioriFormatError,
  fromCompactShiori
} from '../../application/mappers/shioriCompactMapper';
import { DomainValidationError, validateShioriData } from '../../domain/services/ShioriValidationService';
import { getRuntimeConfig } from '../../infrastructure/config/runtimeConfig';
import { decryptPayload, decryptPayloadBytes } from '../../infrastructure/crypto/serverCrypto';
import { JsonParseError, parseJsonText } from '../../infrastructure/parsing/jsonParser';
import { consumeRateLimit, getRateLimitSubject } from '../../infrastructure/security/rateLimit';
import { createSharedPayloadRepository } from '../../infrastructure/storage/sharedPayloadStorage';

interface DecryptRequestBody {
  key: string;
  password: string;
}

const READ_LIMIT_WINDOW_MS = 60_000;

export async function handleDecryptRequest(request: Request, context?: unknown): Promise<Response> {
  let payload: Partial<DecryptRequestBody>;

  try {
    payload = (await request.json()) as Partial<DecryptRequestBody>;
  } catch {
    return Response.json({ message: 'リクエストJSONが不正です' }, { status: 400 });
  }

  if (!payload.key || !payload.password) {
    return Response.json({ message: 'key と password は必須です' }, { status: 400 });
  }

  const config = getRuntimeConfig();
  const subject = getRateLimitSubject(request);
  const allowed = consumeRateLimit({
    key: `read:min:${subject}`,
    limit: config.rateLimitReadPerMin,
    windowMs: READ_LIMIT_WINDOW_MS
  });
  if (!allowed) {
    return Response.json({ message: '閲覧リクエストが多すぎます。少し待って再試行してください' }, { status: 429 });
  }

  const sharePayloadRepository = await createSharedPayloadRepository(context);
  let record: Awaited<ReturnType<typeof sharePayloadRepository.get>>;
  try {
    record = await sharePayloadRepository.get(payload.key);
  } catch {
    return Response.json({ message: '共有データの取得に失敗しました' }, { status: 500 });
  }

  if (!record) {
    return Response.json({ message: '共有データが見つかりません（期限切れの可能性があります）' }, { status: 404 });
  }

  try {
    const compactText =
      typeof record.encryptedPayload === 'string'
        ? await decryptPayload(record.encryptedPayload, payload.password)
        : await decryptPayloadBytes(record.encryptedPayload, payload.password);
    const compact = parseJsonText(compactText);
    const shiori = fromCompactShiori(compact);
    validateShioriData(shiori);

    return Response.json({ plainText: JSON.stringify(shiori), expiresAt: record.expiresAt }, { status: 200 });
  } catch (error) {
    if (
      error instanceof DomainValidationError ||
      error instanceof JsonParseError ||
      error instanceof CompactShioriFormatError
    ) {
      return Response.json({ message: error.message }, { status: 400 });
    }

    return Response.json({ message: '復号に失敗しました' }, { status: 400 });
  }
}

export const Route = createFileRoute('/api/decrypt')({
  server: {
    handlers: {
      POST: ({ request, context }) => handleDecryptRequest(request, context)
    }
  }
});
