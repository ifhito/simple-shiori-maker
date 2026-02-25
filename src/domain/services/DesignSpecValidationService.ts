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
    throw new DomainValidationError([
      'AIに生成したJSONを修正するよう依頼してください: デザインのpalette設定はオブジェクトである必要があります'
    ]);
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
      errors.push(
        `AIに生成したJSONを修正するよう依頼してください: デザインの色(${key})が正しいhex値ではありません`
      );
    }
  }

  if (errors.length > 0) {
    throw new DomainValidationError(errors);
  }

  return value as DesignPalette;
}

function validateMotif(value: unknown): DesignMotif {
  if (!isObject(value)) {
    throw new DomainValidationError([
      'AIに生成したJSONを修正するよう依頼してください: デザインのmotif設定はオブジェクトである必要があります'
    ]);
  }

  const errors: string[] = [];

  if (value.kind !== undefined) {
    if (typeof value.kind !== 'string' || value.kind.trim().length === 0) {
      errors.push(
        'AIに生成したJSONを修正するよう依頼してください: デザインのmotif.kindは文字列である必要があります'
      );
    } else if (value.kind.length > 32) {
      errors.push(
        'AIに生成したJSONを修正するよう依頼してください: デザインのmotif.kindは32文字以内にしてください'
      );
    }
  }

  if (errors.length > 0) {
    throw new DomainValidationError(errors);
  }

  return value as DesignMotif;
}

function validateLayout(value: unknown): DesignLayout {
  if (!isObject(value)) {
    throw new DomainValidationError([
      'AIに生成したJSONを修正するよう依頼してください: デザインのlayout設定はオブジェクトである必要があります'
    ]);
  }

  const errors: string[] = [];

  const presetAllow: LayoutPreset[] = ['timeline', 'ticket', 'metro', 'cards', 'serpentine'];
  if (typeof value.preset !== 'string' || !presetAllow.includes(value.preset as LayoutPreset)) {
    errors.push(
      'AIに生成したJSONを修正するよう依頼してください: デザインのlayout.presetが不正です（timeline/ticket/metro/cards/serpentineのいずれかにしてください）'
    );
  }

  if (value.density !== undefined) {
    const densityAllow: LayoutDensity[] = ['compact', 'comfortable'];
    if (
      typeof value.density !== 'string' ||
      !densityAllow.includes(value.density as LayoutDensity)
    ) {
      errors.push(
        'AIに生成したJSONを修正するよう依頼してください: デザインのlayout.densityが不正です（compact/comfortableのいずれかにしてください）'
      );
    }
  }

  if (value.cornerRadius !== undefined) {
    if (typeof value.cornerRadius !== 'number' || !Number.isFinite(value.cornerRadius)) {
      errors.push(
        'AIに生成したJSONを修正するよう依頼してください: デザインのlayout.cornerRadiusは数値である必要があります'
      );
    } else if (value.cornerRadius < 0 || value.cornerRadius > 28) {
      errors.push(
        'AIに生成したJSONを修正するよう依頼してください: デザインのlayout.cornerRadiusは0〜28の範囲にしてください'
      );
    }
  }

  if (value.showDaySeparators !== undefined && typeof value.showDaySeparators !== 'boolean') {
    errors.push(
      'AIに生成したJSONを修正するよう依頼してください: デザインのlayout.showDaySeparatorsはtrueかfalseにしてください'
    );
  }

  if (errors.length > 0) {
    throw new DomainValidationError(errors);
  }

  return value as unknown as DesignLayout;
}

export function validateDesignSpec(value: unknown): DesignSpec {
  if (!isObject(value)) {
    throw new DomainValidationError([
      'AIに生成したJSONを修正するよう依頼してください: designはオブジェクトである必要があります'
    ]);
  }

  const errors: string[] = [];
  if (value.v !== 1) {
    errors.push('AIに生成したJSONを修正するよう依頼してください: design.vは1にしてください');
  }
  if (!isObject(value.layout)) {
    errors.push('AIに生成したJSONを修正するよう依頼してください: design.layoutは必須です');
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

  return value as unknown as DesignSpec;
}
