import { describe, expect, it } from 'vitest';
import {
  addDay,
  addItem,
  moveDayDown,
  moveDayUp,
  moveItemDown,
  moveItemUp,
  removeDay,
  removeItem,
  updateDayLabel,
  updateHeader,
  updateItem
} from '../application/usecases/editShiori';
import type { Shiori, ShioriItem } from '../domain/entities/Shiori';

const item1: ShioriItem = {
  time: '09:00',
  title: 'チェックイン',
  description: 'ホテル到着',
  place: 'グランドホテル'
};
const item2: ShioriItem = {
  time: '12:00',
  title: '昼食',
  description: 'ラーメン',
  place: '駅前食堂'
};
const item3: ShioriItem = {
  time: '15:00',
  title: '観光',
  description: '名所めぐり',
  place: '観光スポット'
};

const baseShiori: Shiori = {
  title: '箱根旅行',
  destination: '箱根',
  startDateTime: '2026-03-20T09:00',
  endDateTime: '2026-03-21T18:00',
  days: [
    { date: '2026-03-20', label: 'DAY 1', items: [item1, item2] },
    { date: '2026-03-21', label: 'DAY 2', items: [item3] }
  ]
};

describe('updateHeader', () => {
  it('updates title only', () => {
    const result = updateHeader(baseShiori, { title: '新タイトル' });
    expect(result.title).toBe('新タイトル');
    expect(result.destination).toBe(baseShiori.destination);
    expect(result.days).toBe(baseShiori.days); // reference equality (immutable)
  });

  it('updates multiple fields at once', () => {
    const result = updateHeader(baseShiori, {
      title: '富士旅行',
      destination: '富士山',
      startDateTime: '2026-04-01T08:00',
      endDateTime: '2026-04-02T20:00'
    });
    expect(result.title).toBe('富士旅行');
    expect(result.destination).toBe('富士山');
    expect(result.startDateTime).toBe('2026-04-01T08:00');
    expect(result.endDateTime).toBe('2026-04-02T20:00');
  });

  it('does not mutate original', () => {
    const original = { ...baseShiori };
    updateHeader(baseShiori, { title: '変更後' });
    expect(baseShiori.title).toBe(original.title);
  });
});

describe('updateDayLabel', () => {
  it('updates label for specified day', () => {
    const result = updateDayLabel(baseShiori, 0, '初日');
    expect(result.days[0].label).toBe('初日');
    expect(result.days[1].label).toBe('DAY 2');
  });

  it('preserves items when updating label', () => {
    const result = updateDayLabel(baseShiori, 0, '新ラベル');
    expect(result.days[0].items).toEqual(baseShiori.days[0].items);
  });

  it('does not mutate original', () => {
    updateDayLabel(baseShiori, 0, '変更後');
    expect(baseShiori.days[0].label).toBe('DAY 1');
  });
});

describe('updateItem', () => {
  it('updates specified item fields', () => {
    const result = updateItem(baseShiori, 0, 0, { title: '新タイトル', time: '10:00' });
    expect(result.days[0].items[0].title).toBe('新タイトル');
    expect(result.days[0].items[0].time).toBe('10:00');
    expect(result.days[0].items[0].description).toBe(item1.description);
  });

  it('preserves other items in the same day', () => {
    const result = updateItem(baseShiori, 0, 0, { title: '変更' });
    expect(result.days[0].items[1]).toEqual(item2);
  });

  it('does not mutate original', () => {
    updateItem(baseShiori, 0, 0, { title: '変更後' });
    expect(baseShiori.days[0].items[0].title).toBe(item1.title);
  });
});

describe('addItem', () => {
  it('appends a blank item to specified day', () => {
    const result = addItem(baseShiori, 0);
    expect(result.days[0].items).toHaveLength(3);
    const newItem = result.days[0].items[2];
    expect(newItem.time).toBe('');
    expect(newItem.title).toBe('');
    expect(newItem.description).toBe('');
    expect(newItem.place).toBe('');
  });

  it('does not affect other days', () => {
    const result = addItem(baseShiori, 0);
    expect(result.days[1].items).toHaveLength(1);
  });
});

describe('removeItem', () => {
  it('removes item at specified index', () => {
    const result = removeItem(baseShiori, 0, 0);
    expect(result.days[0].items).toHaveLength(1);
    expect(result.days[0].items[0]).toEqual(item2);
  });

  it('does not affect other days', () => {
    const result = removeItem(baseShiori, 0, 0);
    expect(result.days[1].items).toHaveLength(1);
  });
});

describe('moveItemUp', () => {
  it('swaps item with previous item', () => {
    const result = moveItemUp(baseShiori, 0, 1);
    expect(result.days[0].items[0]).toEqual(item2);
    expect(result.days[0].items[1]).toEqual(item1);
  });

  it('does nothing when already first', () => {
    const result = moveItemUp(baseShiori, 0, 0);
    expect(result.days[0].items[0]).toEqual(item1);
  });

  it('does not mutate original', () => {
    moveItemUp(baseShiori, 0, 1);
    expect(baseShiori.days[0].items[0]).toEqual(item1);
  });
});

describe('moveItemDown', () => {
  it('swaps item with next item', () => {
    const result = moveItemDown(baseShiori, 0, 0);
    expect(result.days[0].items[0]).toEqual(item2);
    expect(result.days[0].items[1]).toEqual(item1);
  });

  it('does nothing when already last', () => {
    const result = moveItemDown(baseShiori, 0, 1);
    expect(result.days[0].items[1]).toEqual(item2);
  });
});

describe('addDay', () => {
  it('appends a blank day', () => {
    const result = addDay(baseShiori);
    expect(result.days).toHaveLength(3);
    const newDay = result.days[2];
    expect(newDay.date).toBe('');
    expect(newDay.label).toBe('');
    expect(newDay.items).toHaveLength(0);
  });
});

describe('removeDay', () => {
  it('removes day at specified index', () => {
    const result = removeDay(baseShiori, 0);
    expect(result.days).toHaveLength(1);
    expect(result.days[0].label).toBe('DAY 2');
  });
});

describe('moveDayUp', () => {
  it('swaps day with previous day', () => {
    const result = moveDayUp(baseShiori, 1);
    expect(result.days[0].label).toBe('DAY 2');
    expect(result.days[1].label).toBe('DAY 1');
  });

  it('does nothing when already first', () => {
    const result = moveDayUp(baseShiori, 0);
    expect(result.days[0].label).toBe('DAY 1');
  });
});

describe('moveDayDown', () => {
  it('swaps day with next day', () => {
    const result = moveDayDown(baseShiori, 0);
    expect(result.days[0].label).toBe('DAY 2');
    expect(result.days[1].label).toBe('DAY 1');
  });

  it('does nothing when already last', () => {
    const result = moveDayDown(baseShiori, 1);
    expect(result.days[1].label).toBe('DAY 2');
  });
});
