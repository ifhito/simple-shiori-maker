import { describe, expect, it } from 'vitest';
import {
  DomainValidationError,
  validateShioriData,
  validateShioriJsonString
} from './ShioriValidationService';

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
          place: '新宿駅',
          mapUrl: 'https://maps.google.com/?q=新宿駅'
        }
      ]
    }
  ]
};

describe('ShioriValidationService', () => {
  it('accepts valid data', () => {
    const result = validateShioriData(validInput);
    expect(result.title).toBe('箱根1泊2日しおり');
    expect(result.days).toHaveLength(1);
  });

  it('accepts valid data with design spec', () => {
    const result = validateShioriData({
      ...validInput,
      design: {
        v: 1,
        layout: { preset: 'metro', density: 'comfortable', cornerRadius: 18 },
        motif: { kind: 'train', heroEmojis: ['🚃', '🗺️'] }
      }
    });
    expect(result.days).toHaveLength(1);
  });

  it('throws when design spec is invalid', () => {
    expect(() =>
      validateShioriData({
        ...validInput,
        design: {
          v: 1,
          layout: { preset: 'evil' }
        }
      })
    ).toThrow(DomainValidationError);
  });

  it('throws for invalid date/time formats', () => {
    expect(() =>
      validateShioriData({
        ...validInput,
        startDateTime: '2026/03/20 09:00',
        days: [
          {
            ...validInput.days[0],
            date: '2026/03/20',
            items: [{ ...validInput.days[0].items[0], time: '9:00' }]
          }
        ]
      })
    ).toThrow(DomainValidationError);
  });

  it('throws when items are not in chronological order', () => {
    expect(() =>
      validateShioriData({
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
    ).toThrow(DomainValidationError);
  });

  it('throws for missing fields', () => {
    expect(() =>
      validateShioriData({
        ...validInput,
        days: [
          {
            ...validInput.days[0],
            items: [{ ...validInput.days[0].items[0], place: '' }]
          }
        ]
      })
    ).toThrow(DomainValidationError);
  });

  it('throws for type mismatch', () => {
    expect(() =>
      validateShioriData({
        ...validInput,
        days: 'invalid'
      })
    ).toThrow(DomainValidationError);
  });

  it('throws for invalid JSON text', () => {
    expect(() => validateShioriJsonString('{invalid')).toThrow(DomainValidationError);
  });
});
