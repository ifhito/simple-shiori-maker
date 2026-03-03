# Fix: Decrypted Shiori Still Written to sessionStorage (Root Cause)

## Context

PR #12 Issue 2 の修正（`clearShioriJson` on mount + auto-save guard）は**不完全**でした。

現状の `/s/$key` → `/edit` フロー：
1. `handleEdit()` が `prepareEditFromViewUseCase(data, key, ...)` を呼ぶ
2. use case 内で `draftRepository.saveShioriJson(JSON.stringify(shiori))` → **sessionStorage に復号済み JSON が書き込まれる**
3. `navigate({ to: '/edit' })` で遷移
4. `/edit` がマウント後に `clearShioriJson()` でクリア

→ ステップ 2〜4 の間、必ず sessionStorage に復号済み平文が存在する（タイミング的に回避不可能）。

**根本原因**: sessionStorage を渡し手として使っていること自体が問題。パスワードが `window.history.state`（navigation state）経由で渡されているように、shiori オブジェクトも同じルートで渡すべき。

---

## Fix (TDD)

### Critical files

| File | Change |
|------|--------|
| `src/application/usecases/editDraft.test.ts` | `prepareEditFromViewUseCase` のテストを新シグネチャに更新 |
| `src/application/usecases/editDraft.ts` | `prepareEditFromViewUseCase` から shiori 引数と `saveShioriJson` を除去 |
| `src/routes/s/$key.tsx` | `handleEdit` で shiori を navigation state に追加、use case 呼び出しを更新 |
| `src/routes/edit.tsx` | navState から `editShiori` を読む。sessionStorage 経由のパスを除去 |

### Step 1 — RED: `editDraft.test.ts` を更新

`prepareEditFromViewUseCase` のテストを書き直す（shiori 引数なし、`saveShioriJson` が呼ばれないことを確認）：

```typescript
describe('prepareEditFromViewUseCase', () => {
  it('saves only the edit key (shiori passed via nav state, never sessionStorage)', () => {
    const saveEditKey = vi.fn();
    const saveShioriJson = vi.fn();
    const draftRepository = makeMockRepo({ saveEditKey, saveShioriJson });
    prepareEditFromViewUseCase('key-xyz', { draftRepository });
    expect(saveEditKey).toHaveBeenCalledWith('key-xyz');
    expect(saveShioriJson).not.toHaveBeenCalled();
  });
});
```

### Step 2 — GREEN: `editDraft.ts` を更新

`prepareEditFromViewUseCase` から shiori 引数と `saveShioriJson` を除去：

```typescript
// Before
export function prepareEditFromViewUseCase(
  shiori: Shiori,
  key: string,
  deps: EditDraftDeps
): void {
  deps.draftRepository.saveShioriJson(JSON.stringify(shiori));
  deps.draftRepository.saveEditKey(key);
}

// After
export function prepareEditFromViewUseCase(
  key: string,
  deps: EditDraftDeps
): void {
  deps.draftRepository.saveEditKey(key);
}
```

`Shiori` import が editDraft.ts 内で他に使われていなければ除去する。

### Step 3 — `s/$key.tsx` を更新

shiori を navigation state に追加し、use case 呼び出しシグネチャを更新：

```typescript
// Before
function handleEdit() {
  if (!data) return;
  prepareEditFromViewUseCase(data, key, { draftRepository });
  void navigate({
    to: '/edit',
    state: { unlockPassword } as unknown as Record<string, unknown>
  });
}

// After
function handleEdit() {
  if (!data) return;
  prepareEditFromViewUseCase(key, { draftRepository });
  void navigate({
    to: '/edit',
    state: { unlockPassword, editShiori: data } as unknown as Record<string, unknown>
  });
}
```

### Step 4 — `edit.tsx` を更新

navState から `editShiori` を読み、sessionStorage を経由しないパスを確立：

```typescript
// コンポーネント先頭（navState は既に読まれている）
const editShioriFromNav = (navState?.editShiori ?? null) as Shiori | null;
```

load useEffect を変更（`clearShioriJson` 呼び出しも除去）：

```typescript
// Before
useEffect(() => {
  const { shiori: draft, editKey } = loadEditDraftUseCase({
    draftRepository, parseJsonText, validateShioriData
  });
  if (draft) setShiori(draft);
  if (editKey) {
    setExistingKey(editKey);
    draftRepository.clearShioriJson();
  }
}, [draftRepository]);

// After
useEffect(() => {
  if (editShioriFromNav) {
    // 復号済み shiori は nav state 経由 — sessionStorage には一切書き込まれない
    setShiori(editShioriFromNav);
    const editKey = draftRepository.loadEditKey();
    if (editKey) setExistingKey(editKey);
    return;
  }
  // builder フロー: sessionStorage からドラフトをロード（editKey は clearEditKey 済み）
  const { shiori: draft } = loadEditDraftUseCase({
    draftRepository, parseJsonText, validateShioriData
  });
  if (draft) setShiori(draft);
}, [draftRepository]);
```

auto-save guard（`if (shiori && !existingKey)`）は変更不要。

---

## Verification

### Tests
```sh
docker compose run --rm app sh -c "cd /workspace && node_modules/.bin/vitest run"
```
全テストパス。`prepareEditFromViewUseCase` のテストが新シグネチャで green。

### Manual — sessionStorage に書かれないことを確認
1. `/s/<key>` で unlock し「このしおりを編集する」をクリック
2. DevTools → Application → Session Storage を常時監視
3. **期待値**: 遷移〜編集中を通じて `shiori:edit-draft` キーが一切現れない（`shiori:edit-key` のみ存在）

### Manual — builder フロー（既存動作の継続確認）
1. `/builder` で JSON を貼り付けて「編集する」
2. DevTools: `shiori:edit-draft` が存在し、編集中も auto-save で更新され続ける
3. 「しおりリンクを作成」ボタンが表示される（update モードにならない）
