import { z } from 'zod';
import type { DesignSpec } from '../../domain/entities/DesignSpec';
import type { Shiori } from '../../domain/entities/Shiori';
import { DesignSpecSchema } from '../../domain/schemas/DesignSpecSchema';

// ── Internal Zod schema for the compact wire format ──────────────────────────

const CompactItemSchema = z.union([
  z.tuple([z.string().min(1), z.string().min(1), z.string().min(1), z.string().min(1)]),
  z.tuple([
    z.string().min(1),
    z.string().min(1),
    z.string().min(1),
    z.string().min(1),
    z.string()
  ])
]);

const CompactDaySchema = z.tuple([
  z.string().min(1),
  z.string().min(1),
  z.array(CompactItemSchema)
]);

const CompactShioriSchema = z.object({
  cv: z.literal(1),
  t: z.string().min(1),
  d: z.string().min(1),
  s: z.string().min(1),
  e: z.string().min(1),
  y: z.array(CompactDaySchema),
  g: DesignSpecSchema
});

// ── Public types ─────────────────────────────────────────────────────────────

type CompactItem =
  | [time: string, title: string, description: string, place: string]
  | [time: string, title: string, description: string, place: string, mapUrl: string];
type CompactDay = [date: string, label: string, items: CompactItem[]];

export interface CompactShiori {
  cv: 1;
  t: string;
  d: string;
  s: string;
  e: string;
  y: CompactDay[];
  g: DesignSpec;
}

export class CompactShioriFormatError extends Error {
  constructor(message = '暗号化データの形式が不正です') {
    super(message);
    this.name = 'CompactShioriFormatError';
  }
}

// ── Public functions ──────────────────────────────────────────────────────────

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
      day.items.map((item) => {
        if (item.mapUrl === undefined) {
          return [item.time, item.title, item.description, item.place];
        }
        return [item.time, item.title, item.description, item.place, item.mapUrl];
      })
    ]),
    g: shiori.design
  };
}

export function fromCompactShiori(value: unknown): Shiori {
  const result = CompactShioriSchema.safeParse(value);
  if (!result.success) {
    throw new CompactShioriFormatError();
  }

  const c = result.data;
  return {
    title: c.t,
    destination: c.d,
    startDateTime: c.s,
    endDateTime: c.e,
    days: c.y.map(([date, label, items]) => ({
      date,
      label,
      items: items.map((item) => {
        const [time, title, description, place, mapUrl] = item;
        if (mapUrl === undefined) {
          return { time, title, description, place };
        }
        return { time, title, description, place, mapUrl };
      })
    })),
    design: c.g as unknown as DesignSpec
  };
}
