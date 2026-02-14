import { describe, expect, it } from 'vitest';
import { JsonParseError, parseJsonText } from './jsonParser';

describe('parseJsonText', () => {
  it('parses plain JSON text', () => {
    expect(parseJsonText('{"title":"ok"}')).toEqual({ title: 'ok' });
  });

  it('parses JSON inside a fenced ```json block', () => {
    const raw = [
      'Here is your shiori JSON:',
      '```json',
      '{ "title": "ok" }',
      '```',
      'Enjoy!'
    ].join('\n');

    expect(parseJsonText(raw)).toEqual({ title: 'ok' });
  });

  it('parses JSON inside an untyped fenced ``` block', () => {
    const raw = ['```', '{ "title": "ok" }', '```'].join('\n');
    expect(parseJsonText(raw)).toEqual({ title: 'ok' });
  });

  it('falls back to parsing a bracketed JSON object substring', () => {
    const raw = 'prefix { "title": "ok" } suffix';
    expect(parseJsonText(raw)).toEqual({ title: 'ok' });
  });

  it('throws JsonParseError when no JSON can be parsed', () => {
    expect(() => parseJsonText('not json')).toThrow(JsonParseError);
  });
});

