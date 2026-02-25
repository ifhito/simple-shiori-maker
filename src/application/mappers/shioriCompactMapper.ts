import type { DesignSpec } from '../../domain/entities/DesignSpec';
import type { Shiori } from '../../domain/entities/Shiori';
import { validateDesignSpec } from '../../domain/services/DesignSpecValidationService';

type CompactItem =
  | [time: string, title: string, description: string, place: string]
  | [time: string, title: string, description: string, place: string, mapUrl: string];
type CompactDay = [date: string, label: string, items: CompactItem[]];

export interface CompactShiori {
  cv: 1;           // schema version
  t: string;       // title
  d: string;       // destination
  s: string;       // startDateTime
  e: string;       // endDateTime
  y: CompactDay[]; // days
  g: DesignSpec;   // design（必須）
}

export class CompactShioriFormatError extends Error {
  constructor(message = '暗号化データの形式が不正です') {
    super(message);
    this.name = 'CompactShioriFormatError';
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function ensureCompactItem(value: unknown): CompactItem {
  if (!Array.isArray(value) || (value.length !== 4 && value.length !== 5)) {
    throw new CompactShioriFormatError();
  }

  const [time, title, description, place, mapUrl] = value;
  if (
    !isNonEmptyString(time) ||
    !isNonEmptyString(title) ||
    !isNonEmptyString(description) ||
    !isNonEmptyString(place)
  ) {
    throw new CompactShioriFormatError();
  }

  if (mapUrl !== undefined && typeof mapUrl !== 'string') {
    throw new CompactShioriFormatError();
  }

  if (mapUrl === undefined) {
    return [time, title, description, place];
  }

  return [time, title, description, place, mapUrl];
}

function ensureCompactDay(value: unknown): CompactDay {
  if (!Array.isArray(value) || value.length !== 3) {
    throw new CompactShioriFormatError();
  }
  const [date, label, items] = value;
  if (!isNonEmptyString(date) || !isNonEmptyString(label) || !Array.isArray(items)) {
    throw new CompactShioriFormatError();
  }
  return [date, label, items.map((item) => ensureCompactItem(item))];
}

export function toCompactShiori(shiori: Shiori): CompactShiori {
  const compact: CompactShiori = {
    cv: 1,
    t: shiori.title,
    d: shiori.destination,
    s: shiori.startDateTime,
    e: shiori.endDateTime,
    y: shiori.days.map((day) => [
      day.date,
      day.label,
      day.items.map((item) => {
        if (item.mapUrl === undefined) {
          return [item.time, item.title, item.description, item.place];
        }
        return [item.time, item.title, item.description, item.place, item.mapUrl];
      })
    ]),
    g: shiori.design
  };

  return compact;
}

export function fromCompactShiori(value: unknown): Shiori {
  if (!isObject(value)) {
    throw new CompactShioriFormatError();
  }

  if (
    value.cv !== 1 ||
    !isNonEmptyString(value.t) ||
    !isNonEmptyString(value.d) ||
    !isNonEmptyString(value.s) ||
    !isNonEmptyString(value.e) ||
    !Array.isArray(value.y) ||
    !isObject(value.g)
  ) {
    throw new CompactShioriFormatError();
  }

  const restored: Shiori = {
    title: value.t,
    destination: value.d,
    startDateTime: value.s,
    endDateTime: value.e,
    days: value.y.map((day) => {
      const [date, label, items] = ensureCompactDay(day);
      return {
        date,
        label,
        items: items.map((item) => {
          const [time, title, description, place, mapUrl] = item;
          if (mapUrl === undefined) {
            return { time, title, description, place };
          }
          return { time, title, description, place, mapUrl };
        })
      };
    }),
    design: validateDesignSpec(value.g)
  };

  return restored;
}
