const MIN_LENGTH = 4;

export function isValidPassphrase(value: string): boolean {
  return typeof value === 'string' && value.trim().length >= MIN_LENGTH;
}
