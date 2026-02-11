import type { PasshashRecord } from '../entities/Shiori';

export interface PasshashRepository {
  save(id: string, record: PasshashRecord): void;
  load(id: string): PasshashRecord | null;
}
