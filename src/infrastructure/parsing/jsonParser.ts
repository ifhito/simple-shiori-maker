export class JsonParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JsonParseError';
  }
}

export function parseJsonText(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    throw new JsonParseError('JSONの構文が不正です');
  }
}
