import type { Shiori } from '../../domain/entities/Shiori';

type CompactItem = [time: string, title: string, description: string, place: string];
type CompactDay = [date: string, label: string, items: CompactItem[]];

export interface CompactShiori {
  cv: 1;
  t: string;
  d: string;
  s: string;
  e: string;
  y: CompactDay[];
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
  if (!Array.isArray(value) || value.length !== 4 || !value.every(isNonEmptyString)) {
    throw new CompactShioriFormatError();
  }
  return [value[0], value[1], value[2], value[3]];
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
  return {
    cv: 1,
    t: shiori.title,
    d: shiori.destination,
    s: shiori.startDateTime,
    e: shiori.endDateTime,
    y: shiori.days.map((day) => [
      day.date,
      day.label,
      day.items.map((item) => [item.time, item.title, item.description, item.place])
    ])
  };
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
    !Array.isArray(value.y)
  ) {
    throw new CompactShioriFormatError();
  }

  return {
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
          const [time, title, description, place] = item;
          return { time, title, description, place };
        })
      };
    })
  };
}
