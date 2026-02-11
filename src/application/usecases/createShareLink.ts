import type { PasshashRecord } from '../../domain/entities/Shiori';
import type { PasshashRepository } from '../../domain/repositories/PasshashRepository';
import type { EncryptApiRequest, EncryptApiResponse } from '../dto/shiori';

export interface CreateShareLinkServerDeps {
  parseJsonText: (raw: string) => unknown;
  validateShioriData: (value: unknown) => unknown;
  encryptPayload: (plainText: string, password: string) => Promise<string>;
  createPasswordHashRecord: (password: string) => Promise<PasshashRecord>;
  createShareId: () => string;
}

export interface CreateShareLinkServerInput {
  plainText: string;
  password: string;
  id?: string;
}

export async function createShareLinkFromStructuredText(
  input: CreateShareLinkServerInput,
  deps: CreateShareLinkServerDeps
): Promise<EncryptApiResponse> {
  const parsed = deps.parseJsonText(input.plainText);
  deps.validateShioriData(parsed);

  const id = input.id ?? deps.createShareId();
  const d = await deps.encryptPayload(input.plainText, input.password);
  const passhash = await deps.createPasswordHashRecord(input.password);

  return { id, d, passhash };
}

export interface CreateShareLinkClientDeps {
  encryptApi: (request: EncryptApiRequest) => Promise<EncryptApiResponse>;
  passhashRepository: PasshashRepository;
}

export interface CreateShareLinkClientInput {
  plainText: string;
  password: string;
}

export async function createShareLinkViaApi(
  input: CreateShareLinkClientInput,
  deps: CreateShareLinkClientDeps
): Promise<{ id: string; d: string }> {
  const result = await deps.encryptApi({ plainText: input.plainText, password: input.password });
  deps.passhashRepository.save(result.id, result.passhash);
  return { id: result.id, d: result.d };
}
