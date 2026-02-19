import { createFileRoute } from '@tanstack/react-router';
import { toCompactShiori } from '../../application/mappers/shioriCompactMapper';
import {
  ExistingShareAuthorizationError,
  createShareLinkFromStructuredText
} from '../../application/usecases/createShareLink';
import { DomainValidationError, validateShioriData } from '../../domain/services/ShioriValidationService';
import { getRuntimeConfig } from '../../infrastructure/config/runtimeConfig';
import {
  createPasswordHashRecord,
  createShareKey,
  decryptPayload,
  decryptPayloadBytes,
  encryptPayloadBytes
} from '../../infrastructure/crypto/serverCrypto';
import { JsonParseError, parseJsonText } from '../../infrastructure/parsing/jsonParser';
import { consumeRateLimit, getRateLimitSubject } from '../../infrastructure/security/rateLimit';
import { createSharedPayloadRepository } from '../../infrastructure/storage/sharedPayloadStorage';

interface EncryptRequestBody {
  plainText: string;
  password: string;
  key?: string;
  currentPassword?: string;
}

const CREATE_LIMIT_WINDOW_MS = 60_000;
const CREATE_LIMIT_DAY_WINDOW_MS = 86_400_000;

function countUtf8Bytes(text: string): number {
  return new TextEncoder().encode(text).byteLength;
}

export async function handleEncryptRequest(request: Request, context?: unknown): Promise<Response> {
  let payload: Partial<EncryptRequestBody>;

  try {
    payload = (await request.json()) as Partial<EncryptRequestBody>;
  } catch {
    return Response.json({ message: 'リクエストJSONが不正です' }, { status: 400 });
  }

  if (!payload.plainText || !payload.password) {
    return Response.json({ message: 'plainText と password は必須です' }, { status: 400 });
  }

  if (payload.key && !payload.currentPassword) {
    return Response.json(
      { message: 'key を指定した更新には currentPassword が必須です' },
      { status: 400 }
    );
  }

  const config = getRuntimeConfig();
  if (config.disableShareCreate) {
    return Response.json({ message: '現在はリンク生成を停止しています' }, { status: 503 });
  }

  if (countUtf8Bytes(payload.plainText) > config.maxPlainTextBytes) {
    return Response.json(
      { message: `plainText が大きすぎます（最大 ${config.maxPlainTextBytes} bytes）` },
      { status: 413 }
    );
  }

  const subject = getRateLimitSubject(request);
  const allowPerMinute = consumeRateLimit({
    key: `create:min:${subject}`,
    limit: config.rateLimitCreatePerMin,
    windowMs: CREATE_LIMIT_WINDOW_MS
  });
  if (!allowPerMinute) {
    return Response.json({ message: '作成リクエストが多すぎます。少し待って再試行してください' }, { status: 429 });
  }

  const allowPerDay = consumeRateLimit({
    key: `create:day:${subject}`,
    limit: config.rateLimitCreatePerDay,
    windowMs: CREATE_LIMIT_DAY_WINDOW_MS
  });
  if (!allowPerDay) {
    return Response.json({ message: '本日の作成上限に達しました' }, { status: 429 });
  }

  try {
    const sharePayloadRepository = await createSharedPayloadRepository(context);
    const result = await createShareLinkFromStructuredText(
      {
        plainText: payload.plainText,
        password: payload.password,
        ...(payload.key ? { existingKey: payload.key } : {}),
        ...(payload.currentPassword ? { currentPassword: payload.currentPassword } : {})
      },
      {
        parseJsonText,
        validateShioriData,
        toCompactShiori,
        serializeJson: JSON.stringify,
        encryptPayload: encryptPayloadBytes,
        createPasswordHashRecord,
        createShareKey,
        authorizeExistingKeyOverwrite: async ({ key, currentPassword }) => {
          const record = await sharePayloadRepository.get(key);
          if (!record) {
            throw new ExistingShareAuthorizationError();
          }

          try {
            if (typeof record.encryptedPayload === 'string') {
              await decryptPayload(record.encryptedPayload, currentPassword);
            } else {
              await decryptPayloadBytes(record.encryptedPayload, currentPassword);
            }
          } catch {
            throw new ExistingShareAuthorizationError();
          }
        },
        sharePayloadRepository,
        shareTtlSeconds: config.shareTtlSeconds,
        maxKeyGenerationAttempts: config.maxKeyGenerationAttempts
      }
    );

    return Response.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof ExistingShareAuthorizationError) {
      return Response.json({ message: error.message }, { status: 403 });
    }

    if (error instanceof DomainValidationError || error instanceof JsonParseError) {
      return Response.json({ message: error.message }, { status: 400 });
    }

    console.error('Unexpected error in /api/encrypt', error);
    return Response.json({ message: '暗号化処理に失敗しました' }, { status: 500 });
  }
}

export const Route = createFileRoute('/api/encrypt')({
  server: {
    handlers: {
      POST: ({ request, context }) => handleEncryptRequest(request, context)
    }
  }
});
