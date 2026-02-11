import type { Shiori, ShioriDay, ShioriItem } from '../entities/Shiori';

export class DomainValidationError extends Error {
  readonly details: string[];

  constructor(details: string[]) {
    super(details.join('\n'));
    this.name = 'DomainValidationError';
    this.details = details;
  }
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTime(value: string): boolean {
  if (!/^\d{2}:\d{2}$/.test(value)) {
    return false;
  }
  const [hour, minute] = value.split(':').map((segment) => Number(segment));
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function isDateTime(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value)) {
    return false;
  }
  const [date, time] = value.split('T');
  return isDate(date) && isTime(time);
}

function validateItem(item: unknown, dayIndex: number, itemIndex: number): ShioriItem {
  if (!isObject(item)) {
    throw new DomainValidationError([
      `days[${dayIndex}].items[${itemIndex}] はオブジェクトである必要があります`
    ]);
  }

  const errors: string[] = [];

  if (!isNonEmptyString(item.time)) {
    errors.push(`days[${dayIndex}].items[${itemIndex}].time は必須文字列です`);
  } else if (!isTime(item.time)) {
    errors.push(`days[${dayIndex}].items[${itemIndex}].time は HH:mm 形式である必要があります`);
  }
  if (!isNonEmptyString(item.title)) {
    errors.push(`days[${dayIndex}].items[${itemIndex}].title は必須文字列です`);
  }
  if (!isNonEmptyString(item.description)) {
    errors.push(`days[${dayIndex}].items[${itemIndex}].description は必須文字列です`);
  }
  if (!isNonEmptyString(item.place)) {
    errors.push(`days[${dayIndex}].items[${itemIndex}].place は必須文字列です`);
  }
  if (item.mapUrl !== undefined && typeof item.mapUrl !== 'string') {
    errors.push(`days[${dayIndex}].items[${itemIndex}].mapUrl は文字列である必要があります`);
  }

  if (errors.length > 0) {
    throw new DomainValidationError(errors);
  }

  return {
    time: item.time,
    title: item.title,
    description: item.description,
    place: item.place,
    mapUrl: item.mapUrl
  };
}

function validateDay(day: unknown, dayIndex: number): ShioriDay {
  if (!isObject(day)) {
    throw new DomainValidationError([`days[${dayIndex}] はオブジェクトである必要があります`]);
  }

  const errors: string[] = [];

  if (!isNonEmptyString(day.date)) {
    errors.push(`days[${dayIndex}].date は必須文字列です`);
  } else if (!isDate(day.date)) {
    errors.push(`days[${dayIndex}].date は YYYY-MM-DD 形式である必要があります`);
  }
  if (!isNonEmptyString(day.label)) {
    errors.push(`days[${dayIndex}].label は必須文字列です`);
  }
  if (!Array.isArray(day.items)) {
    errors.push(`days[${dayIndex}].items は配列である必要があります`);
  }

  if (errors.length > 0) {
    throw new DomainValidationError(errors);
  }

  const timeStrings = day.items.map((item) => (isObject(item) && typeof item.time === 'string' ? item.time : ''));
  for (let i = 1; i < timeStrings.length; i += 1) {
    if (timeStrings[i - 1] > timeStrings[i]) {
      errors.push(`days[${dayIndex}].items は時系列順である必要があります`);
      break;
    }
  }

  if (errors.length > 0) {
    throw new DomainValidationError(errors);
  }

  return {
    date: day.date,
    label: day.label,
    items: day.items.map((item, itemIndex) => validateItem(item, dayIndex, itemIndex))
  };
}

export function validateShioriData(value: unknown): Shiori {
  if (!isObject(value)) {
    throw new DomainValidationError(['JSON全体はオブジェクトである必要があります']);
  }

  const errors: string[] = [];

  if (!isNonEmptyString(value.title)) {
    errors.push('title は必須文字列です');
  }
  if (!isNonEmptyString(value.destination)) {
    errors.push('destination は必須文字列です');
  }
  if (!isNonEmptyString(value.startDateTime)) {
    errors.push('startDateTime は必須文字列です');
  } else if (!isDateTime(value.startDateTime)) {
    errors.push('startDateTime は YYYY-MM-DDTHH:mm 形式である必要があります');
  }
  if (!isNonEmptyString(value.endDateTime)) {
    errors.push('endDateTime は必須文字列です');
  } else if (!isDateTime(value.endDateTime)) {
    errors.push('endDateTime は YYYY-MM-DDTHH:mm 形式である必要があります');
  }
  if (!Array.isArray(value.days)) {
    errors.push('days は配列である必要があります');
  }

  if (errors.length > 0) {
    throw new DomainValidationError(errors);
  }

  const days = value.days.map((day, dayIndex) => validateDay(day, dayIndex));
  if (days.length === 0) {
    throw new DomainValidationError(['days は1件以上必要です']);
  }

  return {
    title: value.title,
    destination: value.destination,
    startDateTime: value.startDateTime,
    endDateTime: value.endDateTime,
    days
  };
}

export function validateShioriJsonString(raw: string): Shiori {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new DomainValidationError(['JSONの構文が不正です']);
  }
  return validateShioriData(parsed);
}
