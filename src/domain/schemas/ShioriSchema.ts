import { z } from 'zod';
import { DesignSpecSchema } from './DesignSpecSchema';

// ── Primitive schemas ────────────────────────────────────────────────────────

/** YYYY-MM-DD */
const DateStringSchema = z
  .string()
  .min(1, 'は必須文字列です')
  .superRefine((v, ctx) => {
    if (v.length === 0) return; // already caught by min(1)
    if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'は YYYY-MM-DD 形式である必要があります' });
    }
  });

/** HH:mm or H:mm — normalises single-digit hour to 09:30 via transform */
const TimeSchema = z
  .string()
  .min(1, 'は必須文字列です')
  .superRefine((v, ctx) => {
    if (v.length === 0) return;
    if (!/^\d{1,2}:\d{2}$/.test(v)) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'は HH:mm 形式である必要があります' });
      return;
    }
    const [h, m] = v.split(':').map(Number);
    if (h < 0 || h > 23 || m < 0 || m > 59) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: 'は HH:mm 形式である必要があります' });
    }
  })
  .transform((v) => v.replace(/^(\d):/, '0$1:'));

/** YYYY-MM-DDTHH:mm */
const DateTimeStringSchema = z
  .string()
  .min(1, 'は必須文字列です')
  .superRefine((v, ctx) => {
    if (v.length === 0) return;
    if (!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(v)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'は YYYY-MM-DDTHH:mm 形式である必要があります'
      });
    }
  });

// ── Item ─────────────────────────────────────────────────────────────────────

export const ShioriItemSchema = z.object(
  {
    time: TimeSchema,
    title: z.string().min(1, 'は必須文字列です'),
    description: z.string().min(1, 'は必須文字列です'),
    place: z.string().min(1, 'は必須文字列です'),
    mapUrl: z.string({ invalid_type_error: 'は文字列である必要があります' }).optional()
  },
  { invalid_type_error: 'はオブジェクトである必要があります' }
);

// ── Day ──────────────────────────────────────────────────────────────────────

export const ShioriDaySchema = z
  .object(
    {
      date: DateStringSchema,
      label: z.string().min(1, 'は必須文字列です'),
      items: z.array(ShioriItemSchema, { invalid_type_error: 'は配列である必要があります' })
    },
    { invalid_type_error: 'はオブジェクトである必要があります' }
  )
  .superRefine((day, ctx) => {
    // Chronological order check — runs after items have been transformed (times normalised)
    for (let i = 1; i < day.items.length; i++) {
      if (day.items[i - 1].time > day.items[i].time) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items'],
          message: 'は時系列順である必要があります'
        });
        break;
      }
    }
  });

// ── Root ─────────────────────────────────────────────────────────────────────

export const ShioriSchema = z.object(
  {
    title: z.string().min(1, 'は必須文字列です'),
    destination: z.string().min(1, 'は必須文字列です'),
    startDateTime: DateTimeStringSchema,
    endDateTime: DateTimeStringSchema,
    days: z
      .array(ShioriDaySchema, { invalid_type_error: 'は配列である必要があります' })
      .min(1, 'は1件以上必要です'),
    design: DesignSpecSchema
  },
  { invalid_type_error: 'JSON全体はオブジェクトである必要があります' }
);
