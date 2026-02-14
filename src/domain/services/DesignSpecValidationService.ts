import type {
  DesignLayout,
  DesignMotif,
  DesignPalette,
  DesignSpec,
  LayoutDensity,
  LayoutPreset
} from '../entities/DesignSpec';
import { DomainValidationError } from './ShioriValidationService';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isHexColor(value: string): boolean {
  return /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(value);
}

function validatePalette(value: unknown): DesignPalette {
  if (!isObject(value)) {
    throw new DomainValidationError(['design.palette はオブジェクトである必要があります']);
  }

  const errors: string[] = [];
  const keys: (keyof DesignPalette)[] = [
    'bg',
    'panel',
    'text',
    'muted',
    'line',
    'accent',
    'accentDark'
  ];

  for (const key of keys) {
    const raw = value[key];
    if (raw === undefined) {
      continue;
    }
    if (typeof raw !== 'string' || !isHexColor(raw)) {
      errors.push(`design.palette.${key} は hex color (#RGB or #RRGGBB) である必要があります`);
    }
  }

  if (errors.length > 0) {
    throw new DomainValidationError(errors);
  }

  return value as DesignPalette;
}

function validateMotif(value: unknown): DesignMotif {
  if (!isObject(value)) {
    throw new DomainValidationError(['design.motif はオブジェクトである必要があります']);
  }

  const errors: string[] = [];

  if (value.kind !== undefined) {
    const allow: DesignMotif['kind'][] = ['train', 'nature', 'beach', 'city', 'food', 'minimal'];
    if (typeof value.kind !== 'string' || !allow.includes(value.kind as DesignMotif['kind'])) {
      errors.push('design.motif.kind が不正です');
    }
  }

  if (value.heroEmojis !== undefined) {
    if (!Array.isArray(value.heroEmojis)) {
      errors.push('design.motif.heroEmojis は配列である必要があります');
    } else if (value.heroEmojis.length > 3) {
      errors.push('design.motif.heroEmojis は最大3個までです');
    } else {
      for (let i = 0; i < value.heroEmojis.length; i += 1) {
        const emoji = value.heroEmojis[i];
        if (typeof emoji !== 'string' || emoji.trim().length === 0 || emoji.length > 4) {
          errors.push(`design.motif.heroEmojis[${i}] は短い文字列である必要があります`);
        }
      }
    }
  }

  if (errors.length > 0) {
    throw new DomainValidationError(errors);
  }

  return value as DesignMotif;
}

function validateLayout(value: unknown): DesignLayout {
  if (!isObject(value)) {
    throw new DomainValidationError(['design.layout はオブジェクトである必要があります']);
  }

  const errors: string[] = [];

  const presetAllow: LayoutPreset[] = ['timeline', 'ticket', 'metro', 'cards'];
  if (typeof value.preset !== 'string' || !presetAllow.includes(value.preset as LayoutPreset)) {
    errors.push('design.layout.preset が不正です');
  }

  if (value.density !== undefined) {
    const densityAllow: LayoutDensity[] = ['compact', 'comfortable'];
    if (typeof value.density !== 'string' || !densityAllow.includes(value.density as LayoutDensity)) {
      errors.push('design.layout.density が不正です');
    }
  }

  if (value.cornerRadius !== undefined) {
    if (typeof value.cornerRadius !== 'number' || !Number.isFinite(value.cornerRadius)) {
      errors.push('design.layout.cornerRadius は数値である必要があります');
    } else if (value.cornerRadius < 0 || value.cornerRadius > 28) {
      errors.push('design.layout.cornerRadius は 0..28 の範囲である必要があります');
    }
  }

  if (value.showDaySeparators !== undefined && typeof value.showDaySeparators !== 'boolean') {
    errors.push('design.layout.showDaySeparators は boolean である必要があります');
  }

  if (errors.length > 0) {
    throw new DomainValidationError(errors);
  }

  return value as DesignLayout;
}

export function validateDesignSpec(value: unknown): DesignSpec {
  if (!isObject(value)) {
    throw new DomainValidationError(['design はオブジェクトである必要があります']);
  }

  const errors: string[] = [];
  if (value.v !== 1) {
    errors.push('design.v が不正です');
  }
  if (!isObject(value.layout)) {
    errors.push('design.layout は必須です');
  }
  if (errors.length > 0) {
    throw new DomainValidationError(errors);
  }

  validateLayout(value.layout);
  if (value.palette !== undefined) {
    validatePalette(value.palette);
  }
  if (value.motif !== undefined) {
    validateMotif(value.motif);
  }

  return value as DesignSpec;
}
