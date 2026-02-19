import type { PasshashRecord, Shiori } from '../../domain/entities/Shiori';
import type { PasshashRepository } from '../../domain/repositories/PasshashRepository';
import type { SharedPayloadRepository } from '../../domain/repositories/SharedPayloadRepository';
import type { EncryptApiRequest, EncryptApiResponse } from '../dto/shiori';

export interface CreateShareLinkServerDeps {
  parseJsonText: (raw: string) => unknown;
  validateShioriData: (value: unknown) => Shiori;
  toCompactShiori: (shiori: Shiori) => unknown;
  serializeJson: (value: unknown) => string;
  encryptPayload: (plainText: string, password: string) => Promise<Uint8Array>;
  createPasswordHashRecord: (password: string) => Promise<PasshashRecord>;
  createShareKey: () => string;
  sharePayloadRepository: SharedPayloadRepository;
  shareTtlSeconds: number;
  maxKeyGenerationAttempts: number;
}

export interface CreateShareLinkServerInput {
  plainText: string;
  password: string;
  /** 指定された場合、キー生成をスキップしてこのキーで KV を上書きする */
  existingKey?: string;
}

export async function createShareLinkFromStructuredText(
  input: CreateShareLinkServerInput,
  deps: CreateShareLinkServerDeps
): Promise<EncryptApiResponse> {
  const parsed = deps.parseJsonText(input.plainText);
  const shiori = deps.validateShioriData(parsed);
  const compact = deps.toCompactShiori(shiori);
  const compactText = deps.serializeJson(compact);

  const d = await deps.encryptPayload(compactText, input.password);
  const passhash = await deps.createPasswordHashRecord(input.password);

  let key: string;
  if (input.existingKey) {
    // 既存キーを直接使用して KV エントリを上書き
    key = input.existingKey;
  } else {
    const attempts = Math.max(1, deps.maxKeyGenerationAttempts);
    let generated: string | null = null;
    for (let attempt = 0; attempt < attempts; attempt += 1) {
      const candidate = deps.createShareKey();
      const exists = await deps.sharePayloadRepository.exists(candidate);
      if (!exists) {
        generated = candidate;
        break;
      }
    }
    if (!generated) {
      throw new Error('共有キーの生成に失敗しました');
    }
    key = generated;
  }

  const ttlSeconds = Math.max(1, deps.shareTtlSeconds);
  const expiresAt = Date.now() + ttlSeconds * 1000;
  await deps.sharePayloadRepository.put(key, d, ttlSeconds, expiresAt);

  return { key, passhash, expiresAt };
}

export interface CreateShareLinkClientDeps {
  encryptApi: (request: EncryptApiRequest) => Promise<EncryptApiResponse>;
  passhashRepository: PasshashRepository;
}

export interface CreateShareLinkClientInput {
  plainText: string;
  password: string;
  /** 指定された場合、既存キーを上書き更新する */
  existingKey?: string;
}

export async function createShareLinkViaApi(
  input: CreateShareLinkClientInput,
  deps: CreateShareLinkClientDeps
): Promise<{ key: string; expiresAt: number }> {
  const result = await deps.encryptApi({
    plainText: input.plainText,
    password: input.password,
    ...(input.existingKey ? { key: input.existingKey } : {})
  });
  deps.passhashRepository.save(result.key, result.passhash);
  return { key: result.key, expiresAt: result.expiresAt };
}
