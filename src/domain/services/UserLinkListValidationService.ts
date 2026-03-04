import type { UserLinkList } from '../entities/UserLinkList';
import { UserLinkListSchema } from '../schemas/UserLinkListSchema';
import { formatZodIssues } from '../schemas/zodErrorBridge';
import { DomainValidationError } from './ShioriValidationService';

export function validateUserLinkList(value: unknown): UserLinkList {
  const result = UserLinkListSchema.safeParse(value);
  if (!result.success) {
    throw new DomainValidationError(formatZodIssues(result.error));
  }
  return result.data as unknown as UserLinkList;
}
