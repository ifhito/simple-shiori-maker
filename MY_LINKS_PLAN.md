# マイリンク機能 実装プラン

## Context

現在のShioriでは、`/builder` で共有リンクを作成するとURLが表示されるが、一覧管理する手段がない。ユーザが作成した共有リンクを「合言葉（パスフレーズ）」ベースで保存・検索できる「マイリンク」機能を追加する。

## 方針

- 既存の `SHARE_KV` ネームスペースに `links:` プレフィックスでユーザのリンク一覧を保存する
- 合言葉の `SHA-256` ハッシュをKVキーとし、リンク一覧は合言葉で `AES-256-GCM` 暗号化して格納する
- DB不要でクロスデバイス対応

## KV キー設計

既存:
- `abc123def456` -> 暗号化しおりデータ（TTL: 30日）

追加:
- `links:{SHA-256(合言葉)}` -> 暗号化リンク一覧JSON（TTL: 90日、アクセス時リセット）

`links:` プレフィックスにより既存の 12 文字 base64url キーとの衝突はゼロ。

## データモデル

```ts
// 保存する各リンクのメタデータ
export interface UserLinkEntry {
  key: string;          // 共有キー (abc123def)
  title: string;        // しおりタイトル
  destination: string;  // 目的地
  createdAt: number;    // 作成日時 (epoch ms)
  expiresAt: number;    // 有効期限 (epoch ms)
}

// KV に暗号化して保存するリスト
export interface UserLinkList {
  v: 1;
  links: UserLinkEntry[];
}
```

## 実装ステップ

### Phase 0: ブランチ作成

- `feat/cloudflare-kv-share-links` から新規ブランチ `feat/my-links` を作成して切り替え

### Phase 1: Domain + Application（純粋ロジック）

1. `src/domain/entities/UserLinkList.ts` 新規作成
`UserLinkEntry`, `UserLinkList` インターフェース定義

2. `src/domain/valueObjects/Passphrase.ts` 新規作成
`isValidPassphrase(value: string): boolean`（4文字以上）

3. `src/domain/repositories/UserLinkListRepository.ts` 新規作成
`get(hashedKey: string): Promise<Uint8Array | null>`
`put(hashedKey: string, encryptedPayload: Uint8Array, ttlSeconds: number): Promise<void>`

4. `src/domain/services/UserLinkListValidationService.ts` 新規作成
`validateUserLinkList(value: unknown): UserLinkList`（JSON -> 型安全変換）

5. `src/application/dto/userLinks.ts` 新規作成
`SaveLinksApiRequest/Response`, `LoadLinksApiRequest/Response`

6. `src/application/usecases/saveUserLinks.ts` 新規作成
サーバ: 合言葉ハッシュ -> KVキー生成、`encryptPayloadBytes(...)` で暗号化 -> KV に `Uint8Array` 保存
クライアント: API呼び出しラッパー（deps注入パターン）

7. `src/application/usecases/loadUserLinks.ts` 新規作成
サーバ: KVから `Uint8Array` 取得 -> `decryptPayloadBytes(...)` で復号 -> バリデーション -> `UserLinkEntry[]` 返却
読取後に同じデータをTTL付きで再 `put`（TTLリセット）
データなしは空配列（エラーではない）
クライアント: API呼び出しラッパー（deps注入パターン）

### Phase 2: Infrastructure

8. `src/infrastructure/crypto/serverCrypto.ts` 修正
`hashPassphrase(passphrase: string): Promise<string>` を追加（`SHA-256` -> base64url）
暗号化は既存の `encryptPayloadBytes` / `decryptPayloadBytes` を使用

9. `src/infrastructure/storage/userLinkListStorage.ts` 新規作成
Cloudflare KV 実装: バイナリ get/put（`ArrayBuffer` で格納）
InMemory 実装: テスト/ローカル用
`createUserLinkListRepository(context)` ファクトリ

10. `src/infrastructure/storage/passphraseCache.ts` 新規作成
`sessionStorage` で合言葉をタブ閉鎖まで一時保持
`cachePassphrase()`, `getCachedPassphrase()`, `clearCachedPassphrase()`

11. `src/infrastructure/http/shioriApiClient.ts` 修正
`saveLinks()` と `loadLinks()` を追加（既存 encrypt/decrypt と同パターン）

12. `src/infrastructure/config/runtimeConfig.ts` 修正
`rateLimitLinksPerMin` と `linksTtlSeconds` を追加

### Phase 3: API ルート

13. `src/routes/api/links/save.ts` 新規作成
`POST /api/links/save`
リクエスト解析 -> バリデーション -> レート制限 -> use case 実行

14. `src/routes/api/links/load.ts` 新規作成
`POST /api/links/load`
合言葉不一致は `401`
データなしは `{ links: [] }` で `200`
レート制限適用

### Phase 4: Presentation

15. `src/presentation/components/PassphraseForm.tsx` 新規作成
合言葉入力フォーム（`ShioriUnlockPanel` と同パターン）
4文字以上のクライアントサイドバリデーション

16. `src/presentation/components/UserLinkList.tsx` 新規作成
検索バー + リンクカード一覧
`useMemo` で `title` / `destination` のキーワードフィルタリング
各カード: タイトル、目的地、作成日、有効期限ステータス、リンク、削除ボタン

