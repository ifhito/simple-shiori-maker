import { describe, expect, it } from 'vitest';
import { getLayoutMode } from './layoutMode';

describe('getLayoutMode', () => {
  it('returns mobile for target smartphone widths', () => {
    expect(getLayoutMode(375)).toBe('mobile');
    expect(getLayoutMode(390)).toBe('mobile');
    expect(getLayoutMode(430)).toBe('mobile');
  });

  it('returns desktop for wider widths', () => {
    expect(getLayoutMode(768)).toBe('desktop');
  });
});
