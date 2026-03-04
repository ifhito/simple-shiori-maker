import { describe, expect, it } from 'vitest';
import { ShioriSchema } from './ShioriSchema';
import { formatZodIssues } from './zodErrorBridge';

const validInput = {
  title: '箱根1泊2日しおり',
  destination: '箱根',
  startDateTime: '2026-03-20T09:00',
  endDateTime: '2026-03-21T18:00',
  days: [
    {
      date: '2026-03-20',
      label: 'DAY 1',
      items: [
        {
          time: '09:00',
          title: '新宿駅集合',
          description: 'ロマンスカーで移動',
          place: '新宿駅'
        }
      ]
    }
  ],
  design: { v: 1, layout: { preset: 'timeline' } }
};

function issues(input: unknown): string[] {
  const r = ShioriSchema.safeParse(input);
  if (r.success) return [];
  return formatZodIssues(r.error);
}

describe('ShioriSchema — error string exact match', () => {
  it('root not object → JSON全体はオブジェクトである必要があります', () => {
    expect(issues(null)).toContain('JSON全体はオブジェクトである必要があります');
  });

  it('empty title → title は必須文字列です', () => {
    expect(issues({ ...validInput, title: '' })).toContain('title は必須文字列です');
  });

  it('empty destination → destination は必須文字列です', () => {
    expect(issues({ ...validInput, destination: '' })).toContain('destination は必須文字列です');
  });

  it('empty startDateTime → startDateTime は必須文字列です (exact humanizer match)', () => {
    expect(issues({ ...validInput, startDateTime: '' })).toContain(
      'startDateTime は必須文字列です'
    );
  });

  it('bad startDateTime format → exact humanizer match', () => {
    expect(issues({ ...validInput, startDateTime: '2026/03/20 09:00' })).toContain(
      'startDateTime は YYYY-MM-DDTHH:mm 形式である必要があります'
    );
  });

  it('empty endDateTime → exact humanizer match', () => {
    expect(issues({ ...validInput, endDateTime: '' })).toContain('endDateTime は必須文字列です');
  });

  it('bad endDateTime format → exact humanizer match', () => {
    expect(issues({ ...validInput, endDateTime: '21-18:00' })).toContain(
      'endDateTime は YYYY-MM-DDTHH:mm 形式である必要があります'
    );
  });

  it('days not array → days は配列である必要があります', () => {
    expect(issues({ ...validInput, days: 'bad' })).toContain('days は配列である必要があります');
  });

  it('empty days array → days は1件以上必要です', () => {
    expect(issues({ ...validInput, days: [] })).toContain('days は1件以上必要です');
  });

  it('day not object → days[0] はオブジェクトである必要があります', () => {
    expect(issues({ ...validInput, days: [123] })).toContain(
      'days[0] はオブジェクトである必要があります'
    );
  });

  it('empty day.date → days[0].date は必須文字列です', () => {
    expect(issues({ ...validInput, days: [{ ...validInput.days[0], date: '' }] })).toContain(
      'days[0].date は必須文字列です'
    );
  });

  it('bad day.date format → days[0].date は YYYY-MM-DD 形式である必要があります', () => {
    expect(
      issues({ ...validInput, days: [{ ...validInput.days[0], date: '2026/03/20' }] })
    ).toContain('days[0].date は YYYY-MM-DD 形式である必要があります');
  });

  it('empty day.label → days[0].label は必須文字列です', () => {
    expect(issues({ ...validInput, days: [{ ...validInput.days[0], label: '' }] })).toContain(
      'days[0].label は必須文字列です'
    );
  });

  it('items not array → days[0].items は配列である必要があります', () => {
    expect(
      issues({ ...validInput, days: [{ ...validInput.days[0], items: 'bad' }] })
    ).toContain('days[0].items は配列である必要があります');
  });

  it('items out of chronological order → days[0].items は時系列順である必要があります', () => {
    expect(
      issues({
        ...validInput,
        days: [
          {
            ...validInput.days[0],
            items: [
              { ...validInput.days[0].items[0], time: '15:00', title: '午後' },
              { ...validInput.days[0].items[0], time: '09:00', title: '午前' }
            ]
          }
        ]
      })
    ).toContain('days[0].items は時系列順である必要があります');
  });

  it('item not object → days[0].items[0] はオブジェクトである必要があります', () => {
    expect(
      issues({ ...validInput, days: [{ ...validInput.days[0], items: [123] }] })
    ).toContain('days[0].items[0] はオブジェクトである必要があります');
  });

  it('empty item.time → days[0].items[0].time は必須文字列です', () => {
    expect(
      issues({
        ...validInput,
        days: [{ ...validInput.days[0], items: [{ ...validInput.days[0].items[0], time: '' }] }]
      })
    ).toContain('days[0].items[0].time は必須文字列です');
  });

  it('bad item.time format → days[0].items[0].time は HH:mm 形式である必要があります', () => {
    expect(
      issues({
        ...validInput,
        days: [
          { ...validInput.days[0], items: [{ ...validInput.days[0].items[0], time: 'bad' }] }
        ]
      })
    ).toContain('days[0].items[0].time は HH:mm 形式である必要があります');
  });

  it('empty item.place → days[0].items[0].place は必須文字列です', () => {
    expect(
      issues({
        ...validInput,
        days: [{ ...validInput.days[0], items: [{ ...validInput.days[0].items[0], place: '' }] }]
      })
    ).toContain('days[0].items[0].place は必須文字列です');
  });
});

describe('ShioriSchema — valid input', () => {
  it('parses valid input and returns Shiori-shaped object', () => {
    const r = ShioriSchema.safeParse(validInput);
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.title).toBe('箱根1泊2日しおり');
    expect(r.data.days).toHaveLength(1);
  });

  it('normalises single-digit hour to HH:mm', () => {
    const r = ShioriSchema.safeParse({
      ...validInput,
      days: [
        {
          ...validInput.days[0],
          items: [{ ...validInput.days[0].items[0], time: '9:30' }]
        }
      ]
    });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.days[0].items[0].time).toBe('09:30');
  });

  it('9:30 before 10:00 passes chronological check after normalisation', () => {
    const r = ShioriSchema.safeParse({
      ...validInput,
      days: [
        {
          ...validInput.days[0],
          items: [
            { ...validInput.days[0].items[0], time: '9:30', title: '朝' },
            { ...validInput.days[0].items[0], time: '10:00', title: '昼前' }
          ]
        }
      ]
    });
    expect(r.success).toBe(true);
    if (!r.success) return;
    expect(r.data.days[0].items[0].time).toBe('09:30');
  });
});
