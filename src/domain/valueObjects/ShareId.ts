export function isValidShareId(value: string): boolean {
  return /^[A-Za-z0-9_-]{8,32}$/.test(value);
}
