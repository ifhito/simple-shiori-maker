# Plan: Presentation 層からロジック漏れを切り出す

## Context

CLAUDE.md ルール4・5 の違反が4つの route ファイルで確認された。
- ルール4: 「API呼び出し・暗号化ロジック・パースロジックを UI コンポーネントに置かない」
- ルール5: 「use-case orchestration は application 層に置く」

具体的には `sessionStorage` 直接操作・`parseJsonText` 直接呼び出し・キャッシュ orchestration が
presentation 層（routes）に漏れ出している。これを application / infrastructure 層に正しく切り出す。

---

## 違反一覧

| ファイル | 違反内容 | 種別 |
|---|---|---|
| `routes/edit.tsx:77-78` | useEffect で `parseJsonText` + `validateShioriData` 直接呼び出し | parsing in UI |
| `routes/edit.tsx:110-111` | `applyJson` で同上 | parsing in UI |
| `routes/edit.tsx:126-127` | `applyAiJson` で同上 | parsing in UI |
| `routes/edit.tsx:74,84,91,140-141,167-168` | `sessionStorage` 直接 get/set/remove | infra in UI |
| `routes/s/$key.tsx:68-69` | `handleEdit` で `sessionStorage` 直接 set | infra in UI |
| `routes/builder.tsx:38-40,46` | useEffect・handleEdit で `sessionStorage` 直接 | infra in UI |
| `routes/builder.tsx:95` | `saveToMyLinks` で `JSON.parse(plainText)` 直接 | parsing in UI |
| `routes/builder.tsx:131` | `saveToMyLinks` で `cachePassphraseHash` 直接 | infra in UI |
| `routes/links.tsx:43,65,78,105` | `cachePassphraseHash` / `clearCachedPassphraseHash` / `getCachedPassphraseHash` 直接 | infra in UI |

**許容範囲（composition root パターン）:**
- `s/$key.tsx` が `parseJsonText`, `validateShioriData`, `verifyPasswordAgainstRecord` を `unlockShioriViaApi` の deps として渡す → OK
- `links.tsx` が `hashPassphraseToKey` を `loadUserLinksViaApi` の deps として渡す → OK
- `edit.tsx:95` の `validateLive` が `validateShioriData` を UI リアクティブ feedback に使う → OK

---

## 新規作成ファイル

### 1. `src/application/usecases/parseAndValidateShiori.ts`

```ts
export interface ParseAndValidateShioriDeps {
  parseJsonText: (raw: string) => unknown;
  validateShioriData: (value: unknown) => Shiori;
}
export function parseAndValidateShioriJson(raw: string, deps: ParseAndValidateShioriDeps): Shiori
```

- `edit.tsx` の `applyJson` / `applyAiJson` / draft load useEffect の重複ロジックを一本化
- `builder.tsx` の `saveToMyLinks` 内 `JSON.parse` も置き換える

### 2. `src/domain/repositories/EditDraftRepository.ts`

```ts
export interface EditDraftRepository {
  // edit ページのドラフト
  loadShioriJson(): string | null;
  saveShioriJson(json: string): void;
  clearShioriJson(): void;
  loadEditKey(): string | null;
  saveEditKey(key: string): void;
  clearEditKey(): void;
  // builder ページのドラフト
  loadBuilderDraft(): string | null;
  saveBuilderDraft(json: string): void;
  clearBuilderDraft(): void;
}
```

### 3. `src/infrastructure/storage/sessionDraftStorage.ts`

`SessionDraftStorage implements EditDraftRepository` — sessionStorage の全キー操作を集約
- `shiori:edit-draft`, `shiori:edit-key`, `shiori:builder-draft`

### 4. `src/application/usecases/editDraft.ts`

| 関数 | 責務 |
|---|---|
| `loadEditDraftUseCase(deps)` | `{ shiori, editKey }` を返す。parse+validate 失敗は silent fail |
| `saveEditDraftUseCase(shiori, deps)` | auto-save (JSON.stringify + draftRepository.saveShioriJson) |
| `transitionToBuilderUseCase(shiori, deps)` | builder draft 保存 + editKey クリア。edit.tsx handleCreateLink 用 |
| `prepareEditFromViewUseCase(shiori, key, deps)` | edit draft + edit key 保存。s/$key.tsx handleEdit 用 |
| `clearEditCompletionDraftUseCase(deps)` | 更新完了後 draft + editKey クリア。edit.tsx handleUpdate 完了後用 |

deps は全て `{ draftRepository, parseJsonText?, validateShioriData? }` の形で注入。

### 5. `src/domain/repositories/PassphraseHashCacheRepository.ts`

```ts
export interface PassphraseHashCacheRepository {
  load(): string | null;
  save(hash: string): void;
  clear(): void;
}
```

### 6. `src/infrastructure/storage/localPassphraseHashCacheStorage.ts`

`LocalPassphraseHashCacheStorage implements PassphraseHashCacheRepository` — 既存の
`cachePassphraseHash` / `getCachedPassphraseHash` / `clearCachedPassphraseHash` 関数をラップ

### 7. `src/application/usecases/upsertUserLinkEntry.ts`

`builder.tsx` の `saveToMyLinks` 関数（load → merge → save + cache）を usecase に切り出し。

