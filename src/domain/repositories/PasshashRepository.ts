import type { PasshashRecord } from '../entities/Shiori';

export interface PasshashRepository {
  save(key: string, record: PasshashRecord): void;
  load(key: string): PasshashRecord | null;
}
