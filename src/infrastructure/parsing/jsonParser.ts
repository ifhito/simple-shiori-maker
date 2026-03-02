export class JsonParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JsonParseError';
  }
}

export function parseJsonText(raw: string): unknown {
  try {
    return JSON.parse(raw.trim());
  } catch {
    throw new JsonParseError(
      'AIが生成したJSONを正しく読み取れませんでした。コードブロック内のJSONのみをコピーして貼り付けてください'
    );
  }
}
