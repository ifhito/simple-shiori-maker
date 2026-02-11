import type { PasshashRecord, Shiori } from '../../domain/entities/Shiori';
import type { PasshashRepository } from '../../domain/repositories/PasshashRepository';
import type { DecryptApiRequest, DecryptApiResponse, UnlockResult } from '../dto/shiori';

export interface UnlockShioriDeps {
  decryptApi: (request: DecryptApiRequest) => Promise<DecryptApiResponse>;
  parseJsonText: (raw: string) => unknown;
  validateShioriData: (value: unknown) => Shiori;
  passhashRepository: PasshashRepository;
  verifyPasswordHashRecord: (password: string, record: PasshashRecord) => Promise<boolean>;
}

export interface UnlockShioriInput {
  id?: string;
  d?: string;
  password: string;
}

export async function unlockShioriViaApi(
  input: UnlockShioriInput,
  deps: UnlockShioriDeps
): Promise<UnlockResult> {
  if (!input.id || !input.d) {
    throw new Error('共有リンクが不正です。URLを確認してください。');
  }

  const localRecord = deps.passhashRepository.load(input.id);
  if (localRecord) {
    const isMatch = await deps.verifyPasswordHashRecord(input.password, localRecord);
    if (!isMatch) {
      throw new Error('保存済みパスワードと一致しません');
    }
  }

  const decrypted = await deps.decryptApi({ d: input.d, password: input.password });
  const parsed = deps.parseJsonText(decrypted.plainText);
  const shiori = deps.validateShioriData(parsed);

  return {
    plainText: decrypted.plainText,
    shiori
  };
}
