# Plan: KV上書き更新 & パスワード引き継ぎ

## Context

しおりの編集フローにおいて2つの問題があった:

1. **KV上書き更新なし**: 既存の共有リンクを編集して再生成すると、常に新しいキーが作られてしまい、元のURLが無効にならず管理が煩雑になる
2. **パスワード二重入力**: `/s/$key` でパスワード入力 → 編集 → `/builder` でまたパスワード入力、という UX 上の摩擦

---

## 変更方針

### KV上書き更新（existingKey）

`/api/encrypt` に `key?` パラメータを追加。指定された場合はキー生成ループをスキップして既存エントリを上書き（Cloudflare KV の `put()` はべき等でそのまま上書きになる）。

### パスワード引き継ぎ

- `/s/$key` で unlock したパスワードを React state に保持
- 「編集する」ボタン押下時、TanStack Router の `navigate({ state: { unlockPassword } })` で `/edit` に渡す
- `/edit` では `useRouterState` で nav state を読み取り `useState` に転写（フォーム入力値として扱う）
- `/edit` に **インライン更新パネル** を追加。`existingKey` がある場合はパスワード入力済み状態で「このしおりを更新する」ボタンを表示
- `/builder` と `BuilderForm` から `existingKey` 関連コードは削除（更新フローは `/edit` で完結）

**なぜ sessionStorage を使わないか**: CLAUDE.md「Never store plaintext passwords anywhere (client, server logs, or persistent storage)」に従い、`sessionStorage`（永続化ストレージ）は使用しない。TanStack Router の nav state は `window.history.state` に乗り、タブのメモリ上にのみ存在する。

---

## 変更ファイル一覧

### Application 層

| ファイル | 変更内容 |
|---------|---------|
| `src/application/dto/shiori.ts` | `EncryptApiRequest` に `key?: string` 追加 |
| `src/application/usecases/createShareLink.ts` | サーバー側: `existingKey?` でキー生成ループをスキップ。クライアント側: `encryptApi` に `key` を渡す |

### Infrastructure 層

| ファイル | 変更内容 |
|---------|---------|
| `src/routes/api/encrypt.ts` | `EncryptRequestBody` に `key?: string` 追加、`existingKey` として use case へ渡す |

### Presentation 層 / Routes

| ファイル | 変更内容 |
|---------|---------|
| `src/routes/s/$key.tsx` | `unlockPassword` state を追加、`handleUnlock` 成功時にセット、`handleEdit` で nav state に乗せて `/edit` へ渡す |
| `src/routes/edit.tsx` | `useRouterState` で nav state からパスワード読み取り、`updatePassword` state に転写。`handleUpdate()` 追加（inline API 呼び出し）。インライン更新パネル UI 追加。`handleCreateLink` から `shiori:edit-key` 書き込みを削除 |
| `src/routes/builder.tsx` | `existingKey` state 削除、`shiori:edit-key` sessionStorage 読み取り削除、`handleCreate` から `existingKey` 削除、`BuilderForm` から `existingKey` prop 削除 |
| `src/presentation/components/BuilderForm.tsx` | `existingKey?` prop 削除、更新モードの notice・ボタンラベル変更ロジック削除 |
| `src/presentation/components/editor/EditSummaryBar.tsx` | `existingKey?`, `isUpdating?`, `onUpdate?` props 追加。`existingKey` がある場合は「このしおりを更新する」ボタン（`onUpdate` 呼び出し）、ない場合は従来の「しおりリンクを作成」ボタン |

---

## データフロー

### 新規リンク作成フロー（変更なし）
```
/builder → (JSON貼り付け + パスワード) → /api/encrypt → 新しいキー生成 → 共有URL
```

### 既存リンク更新フロー（新規）
```
/s/$key → (パスワード入力でunlock)
        → [メモリに unlockPassword を保持]
        → handleEdit() → sessionStorage[edit-draft, edit-key] + navigate.state{unlockPassword}
        → /edit → useRouterState で unlockPassword 読み取り → useState に転写
        → (編集作業)
        → handleUpdate() → /api/encrypt (existingKey付き) → 同じキーで上書き → 更新URL表示
```

### /edit → /builder フロー（新規リンク作成に使う場合）
```
/edit → handleCreateLink() → sessionStorage[builder-draft] → /builder
     → (パスワード入力) → /api/encrypt → 新しいキー生成 → 共有URL
```

---

## sessionStorage キー一覧（現状）

| キー | 用途 | 保存元 | 読み取り先 |
|-----|------|--------|-----------|
| `shiori:edit-draft` | Shiori JSON の一時保存 | `/s/$key`・`/builder`・`/edit` 自動保存 | `/edit` mount 時 |
| `shiori:builder-draft` | `/edit` → `/builder` へのJSON受け渡し | `/edit` の「しおりリンクを作成」 | `/builder` mount 時 |
| `shiori:edit-key` | 更新対象のキー受け渡し | `/s/$key` の「編集する」 | `/edit` mount 時 |

> パスワードは sessionStorage に保存しない。nav state (window.history.state) のみで引き継ぐ。

---

## テスト

変更の核心（`createShareLink` の `existingKey` ロジック）はユニットテストで担保:

- `createShareLink.test.ts`: existingKey 指定時のキー生成スキップ・上書き挙動
- `/api/encrypt` ハンドラのテスト: `key` パラメータが `existingKey` として渡ること

実行:
```bash
docker compose run --rm app npx vitest run
# 18 files, 111 tests passing
```

---

## 検証フロー

```
1. /s/{key} を開く
2. パスワード入力でしおり表示
3. 「このしおりを編集する」→ /edit へ
4. パスワード入力欄に自動入力されていることを確認
5. 内容を編集
6. 「このしおりを更新する」ボタンを押す
7. 同じURL（/s/{key}）が結果として表示されること
8. 表示されたURLを開いてパスワード入力 → 更新済み内容が表示されること
```
