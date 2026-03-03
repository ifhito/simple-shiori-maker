import type { Shiori, ShioriItem } from '../../domain/entities/Shiori';

export function updateHeader(
  shiori: Shiori,
  patch: Partial<Pick<Shiori, 'title' | 'destination' | 'startDateTime' | 'endDateTime'>>
): Shiori {
  return { ...shiori, ...patch };
}

export function updateDayLabel(shiori: Shiori, dayIndex: number, label: string): Shiori {
  const days = shiori.days.map((day, i) => (i === dayIndex ? { ...day, label } : day));
  return { ...shiori, days };
}

export function updateItem(
  shiori: Shiori,
  dayIndex: number,
  itemIndex: number,
  patch: Partial<ShioriItem>
): Shiori {
  const days = shiori.days.map((day, di) => {
    if (di !== dayIndex) return day;
    const items = day.items.map((item, ii) => (ii === itemIndex ? { ...item, ...patch } : item));
    return { ...day, items };
  });
  return { ...shiori, days };
}

export function addItem(shiori: Shiori, dayIndex: number): Shiori {
  const blank: ShioriItem = { time: '', title: '', description: '', place: '' };
  const days = shiori.days.map((day, di) => {
    if (di !== dayIndex) return day;
    return { ...day, items: [...day.items, blank] };
  });
  return { ...shiori, days };
}

export function removeItem(shiori: Shiori, dayIndex: number, itemIndex: number): Shiori {
  const days = shiori.days.map((day, di) => {
    if (di !== dayIndex) return day;
    const items = day.items.filter((_, ii) => ii !== itemIndex);
    return { ...day, items };
  });
  return { ...shiori, days };
}

function swapItems<T>(arr: T[], i: number, j: number): T[] {
  const next = [...arr];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

export function moveItemUp(shiori: Shiori, dayIndex: number, itemIndex: number): Shiori {
  if (itemIndex === 0) return shiori;
  const days = shiori.days.map((day, di) => {
    if (di !== dayIndex) return day;
    return { ...day, items: swapItems(day.items, itemIndex - 1, itemIndex) };
  });
  return { ...shiori, days };
}

export function moveItemDown(shiori: Shiori, dayIndex: number, itemIndex: number): Shiori {
  const day = shiori.days[dayIndex];
  if (itemIndex >= day.items.length - 1) return shiori;
  const days = shiori.days.map((d, di) => {
    if (di !== dayIndex) return d;
    return { ...d, items: swapItems(d.items, itemIndex, itemIndex + 1) };
  });
  return { ...shiori, days };
}

export function addDay(shiori: Shiori): Shiori {
  return { ...shiori, days: [...shiori.days, { date: '', label: '', items: [] }] };
}

export function removeDay(shiori: Shiori, dayIndex: number): Shiori {
  return { ...shiori, days: shiori.days.filter((_, i) => i !== dayIndex) };
}

export function moveDayUp(shiori: Shiori, dayIndex: number): Shiori {
  if (dayIndex === 0) return shiori;
  return { ...shiori, days: swapItems(shiori.days, dayIndex - 1, dayIndex) };
}

export function moveDayDown(shiori: Shiori, dayIndex: number): Shiori {
  if (dayIndex >= shiori.days.length - 1) return shiori;
  return { ...shiori, days: swapItems(shiori.days, dayIndex, dayIndex + 1) };
}
