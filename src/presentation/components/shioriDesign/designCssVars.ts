import type { CSSProperties } from 'react';
import type { DesignSpec } from '../../../domain/entities/DesignSpec';

export function resolveDesignCssVars(design?: DesignSpec): CSSProperties {
  if (!design) {
    return {};
  }

  const vars: Record<string, string> = {};
  const palette = design.palette;

  if (palette?.bg) {
    vars['--bg'] = palette.bg;
  }
  if (palette?.panel) {
    vars['--panel'] = palette.panel;
  }
  if (palette?.text) {
    vars['--text'] = palette.text;
  }
  if (palette?.muted) {
    vars['--muted'] = palette.muted;
  }
  if (palette?.line) {
    vars['--line'] = palette.line;
  }
  if (palette?.accent) {
    vars['--accent'] = palette.accent;
  }
  if (palette?.accentDark) {
    vars['--accent-dark'] = palette.accentDark;
  }

  if (design.layout.cornerRadius !== undefined) {
    vars['--shiori-radius'] = `${design.layout.cornerRadius}px`;
  }

  return vars as CSSProperties;
}

