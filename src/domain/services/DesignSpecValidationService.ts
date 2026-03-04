import type { DesignSpec } from '../entities/DesignSpec';
import { DesignSpecSchema } from '../schemas/DesignSpecSchema';
import { formatZodIssues } from '../schemas/zodErrorBridge';
import { DomainValidationError } from './ShioriValidationService';

export function validateDesignSpec(value: unknown): DesignSpec {
  const result = DesignSpecSchema.safeParse(value);
  if (!result.success) {
    throw new DomainValidationError(formatZodIssues(result.error));
  }
  return result.data as unknown as DesignSpec;
}
