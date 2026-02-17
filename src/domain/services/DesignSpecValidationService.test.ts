import { describe, expect, it } from 'vitest';
import { DomainValidationError } from './ShioriValidationService';
import { validateDesignSpec } from './DesignSpecValidationService';

describe('DesignSpecValidationService', () => {
  it('accepts a valid design spec', () => {
    const result = validateDesignSpec({
      v: 1,
      layout: {
        preset: 'ticket',
        density: 'compact',
        cornerRadius: 20
      },
      palette: {
        bg: '#fdfaf1',
        panel: '#fffdf7',
        text: '#2e2d2a',
        muted: '#6f6a5f',
        line: '#d5c99c',
        accent: '#f0c300',
        accentDark: '#9f7b11'
      },
      motif: {
        kind: 'train',
        heroEmojis: ['🚃', '🟡']
      }
    });

    expect(result.v).toBe(1);
    expect(result.layout.preset).toBe('ticket');
  });

  it('accepts arbitrary motif kind string', () => {
    const result = validateDesignSpec({
      v: 1,
      layout: { preset: 'metro' },
      motif: { kind: 'wavy-road', heroEmojis: ['🌀', '🚄', '🍣'] }
    });

    expect(result.motif?.kind).toBe('wavy-road');
  });

  it('throws for invalid preset', () => {
    expect(() =>
      validateDesignSpec({
        v: 1,
        layout: { preset: 'hacked' }
      })
    ).toThrow(DomainValidationError);
  });

  it('accepts serpentine preset', () => {
    const result = validateDesignSpec({
      v: 1,
      layout: { preset: 'serpentine' }
    });

    expect(result.layout.preset).toBe('serpentine');
  });

  it('throws for invalid palette colors', () => {
    expect(() =>
      validateDesignSpec({
        v: 1,
        layout: { preset: 'timeline' },
        palette: {
          bg: 'red'
        }
      })
    ).toThrow(DomainValidationError);
  });
});
