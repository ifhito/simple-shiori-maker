import type { Shiori } from '../../domain/entities/Shiori';

export interface ParseAndValidateShioriDeps {
  parseJsonText: (raw: string) => unknown;
  validateShioriData: (value: unknown) => Shiori;
}

export function parseAndValidateShioriJson(
  raw: string,
  deps: ParseAndValidateShioriDeps
): Shiori {
  const parsed = deps.parseJsonText(raw);
  return deps.validateShioriData(parsed);
}
