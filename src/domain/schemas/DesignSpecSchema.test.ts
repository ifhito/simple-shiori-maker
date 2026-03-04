import { describe, expect, it } from 'vitest';
import { DesignSpecSchema } from './DesignSpecSchema';
import { formatZodIssues } from './zodErrorBridge';

function issues(input: unknown): string[] {
  const r = DesignSpecSchema.safeParse(input);
  if (r.success) return [];
  return formatZodIssues(r.error);
}

describe('DesignSpecSchema — valid input', () => {
  it('accepts full valid design spec', () => {
    const r = DesignSpecSchema.safeParse({
      v: 1,
      layout: {
        preset: 'ticket',
        density: 'compact',
        cornerRadius: 20,
        showDaySeparators: true
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
      motif: { kind: 'train' }
    });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.v).toBe(1);
    expect(r.data.layout.preset).toBe('ticket');
  });

  it('accepts all layout presets', () => {
    for (const preset of ['timeline', 'ticket', 'metro', 'cards', 'serpentine']) {
      const r = DesignSpecSchema.safeParse({ v: 1, layout: { preset } });
      expect(r.success, `preset=${preset}`).toBe(true);
    }
  });

  it('accepts arbitrary motif kind string', () => {
    const r = DesignSpecSchema.safeParse({ v: 1, layout: { preset: 'metro' }, motif: { kind: 'wavy-road' } });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.motif?.kind).toBe('wavy-road');
  });
});

describe('DesignSpecSchema — error cases', () => {
  it('invalid preset produces a DomainValidationError-compatible string', () => {
    const errs = issues({ v: 1, layout: { preset: 'hacked' } });
    expect(errs.length).toBeGreaterThan(0);
    expect(errs[0]).toMatch(/AIに生成したJSON/);
  });

  it('invalid palette color produces error', () => {
    const errs = issues({ v: 1, layout: { preset: 'timeline' }, palette: { bg: 'red' } });
    expect(errs.length).toBeGreaterThan(0);
    expect(errs[0]).toMatch(/hex/);
  });

  it('cornerRadius out of range produces error', () => {
    const errs = issues({ v: 1, layout: { preset: 'timeline', cornerRadius: 99 } });
    expect(errs.length).toBeGreaterThan(0);
  });

  it('wrong v value produces error', () => {
    const errs = issues({ v: 2, layout: { preset: 'timeline' } });
    expect(errs.length).toBeGreaterThan(0);
    expect(errs[0]).toMatch(/design\.vは1/);
  });
});
