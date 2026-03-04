import type { ZodError } from 'zod';

/**
 * Converts a ZodError's issues into the flat string[] format that
 * DomainValidationError expects.
 *
 * Path format: ['days', 0, 'items', 1, 'time'] + ' は必須文字列です'
 *           → 'days[0].items[1].time は必須文字列です'
 *
 * This function is intentionally free of any DomainValidationError import
 * to avoid a circular dependency with ShioriValidationService.
 */
export function formatZodIssues(error: ZodError): string[] {
  return error.issues.map((issue) => {
    const formattedPath = issue.path
      .join('.')
      .replace(/\.(\d+)/g, '[$1]');
    return formattedPath ? `${formattedPath} ${issue.message}` : issue.message;
  });
}
