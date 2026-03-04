import type { Shiori } from '../entities/Shiori';
import { ShioriSchema } from '../schemas/ShioriSchema';
import { formatZodIssues } from '../schemas/zodErrorBridge';

export class DomainValidationError extends Error {
  readonly details: string[];

  constructor(details: string[]) {
    super(details.join('\n'));
    this.name = 'DomainValidationError';
    this.details = details;
  }
}

export function validateShioriData(value: unknown): Shiori {
  const result = ShioriSchema.safeParse(value);
  if (!result.success) {
    throw new DomainValidationError(formatZodIssues(result.error));
  }
  return result.data as unknown as Shiori;
}

export function validateShioriJsonString(raw: string): Shiori {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new DomainValidationError(['JSONの構文が不正です']);
  }
  return validateShioriData(parsed);
}
