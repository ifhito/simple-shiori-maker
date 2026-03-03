import { describe, expect, it, vi } from 'vitest';
import {
  loadEditDraftUseCase,
  saveEditDraftUseCase,
  transitionToBuilderUseCase,
  prepareEditFromViewUseCase,
  clearEditCompletionDraftUseCase,
  prepareNewEditFromJsonUseCase
} from './editDraft';
import type { EditDraftRepository } from '../../domain/repositories/EditDraftRepository';
import type { Shiori } from '../../domain/entities/Shiori';

function makeMockRepo(overrides: Partial<EditDraftRepository> = {}): EditDraftRepository {
  return {
    loadShioriJson: vi.fn(() => null),
    saveShioriJson: vi.fn(),
    clearShioriJson: vi.fn(),
    loadEditKey: vi.fn(() => null),
    saveEditKey: vi.fn(),
    clearEditKey: vi.fn(),
    loadBuilderDraft: vi.fn(() => null),
    saveBuilderDraft: vi.fn(),
    clearBuilderDraft: vi.fn(),
    ...overrides
  };
}

const mockShiori: Shiori = {
  title: 'Trip',
  destination: 'Osaka',
  startDateTime: '2026-03-01T10:00',
  endDateTime: '2026-03-03T18:00',
  days: [],
  design: {} as Shiori['design']
};

describe('loadEditDraftUseCase', () => {
  it('returns null shiori when no draft stored', () => {
    const draftRepository = makeMockRepo();
    const deps = {
      draftRepository,
      parseJsonText: vi.fn(),
      validateShioriData: vi.fn()
    };
    const result = loadEditDraftUseCase(deps);
    expect(result).toEqual({ shiori: null, editKey: null });
  });

  it('returns parsed shiori when draft is valid JSON', () => {
    const json = JSON.stringify(mockShiori);
    const draftRepository = makeMockRepo({
      loadShioriJson: vi.fn(() => json),
      loadEditKey: vi.fn(() => 'abc-key')
    });
    const deps = {
      draftRepository,
      parseJsonText: (raw: string) => JSON.parse(raw),
      validateShioriData: (_v: unknown) => mockShiori
    };
    const result = loadEditDraftUseCase(deps);
    expect(result).toEqual({ shiori: mockShiori, editKey: 'abc-key' });
  });

  it('returns null shiori on parse error (silent fail)', () => {
    const draftRepository = makeMockRepo({
      loadShioriJson: vi.fn(() => 'bad json')
    });
    const deps = {
      draftRepository,
      parseJsonText: (_raw: string) => { throw new Error('parse error'); },
      validateShioriData: vi.fn()
    };
    const result = loadEditDraftUseCase(deps);
    expect(result).toEqual({ shiori: null, editKey: null });
  });

  it('returns null shiori on validation error (silent fail)', () => {
    const draftRepository = makeMockRepo({
      loadShioriJson: vi.fn(() => '{}')
    });
    const deps = {
      draftRepository,
      parseJsonText: (_raw: string) => ({}),
      validateShioriData: (_v: unknown) => { throw new Error('validation error'); }
    };
    const result = loadEditDraftUseCase(deps);
    expect(result).toEqual({ shiori: null, editKey: null });
  });
});

describe('saveEditDraftUseCase', () => {
  it('saves JSON.stringify of the shiori to the repository', () => {
    const saveShioriJson = vi.fn();
    const draftRepository = makeMockRepo({ saveShioriJson });
    saveEditDraftUseCase(mockShiori, { draftRepository });
    expect(saveShioriJson).toHaveBeenCalledWith(JSON.stringify(mockShiori));
  });
});

describe('transitionToBuilderUseCase', () => {
  it('saves builder draft and clears edit key', () => {
    const saveBuilderDraft = vi.fn();
    const clearEditKey = vi.fn();
    const draftRepository = makeMockRepo({ saveBuilderDraft, clearEditKey });
    transitionToBuilderUseCase(mockShiori, { draftRepository });
    expect(saveBuilderDraft).toHaveBeenCalledWith(JSON.stringify(mockShiori));
    expect(clearEditKey).toHaveBeenCalled();
  });
});

describe('prepareEditFromViewUseCase', () => {
  it('saves shiori JSON and edit key', () => {
    const saveShioriJson = vi.fn();
    const saveEditKey = vi.fn();
    const draftRepository = makeMockRepo({ saveShioriJson, saveEditKey });
    prepareEditFromViewUseCase(mockShiori, 'key-xyz', { draftRepository });
    expect(saveShioriJson).toHaveBeenCalledWith(JSON.stringify(mockShiori));
    expect(saveEditKey).toHaveBeenCalledWith('key-xyz');
  });
});

describe('clearEditCompletionDraftUseCase', () => {
  it('clears shiori JSON and edit key', () => {
    const clearShioriJson = vi.fn();
    const clearEditKey = vi.fn();
    const draftRepository = makeMockRepo({ clearShioriJson, clearEditKey });
    clearEditCompletionDraftUseCase({ draftRepository });
    expect(clearShioriJson).toHaveBeenCalled();
    expect(clearEditKey).toHaveBeenCalled();
  });
});

describe('prepareNewEditFromJsonUseCase', () => {
  it('saves the JSON string to the repository', () => {
    const saveShioriJson = vi.fn();
    const clearEditKey = vi.fn();
    const draftRepository = makeMockRepo({ saveShioriJson, clearEditKey });
    prepareNewEditFromJsonUseCase('{"title":"Trip"}', { draftRepository });
    expect(saveShioriJson).toHaveBeenCalledWith('{"title":"Trip"}');
  });

  it('clears the edit key to prevent accidental overwrite mode', () => {
    const saveShioriJson = vi.fn();
    const clearEditKey = vi.fn();
    const draftRepository = makeMockRepo({ saveShioriJson, clearEditKey });
    prepareNewEditFromJsonUseCase('{"title":"Trip"}', { draftRepository });
    expect(clearEditKey).toHaveBeenCalled();
  });

  it('calls clearEditKey after saveShioriJson (ordering)', () => {
    const calls: string[] = [];
    const draftRepository = makeMockRepo({
      saveShioriJson: vi.fn(() => { calls.push('save'); }),
      clearEditKey: vi.fn(() => { calls.push('clear'); })
    });
    prepareNewEditFromJsonUseCase('{}', { draftRepository });
    expect(calls).toEqual(['save', 'clear']);
  });
});
