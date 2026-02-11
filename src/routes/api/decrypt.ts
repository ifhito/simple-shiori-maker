import { createFileRoute } from '@tanstack/react-router';
import { DomainValidationError, validateShioriData } from '../../domain/services/ShioriValidationService';
import { decryptPayload } from '../../infrastructure/crypto/serverCrypto';
import { JsonParseError, parseJsonText } from '../../infrastructure/parsing/jsonParser';

interface DecryptRequestBody {
  d: string;
  password: string;
}

export async function handleDecryptRequest(request: Request): Promise<Response> {
  let payload: Partial<DecryptRequestBody>;

  try {
    payload = (await request.json()) as Partial<DecryptRequestBody>;
  } catch {
    return Response.json({ message: 'リクエストJSONが不正です' }, { status: 400 });
  }

  if (!payload.d || !payload.password) {
    return Response.json({ message: 'd と password は必須です' }, { status: 400 });
  }

  try {
    const plainText = await decryptPayload(payload.d, payload.password);

    const parsed = parseJsonText(plainText);
    validateShioriData(parsed);

    return Response.json({ plainText }, { status: 200 });
  } catch (error) {
    if (error instanceof DomainValidationError || error instanceof JsonParseError) {
      return Response.json({ message: error.message }, { status: 400 });
    }

    const message = error instanceof Error ? error.message : '復号に失敗しました';
    return Response.json({ message }, { status: 400 });
  }
}

export const Route = createFileRoute('/api/decrypt')({
  server: {
    handlers: {
      POST: ({ request }) => handleDecryptRequest(request)
    }
  }
});
