import type { Shiori, ShioriItem } from '../../domain/entities/Shiori';

export function updateHeader(
  s: Shiori,
  patch: Partial<Pick<Shiori, 'title' | 'destination' | 'startDateTime' | 'endDateTime'>>
): Shiori {
  return { ...s, ...patch };
}

export function updateDayLabel(s: Shiori, dayIndex: number, label: string): Shiori {
  const days = s.days.map((day, i) => (i === dayIndex ? { ...day, label } : day));
  return { ...s, days };
}

export function updateItem(
  s: Shiori,
  dayIndex: number,
  itemIndex: number,
  patch: Partial<ShioriItem>
): Shiori {
  const days = s.days.map((day, di) => {
    if (di !== dayIndex) return day;
    const items = day.items.map((item, ii) => (ii === itemIndex ? { ...item, ...patch } : item));
    return { ...day, items };
  });
  return { ...s, days };
}

export function addItem(s: Shiori, dayIndex: number): Shiori {
  const blank: ShioriItem = { time: '', title: '', description: '', place: '' };
  const days = s.days.map((day, di) => {
    if (di !== dayIndex) return day;
    return { ...day, items: [...day.items, blank] };
  });
  return { ...s, days };
}

export function removeItem(s: Shiori, dayIndex: number, itemIndex: number): Shiori {
  const days = s.days.map((day, di) => {
    if (di !== dayIndex) return day;
    const items = day.items.filter((_, ii) => ii !== itemIndex);
    return { ...day, items };
  });
  return { ...s, days };
}

function swapItems<T>(arr: T[], i: number, j: number): T[] {
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function moveItemUp(s: Shiori, dayIndex: number, itemIndex: number): Shiori {
  if (itemIndex === 0) return s;
  const days = s.days.map((day, di) => {
    if (di !== dayIndex) return day;
    return { ...day, items: swapItems(day.items, itemIndex - 1, itemIndex) };
  });
  return { ...s, days };
}

export function moveItemDown(s: Shiori, dayIndex: number, itemIndex: number): Shiori {
  const day = s.days[dayIndex];
  if (itemIndex >= day.items.length - 1) return s;
  const days = s.days.map((d, di) => {
    if (di !== dayIndex) return d;
    return { ...d, items: swapItems(d.items, itemIndex, itemIndex + 1) };
  });
  return { ...s, days };
}

export function addDay(s: Shiori): Shiori {
  return { ...s, days: [...s.days, { date: '', label: '', items: [] }] };
}

export function removeDay(s: Shiori, dayIndex: number): Shiori {
  return { ...s, days: s.days.filter((_, i) => i !== dayIndex) };
}

export function moveDayUp(s: Shiori, dayIndex: number): Shiori {
  if (dayIndex === 0) return s;
  return { ...s, days: swapItems(s.days, dayIndex - 1, dayIndex) };
}

export function moveDayDown(s: Shiori, dayIndex: number): Shiori {
  if (dayIndex >= s.days.length - 1) return s;
  return { ...s, days: swapItems(s.days, dayIndex, dayIndex + 1) };
}