17. `src/routes/links.tsx` 新規作成
`/links` ページ
State 1: 合言葉入力（`PassphraseForm`）
State 2: 一覧表示（`UserLinkList`）+ 検索
`sessionStorage` に合言葉キャッシュがあれば自動ロード

18. `src/routes/__root.tsx` 修正
ナビに `<Link to="/links">マイリンク</Link>` を追加

### Phase 5: Builder 統合

19. `src/presentation/components/BuilderForm.tsx` 修正
`<details>/<summary>` で折りたたみ式の合言葉フィールドを追加
`onSubmit` の引数に `passphrase?: string` を追加

20. `src/routes/builder.tsx` 修正
共有リンク作成成功後、合言葉が入力されていれば:
既存リンク一覧を `load` -> 追記 -> `save` でKV保存 -> `sessionStorage` に合言葉キャッシュ
失敗しても共有リンク自体は既に作成済み（非ブロッキング）

### Phase 6: CSS + 仕上げ

21. `src/styles.css` 修正
`.links-layout`, `.link-card`, `.search-input`, `.link-expired`, `.delete-button` など
モバイルファースト

22. `wrangler.toml` 修正
`RATE_LIMIT_LINKS_PER_MIN = "20"`
`LINKS_TTL_SECONDS = "7776000"`（90日）

## Phase 7: Hardening（コスト/不正対策）

23. `/api/links/save` の保存前バリデーションを強化
`links` をそのまま保存せず、`validateUserLinkList({ v: 1, links })` を通す（不正データで将来のloadが壊れるのを防ぐ）。

24. サイズ制限の追加
環境変数案:
`MAX_LINKS_COUNT`（例: 200）
`MAX_LINKS_PLAINTEXT_BYTES`（例: 32768）
`/api/links/save` で `JSON.stringify({v:1,links})` のUTF-8 bytesを測って上限超過なら `413`。

25. TTLリセット書き込みの最小化
`/api/links/load` の TTL リセットは「復号->再暗号化->put」ではなく、暗号bytesをそのまま再 `put` して `expirationTtl` だけ更新する（CPUと書き込み削減）。
追加で「直近アクセス時は更新しない」クールダウン（例: 6時間）を設ける場合は、メタデータに `touchedAt` を保存して判定する。

26. レート制限キーの分離
`links:load:min:${ip}` と `links:save:min:${ip}` を分け、保存をより厳しくできるようにする。

27. 合言葉強度ガイド
UI文言は「4文字以上（8文字以上推奨）」に更新し、辞書攻撃耐性を上げる。

## Phase 8: UX 仕上げ

28. 重複排除
`/builder` からの自動保存は `key` 重複を排除し、既存エントリがある場合は `title/destination/expiresAt/createdAt` を更新する方針にする。

29. ソート
`createdAt` 降順など、ユーザが直近作成を追える並びに統一する。

30. 合言葉キャッシュ方針の見直し（任意）
利便性重視なら `sessionStorage` に平文保持（現状方針）。
セキュリティ重視なら「合言葉は保存せず都度入力」または「保存するのは `SHA-256(passphrase)` のみ」へ寄せる。

## Phase 9: テスト追加（TDD）

31. Domain
`UserLinkListValidationService` の正常系/異常系（空文字、型違い、NaNなど）。

32. Application
`saveUserLinksOnServer` / `loadUserLinksOnServer` の
空データ時 `[]`
復号失敗時の扱い
TTLリセット（再putが呼ばれる）確認

33. Routes
`/api/links/save` `/api/links/load` の
passphrase短い -> 400
rate limit -> 429
wrong passphrase -> 401
サイズ超過 -> 413（追加した場合）

34. Presentation
`PassphraseForm` バリデーション、`UserLinkList` 検索フィルタ・期限切れ表示。

## Phase 10: Docs / Env

35. `README.md`
`/links` の使い方、`/api/links/save` `/api/links/load` の仕様、links系 env を追記。

36. `.env.example`
`RATE_LIMIT_LINKS_PER_MIN`, `LINKS_TTL_SECONDS`（＋追加の上限系 env）を追記。

37. `PLAN.md`
「マイリンク」をステータス/受け入れ基準/検証手順に追記。

## セキュリティ考慮

- KVキー: `SHA-256(合言葉)`（決定的ルックアップ用）
- 暗号化: リンク一覧は合言葉で `AES-256-GCM` 暗号化し、`Uint8Array` でKVに直接格納
- 合言葉キャッシュ: `sessionStorage` 使用（タブ閉鎖で自動消去）
- レート制限: IPベースで保存/読込APIを保護
- 同時書き込み: last-write-wins（MVPとして許容）

## 検証方法

1. `docker compose run --rm app npm run test`
2. `docker compose up --build` -> ブラウザでローカル動作確認
3. `/builder` で合言葉付きリンク作成 -> `/links` で合言葉入力 -> 一覧表示確認
4. タイトル/目的地の検索フィルタリング動作確認
5. 別ブラウザ/別端末で同じ合言葉 -> 同じリンク一覧が表示されることを確認
6. 期限切れリンクの表示状態確認
7. モバイルビューポート（375px, 390px）でレイアウト崩れなし確認

