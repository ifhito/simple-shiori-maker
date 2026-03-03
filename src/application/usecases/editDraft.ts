import type { Shiori } from '../../domain/entities/Shiori';
import type { EditDraftRepository } from '../../domain/repositories/EditDraftRepository';
import { parseAndValidateShioriJson, type ParseAndValidateShioriDeps } from './parseAndValidateShiori';

export interface EditDraftDeps {
  draftRepository: EditDraftRepository;
}

export interface EditDraftLoadDeps extends EditDraftDeps, ParseAndValidateShioriDeps {}

export function loadEditDraftUseCase(deps: EditDraftLoadDeps): {
  shiori: Shiori | null;
  editKey: string | null;
} {
  const raw = deps.draftRepository.loadShioriJson();
  const editKey = deps.draftRepository.loadEditKey();
  if (!raw) return { shiori: null, editKey };
  try {
    const shiori = parseAndValidateShioriJson(raw, deps);
    return { shiori, editKey };
  } catch {
    return { shiori: null, editKey };
  }
}

export function saveEditDraftUseCase(shiori: Shiori, deps: EditDraftDeps): void {
  deps.draftRepository.saveShioriJson(JSON.stringify(shiori));
}

export function transitionToBuilderUseCase(shiori: Shiori, deps: EditDraftDeps): void {
  deps.draftRepository.saveBuilderDraft(JSON.stringify(shiori));
  deps.draftRepository.clearEditKey();
}

export function prepareEditFromViewUseCase(
  key: string,
  deps: EditDraftDeps
): void {
  deps.draftRepository.saveEditKey(key);
}

export function clearEditCompletionDraftUseCase(deps: EditDraftDeps): void {
  deps.draftRepository.clearShioriJson();
  deps.draftRepository.clearEditKey();
}

export function prepareNewEditFromJsonUseCase(json: string, deps: EditDraftDeps): void {
  deps.draftRepository.saveShioriJson(json);
  deps.draftRepository.clearEditKey();
}
