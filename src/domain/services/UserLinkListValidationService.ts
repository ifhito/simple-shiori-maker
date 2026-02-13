import type { UserLinkEntry, UserLinkList } from '../entities/UserLinkList';
import { DomainValidationError } from './ShioriValidationService';

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

function validateEntry(entry: unknown, index: number): UserLinkEntry {
  if (!isObject(entry)) {
    throw new DomainValidationError([`links[${index}] はオブジェクトである必要があります`]);
  }

  const errors: string[] = [];

  if (typeof entry.key !== 'string' || entry.key.length === 0) {
    errors.push(`links[${index}].key は必須文字列です`);
  }
  if (typeof entry.title !== 'string' || entry.title.length === 0) {
    errors.push(`links[${index}].title は必須文字列です`);
  }
  if (typeof entry.destination !== 'string' || entry.destination.length === 0) {
    errors.push(`links[${index}].destination は必須文字列です`);
  }
  if (typeof entry.createdAt !== 'number' || !Number.isFinite(entry.createdAt)) {
    errors.push(`links[${index}].createdAt は数値である必要があります`);
  }
  if (typeof entry.expiresAt !== 'number' || !Number.isFinite(entry.expiresAt)) {
    errors.push(`links[${index}].expiresAt は数値である必要があります`);
  }

  if (errors.length > 0) {
    throw new DomainValidationError(errors);
  }

  return {
    key: entry.key as string,
    title: entry.title as string,
    destination: entry.destination as string,
    createdAt: entry.createdAt as number,
    expiresAt: entry.expiresAt as number
  };
}

export function validateUserLinkList(value: unknown): UserLinkList {
  if (!isObject(value)) {
    throw new DomainValidationError(['リンク一覧データはオブジェクトである必要があります']);
  }

  if (value.v !== 1) {
    throw new DomainValidationError(['リンク一覧データのバージョンが不正です']);
  }

  if (!Array.isArray(value.links)) {
    throw new DomainValidationError(['links は配列である必要があります']);
  }

  const links = value.links.map((entry, index) => validateEntry(entry, index));

  return { v: 1, links };
}