```ts
export interface UpsertUserLinkEntryInput {
  shiori: Shiori;
  key: string;
  expiresAt: number;
  passphrase: string;
}
export interface UpsertUserLinkEntryDeps {
  loadUserLinks: typeof loadUserLinksViaApi;
  saveUserLinks: typeof saveUserLinksViaApi;
  hashPassphrase: (p: string) => Promise<string>;
  passphraseHashCache: PassphraseHashCacheRepository;
  apiClient: ShioriApiClient;
}
export function upsertUserLinkEntryUseCase(input, deps): Promise<void>
```

---

## 変更ファイル

### `src/application/usecases/loadUserLinks.ts`

`LoadUserLinksClientPassphraseDeps` と `LoadUserLinksClientDeps` に
`passphraseHashCache?: PassphraseHashCacheRepository` を追加。
ロード成功後に `deps.passphraseHashCache?.save(passphraseHash)` を呼ぶ。
ロード失敗時（WithHash）は `deps.passphraseHashCache?.clear()` を呼ぶ。

これにより `links.tsx` がキャッシュ操作を知る必要がなくなる。

### `src/routes/edit.tsx`

- `parseJsonText` インポート → 削除
- `validateShioriData` 直接呼び出し箇所 → `parseAndValidateShioriJson` usecase に委譲
- `sessionStorage` 直接呼び出し → draft usecases (`loadEditDraftUseCase`, `saveEditDraftUseCase`, `transitionToBuilderUseCase`, `clearEditCompletionDraftUseCase`) に委譲
- `useMemo` で `SessionDraftStorage` インスタンスを生成して deps に注入
- `validateLive` + `validateShioriData` import は維持（UI feedback 用として許容）

### `src/routes/s/$key.tsx`

- `handleEdit` の `sessionStorage.setItem` 2行 → `prepareEditFromViewUseCase(data, key, deps)` に委譲
- `SessionDraftStorage` を useMemo で生成して deps に渡す
- `parseJsonText`, `validateShioriData` インポートは維持（`unlockShioriViaApi` deps として渡すため）

### `src/routes/builder.tsx`

- useEffect の `sessionStorage.getItem/removeItem` → `draftRepository.loadBuilderDraft()` / `draftRepository.clearBuilderDraft()` を呼ぶ usecase 経由に
- `handleEdit` の `sessionStorage.setItem` → `draftRepository.saveShioriJson(json)` を呼ぶ usecase 経由に
- `saveToMyLinks` → `upsertUserLinkEntryUseCase` に委譲。`Shiori` オブジェクトを渡すよう変更
- `handleCreate` で `parseAndValidateShioriJson` を呼び Shiori を得てから `upsertUserLinkEntryUseCase` に渡す
- `cachePassphraseHash`, `JSON.parse` インポート → 削除

### `src/routes/links.tsx`

- `passphraseHashCache` 3関数のインポート → 削除
- `loadUserLinksViaApi` / `loadUserLinksViaApiWithHash` に `passphraseHashCache` を deps として渡す
  （`LocalPassphraseHashCacheStorage` インスタンスを useMemo で生成）
- `handleLogout` は `passphraseHashCacheRepository.clear()` を直接呼ぶ（interface 経由のため OK）

---

## テスト

TDD に従い、新 usecase ファイルにはテストファイルを先行作成する。

| テストファイル | 内容 |
|---|---|
| `src/application/usecases/parseAndValidateShiori.test.ts` | 正常・parse エラー・validation エラー |
| `src/application/usecases/editDraft.test.ts` | 各 usecase のモック repository を使ったテスト |
| `src/application/usecases/upsertUserLinkEntry.test.ts` | merge ロジック・新規追加・既存上書き |

既存テストへの影響:
- `loadUserLinks` に optional dep を追加するため既存テストは通過したままになるが、
  キャッシュ挙動のテストを追加する

---

## 実施順序

1. `parseAndValidateShiori.ts` + テスト → `edit.tsx` の applyJson/applyAiJson 修正
2. `EditDraftRepository` + `SessionDraftStorage` + `editDraft.ts` + テスト
3. `edit.tsx` の sessionStorage 全除去
4. `s/$key.tsx` / `builder.tsx` の sessionStorage 除去（`prepareEditFromViewUseCase` 等を使用）
5. `PassphraseHashCacheRepository` + `LocalPassphraseHashCacheStorage`
6. `loadUserLinks.ts` 修正 + `links.tsx` 修正
7. `upsertUserLinkEntry.ts` + テスト → `builder.tsx` の `saveToMyLinks` 除去

---

## 検証

```bash
# 全テスト通過確認
docker compose run --rm app sh -c "cd /workspace && node_modules/.bin/vitest run"
```

ブラウザ動作確認:
1. `/builder` で JSON 貼り付け → しおり作成 → マイリンク保存が動く
2. 共有リンクを開く → パスワード入力 → 編集ボタン → `/edit` に遷移してデータが入っている
3. `/edit` でフォーム編集・JSON編集・更新が動く
4. `/links` でパスフレーズ認証・リンク一覧・削除・ログアウトが動く
5. ページリロード時に edit draft が復元される
