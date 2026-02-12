import { describe, expect, it } from 'vitest';
import type { Shiori } from '../../domain/entities/Shiori';
import {
  CompactShioriFormatError,
  fromCompactShiori,
  toCompactShiori
} from './shioriCompactMapper';

const source: Shiori = {
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
          mapUrl: 'https://example.com/map'
        }
      ]
    }
  ]
};

describe('shioriCompactMapper', () => {
  it('compacts shiori and keeps mapUrl when present', () => {
    const compact = toCompactShiori(source);

    expect(compact).toEqual({
      cv: 1,
      t: '箱根1泊2日しおり',
      d: '箱根',
      s: '2026-03-20T09:00',
      e: '2026-03-21T18:00',
      y: [
        [
          '2026-03-20',
          'DAY 1',
          [['09:00', '新宿駅集合', 'ロマンスカーで移動', '新宿駅', 'https://example.com/map']]
        ]
      ]
    });
  });

  it('restores regular shiori from compact shape with mapUrl', () => {
    const restored = fromCompactShiori({
      cv: 1,
      t: '箱根1泊2日しおり',
      d: '箱根',
      s: '2026-03-20T09:00',
      e: '2026-03-21T18:00',
      y: [
        [
          '2026-03-20',
          'DAY 1',
          [['09:00', '新宿駅集合', 'ロマンスカーで移動', '新宿駅', 'https://example.com/map']]
        ]
      ]
    });

    expect(restored).toEqual({
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
              mapUrl: 'https://example.com/map'
            }
          ]
        }
      ]
    });
  });

  it('round trips through compact format', () => {
    const roundTripped = fromCompactShiori(toCompactShiori(source));

    expect(roundTripped).toEqual(source);
  });

  it('supports legacy compact item without mapUrl', () => {
    const restored = fromCompactShiori({
      cv: 1,
      t: '箱根1泊2日しおり',
      d: '箱根',
      s: '2026-03-20T09:00',
      e: '2026-03-21T18:00',
      y: [['2026-03-20', 'DAY 1', [['09:00', '新宿駅集合', 'ロマンスカーで移動', '新宿駅']]]]
    });

    expect(restored.days[0].items[0]).toEqual({
      time: '09:00',
      title: '新宿駅集合',
      description: 'ロマンスカーで移動',
      place: '新宿駅'
    });
  });

  it('throws for malformed compact payload', () => {
    expect(() => fromCompactShiori({ cv: 1, t: 'x', d: 'y', s: 'z', e: 'w', y: [123] })).toThrow(
      CompactShioriFormatError
    );
  });
});
