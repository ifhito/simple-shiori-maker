export class JsonParseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'JsonParseError';
  }
}

function tryParseJson(text: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) };
  } catch {
    return { ok: false };
  }
}

function* iterFencedCodeBlocks(text: string): Generator<{ lang: string; content: string }> {
  const fence = '```';
  let index = 0;

  while (index < text.length) {
    const start = text.indexOf(fence, index);
    if (start === -1) {
      return;
    }

    const langLineEnd = text.indexOf('\n', start + fence.length);
    if (langLineEnd === -1) {
      return;
    }

    const lang = text.slice(start + fence.length, langLineEnd).trim().toLowerCase();
    const end = text.indexOf(fence, langLineEnd + 1);
    if (end === -1) {
      return;
    }

    const content = text.slice(langLineEnd + 1, end).trim();
    yield { lang, content };

    index = end + fence.length;
  }
}

function extractLikelyJsonSubstring(text: string): string | null {
  const trimmed = text.trim();

  // Try object root first.
  const objStart = trimmed.indexOf('{');
  const objEnd = trimmed.lastIndexOf('}');
  if (objStart !== -1 && objEnd !== -1 && objStart < objEnd) {
    return trimmed.slice(objStart, objEnd + 1);
  }

  // Fallback: array root.
  const arrStart = trimmed.indexOf('[');
  const arrEnd = trimmed.lastIndexOf(']');
  if (arrStart !== -1 && arrEnd !== -1 && arrStart < arrEnd) {
    return trimmed.slice(arrStart, arrEnd + 1);
  }

  return null;
}

export function parseJsonText(raw: string): unknown {
  const trimmed = raw.trim();

  const direct = tryParseJson(trimmed);
  if (direct.ok) {
    return direct.value;
  }

  // Accept LLM outputs like:
  // ```json
  // { ... }
  // ```
  for (const block of iterFencedCodeBlocks(trimmed)) {
    const isJsonLang = block.lang === '' || block.lang.startsWith('json');
    if (!isJsonLang) {
      continue;
    }

    const parsed = tryParseJson(block.content);
    if (parsed.ok) {
      return parsed.value;
    }
  }

  // Last resort: try to parse the first/last bracketed region.
  const candidate = extractLikelyJsonSubstring(trimmed);
  if (candidate) {
    const parsed = tryParseJson(candidate);
    if (parsed.ok) {
      return parsed.value;
    }
  }

  throw new JsonParseError(
    '貼り付けた内容を読み取れませんでした（AIの回答に含まれる「```json」〜「```」の中身、または { ... } の部分だけ貼り付けてください）'
  );
}
