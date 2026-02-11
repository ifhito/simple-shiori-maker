export interface ShioriItem {
  time: string;
  title: string;
  description: string;
  place: string;
  mapUrl?: string;
}

export interface ShioriDay {
  date: string;
  label: string;
  items: ShioriItem[];
}

export interface Shiori {
  title: string;
  destination: string;
  startDateTime: string;
  endDateTime: string;
  days: ShioriDay[];
}

export interface PasshashRecord {
  v: 1;
  salt: string;
  hash: string;
  iter: number;
}

export interface EncryptedPayload {
  v: 1;
  s: string;
  i: string;
  c: string;
}
