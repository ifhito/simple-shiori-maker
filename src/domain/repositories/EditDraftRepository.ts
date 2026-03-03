export interface EditDraftRepository {
  // edit page draft
  loadShioriJson(): string | null;
  saveShioriJson(json: string): void;
  clearShioriJson(): void;
  loadEditKey(): string | null;
  saveEditKey(key: string): void;
  clearEditKey(): void;
  // builder page draft
  loadBuilderDraft(): string | null;
  saveBuilderDraft(json: string): void;
  clearBuilderDraft(): void;
}
