import type { EditDraftRepository } from '../../domain/repositories/EditDraftRepository';

const EDIT_DRAFT_KEY = 'shiori:edit-draft';
const EDIT_KEY = 'shiori:edit-key';
const BUILDER_DRAFT_KEY = 'shiori:builder-draft';

export class SessionDraftStorage implements EditDraftRepository {
  loadShioriJson(): string | null {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage.getItem(EDIT_DRAFT_KEY);
  }

  saveShioriJson(json: string): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(EDIT_DRAFT_KEY, json);
  }

  clearShioriJson(): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(EDIT_DRAFT_KEY);
  }

  loadEditKey(): string | null {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage.getItem(EDIT_KEY);
  }

  saveEditKey(key: string): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(EDIT_KEY, key);
  }

  clearEditKey(): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(EDIT_KEY);
  }

  loadBuilderDraft(): string | null {
    if (typeof sessionStorage === 'undefined') return null;
    return sessionStorage.getItem(BUILDER_DRAFT_KEY);
  }

  saveBuilderDraft(json: string): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.setItem(BUILDER_DRAFT_KEY, json);
  }

  clearBuilderDraft(): void {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(BUILDER_DRAFT_KEY);
  }
}
