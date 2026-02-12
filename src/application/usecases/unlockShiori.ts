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
  key?: string;
  password: string;
}

export async function unlockShioriViaApi(
  input: UnlockShioriInput,
  deps: UnlockShioriDeps
): Promise<UnlockResult> {
  if (!input.key) {
    throw new Error('共有リンクが不正です。URLを確認してください。');
  }

  const localRecord = deps.passhashRepository.load(input.key);
  if (localRecord) {
    const isMatch = await deps.verifyPasswordHashRecord(input.password, localRecord);
    if (!isMatch) {
      throw new Error('保存済みパスワードと一致しません');
    }
  }

  const decrypted = await deps.decryptApi({ key: input.key, password: input.password });
  const parsed = deps.parseJsonText(decrypted.plainText);
  const shiori = deps.validateShioriData(parsed);

  return {
    plainText: decrypted.plainText,
    shiori
  };
}
