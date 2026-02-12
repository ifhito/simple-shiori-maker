import { createFileRoute } from '@tanstack/react-router';
import { toCompactShiori } from '../../application/mappers/shioriCompactMapper';
import {
  createShareLinkFromStructuredText,
  type CreateShareLinkServerInput
} from '../../application/usecases/createShareLink';
import { DomainValidationError, validateShioriData } from '../../domain/services/ShioriValidationService';
import {
  createPasswordHashRecord,
  createShareId,
  encryptPayload
} from '../../infrastructure/crypto/serverCrypto';
import { JsonParseError, parseJsonText } from '../../infrastructure/parsing/jsonParser';

export async function handleEncryptRequest(request: Request): Promise<Response> {
  let payload: Partial<CreateShareLinkServerInput>;

  try {
    payload = (await request.json()) as Partial<CreateShareLinkServerInput>;
  } catch {
    return Response.json({ message: 'リクエストJSONが不正です' }, { status: 400 });
  }

  if (!payload.plainText || !payload.password) {
    return Response.json({ message: 'plainText と password は必須です' }, { status: 400 });
  }

  try {
    const result = await createShareLinkFromStructuredText(
      {
        plainText: payload.plainText,
        password: payload.password,
        id: payload.id
      },
      {
        parseJsonText,
        validateShioriData,
        toCompactShiori,
        serializeJson: JSON.stringify,
        encryptPayload,
        createPasswordHashRecord,
        createShareId
      }
    );

    return Response.json(result, { status: 200 });
  } catch (error) {
    if (error instanceof DomainValidationError || error instanceof JsonParseError) {
      return Response.json({ message: error.message }, { status: 400 });
    }

    return Response.json({ message: '暗号化処理に失敗しました' }, { status: 500 });
  }
}

export const Route = createFileRoute('/api/encrypt')({
  server: {
    handlers: {
      POST: ({ request }) => handleEncryptRequest(request)
    }
  }
});
