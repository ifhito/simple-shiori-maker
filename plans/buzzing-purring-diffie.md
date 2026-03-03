# PR Review Fix Plan

## Context
PR #12 (`feat/edit-screen-and-kv-update`) received 3 review comments from the owner.
This plan addresses all three in TDD order.

---

## Issue 1 (MEDIUM): Edit-key not cleared when navigating builder → edit

**Problem**: `builder.tsx:handleEdit` calls `draftRepository.saveShioriJson(json)` but never clears `shiori:edit-key`. A stale key from a previous view-page session causes `/edit` to enter "overwrite update mode" unintentionally.

**Fix** (TDD):

### Step 1 — RED: Add failing test in `editDraft.test.ts`
Add to import: `prepareNewEditFromJsonUseCase`

```typescript
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
```

### Step 2 — GREEN: Implement in `editDraft.ts`
Append after `clearEditCompletionDraftUseCase`:

```typescript
export function prepareNewEditFromJsonUseCase(json: string, deps: EditDraftDeps): void {
  deps.draftRepository.saveShioriJson(json);
  deps.draftRepository.clearEditKey();
}
```

### Step 3 — Update `builder.tsx`
```diff
+import { prepareNewEditFromJsonUseCase } from '../application/usecases/editDraft';

 function handleEdit(json: string) {
-  draftRepository.saveShioriJson(json);
+  prepareNewEditFromJsonUseCase(json, { draftRepository });
   void navigate({ to: '/edit' });
 }
```

---

## Issue 2 (MEDIUM): Decrypted shiori plaintext stored in sessionStorage

**Problem**: When editing an existing shiori (unlocked from `/s/$key`), `saveEditDraftUseCase` continuously re-saves the decrypted JSON to `sessionStorage['shiori:edit-draft']`, violating the security constraint: *"keep decrypted data in memory only."*

**Fix** — two changes in `edit.tsx` (presentation layer):

### Change A — Clear sessionStorage immediately after loading with an editKey
```diff
 useEffect(() => {
   const { shiori: draft, editKey } = loadEditDraftUseCase({
     draftRepository, parseJsonText, validateShioriData
   });
   if (draft) setShiori(draft);
-  if (editKey) setExistingKey(editKey);
+  if (editKey) {
+    setExistingKey(editKey);
+    draftRepository.clearShioriJson(); // remove decrypted plaintext from storage immediately
+  }
 }, [draftRepository]);
```

### Change B — Guard auto-save: only persist when NOT editing existing shiori
```diff
 useEffect(() => {
-  if (shiori) {
+  if (shiori && !existingKey) {
     saveEditDraftUseCase(shiori, { draftRepository });
   }
-}, [shiori, draftRepository]);
+}, [shiori, existingKey, draftRepository]);
```

**Result**: Decrypted content lives in React state only. New shiori creation still auto-saves as before.

> **UXコスト（許容済み）**: `existingKey` がある場合、編集途中で画面を離れると変更は失われる。再開するには `/s/$key` で再ロック解除が必要。セキュリティ制約（「復号済みデータはメモリのみ」）を優先するため、このトレードオフは受け入れる。

---

## Issue 3 (LOW): Missing error handling for clipboard API

**Problem**: `AiEditPanel.tsx:handleCopy` has no try-catch; `navigator.clipboard.writeText()` throws on permission denial or unsupported environments.

**Fix** in `AiEditPanel.tsx` — 既存の `copied` state パターンと対称に `copyFailed` state を追加:

```diff
-const [copied, setCopied] = useState(false);
+const [copied, setCopied] = useState(false);
+const [copyFailed, setCopyFailed] = useState(false);

 async function handleCopy() {
   if (!generatedPrompt) return;
-  await navigator.clipboard.writeText(generatedPrompt);
-  setCopied(true);
-  setTimeout(() => setCopied(false), 2000);
+  try {
+    await navigator.clipboard.writeText(generatedPrompt);
+    setCopied(true);
+    setTimeout(() => setCopied(false), 2000);
+  } catch {
+    setCopyFailed(true);
+    setTimeout(() => setCopyFailed(false), 2000);
+  }
 }

 // ボタンテキスト (JSX):
-{copied ? 'コピーしました！' : 'プロンプトをコピー'}
+{copied ? 'コピーしました！' : copyFailed ? 'コピーできませんでした' : 'プロンプトをコピー'}
```

**設計根拠**: トースト/通知ライブラリはコードベースに存在しない。ボタンテキスト変更が唯一の既存フィードバックパターン（`copied` state と同じスタイル）。プロンプトは UI 上に表示されているため、失敗時も手動コピーは可能。
```

---

## Critical files

| File | Change |
|------|--------|
| `src/application/usecases/editDraft.test.ts` | Add 3 tests for `prepareNewEditFromJsonUseCase` |
| `src/application/usecases/editDraft.ts` | Add `prepareNewEditFromJsonUseCase` export |
| `src/routes/builder.tsx` | Import + use `prepareNewEditFromJsonUseCase` in `handleEdit` |
| `src/routes/edit.tsx` | Clear shiori on load with editKey; guard auto-save with `!existingKey` |
| `src/presentation/components/editor/AiEditPanel.tsx` | Wrap `handleCopy` clipboard call in try-catch |

---

## Verification

### Tests
```sh
docker compose run --rm app sh -c "cd /workspace && node_modules/.bin/vitest run"
```
All tests pass, 3 new tests for `prepareNewEditFromJsonUseCase` are green.

### Issue 1 — manual
1. Navigate to `/builder`, paste valid JSON, click "編集する"
2. DevTools sessionStorage: `shiori:edit-key` is **absent**, `shiori:edit-draft` is present
3. Edit page shows "しおりリンクを作成" (new mode, not update mode)

### Issue 2 — manual
1. Navigate to `/s/<key>`, unlock, click "このしおりを編集する"
2. DevTools sessionStorage: after mount, `shiori:edit-draft` is **absent**; `shiori:edit-key` is present
3. Edit content freely — `shiori:edit-draft` never appears in sessionStorage

### Issue 3 — manual
1. DevTools → Site Settings → Clipboard: **Block**
2. Click "プロンプトをコピー" → ボタンが **"コピーできませんでした"** に変わり、2秒後に元に戻る。コンソールエラーなし。
3. DevTools → Clipboard: **Allow**（または "Ask" で許可）
4. 再度クリック → **"コピーしました！"** が2秒表示され、元に戻る
