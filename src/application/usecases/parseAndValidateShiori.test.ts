import { describe, expect, it } from 'vitest';
import { parseAndValidateShioriJson } from './parseAndValidateShiori';
import type { Shiori } from '../../domain/entities/Shiori';

const mockShiori: Shiori = {
  title: 'Test Trip',
  destination: 'Tokyo',
  startDateTime: '2026-01-01T10:00',
  endDateTime: '2026-01-02T18:00',
  days: [],
  design: { layout: 'classic', colorScheme: 'default' } as unknown as Shiori['design']
};

describe('parseAndValidateShioriJson', () => {
  it('returns validated Shiori when parse and validation succeed', () => {
    const deps = {
      parseJsonText: (_raw: string) => ({ title: 'Test Trip' }),
      validateShioriData: (_value: unknown) => mockShiori
    };

    const result = parseAndValidateShioriJson('{"title":"Test Trip"}', deps);
    expect(result).toBe(mockShiori);
  });

  it('propagates errors from parseJsonText', () => {
    const parseError = new Error('invalid JSON');
    const deps = {
      parseJsonText: (_raw: string) => { throw parseError; },
      validateShioriData: (_value: unknown) => mockShiori
    };

    expect(() => parseAndValidateShioriJson('bad json', deps)).toThrow(parseError);
  });

  it('propagates errors from validateShioriData', () => {
    const validationError = new Error('field missing: title');
    const deps = {
      parseJsonText: (_raw: string) => ({}),
      validateShioriData: (_value: unknown) => { throw validationError; }
    };

    expect(() => parseAndValidateShioriJson('{}', deps)).toThrow(validationError);
  });

  it('passes raw string to parseJsonText', () => {
    let capturedRaw: string | undefined;
    const deps = {
      parseJsonText: (raw: string) => { capturedRaw = raw; return {}; },
      validateShioriData: (_value: unknown) => mockShiori
    };

    parseAndValidateShioriJson('{"key":"value"}', deps);
    expect(capturedRaw).toBe('{"key":"value"}');
  });

  it('passes parsed value to validateShioriData', () => {
    const parsed = { title: 'from parser' };
    let capturedValue: unknown;
    const deps = {
      parseJsonText: (_raw: string) => parsed,
      validateShioriData: (value: unknown) => { capturedValue = value; return mockShiori; }
    };

    parseAndValidateShioriJson('...', deps);
    expect(capturedValue).toBe(parsed);
  });
});
