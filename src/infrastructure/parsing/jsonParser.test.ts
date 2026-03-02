import { describe, expect, it } from 'vitest';
import { JsonParseError, parseJsonText } from './jsonParser';

describe('parseJsonText', () => {
  it('parses plain JSON text', () => {
    expect(parseJsonText('{"title":"ok"}')).toEqual({ title: 'ok' });
  });

  it('parses JSON with surrounding whitespace', () => {
    expect(parseJsonText('  { "title": "ok" }  ')).toEqual({ title: 'ok' });
  });

  it('throws JsonParseError when no JSON can be parsed', () => {
    expect(() => parseJsonText('not json')).toThrow(JsonParseError);
  });

  it('throws JsonParseError for fenced code block (not supported)', () => {
    const raw = ['```json', '{ "title": "ok" }', '```'].join('\n');
    expect(() => parseJsonText(raw)).toThrow(JsonParseError);
  });
});
