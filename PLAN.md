# 旅行しおりアプリ 実装計画/進捗（TanStack Start + SSR + API + Mobile First）

## 現在ステータス
- TanStack Start ベースへの置換: 完了
- 4画面（使い方/プロンプト/作成/しおり）: 実装済み
- 暗号化/復号API（`/api/encrypt`, `/api/decrypt`）: 実装済み
- TDDベースのテスト追加: 実装済み
- Docker Compose で `test` / `build` 成功: 確認済み
- 日付/時刻フォーマット検証と時系列順検証: 実装済み
- しおり画面デザイン（ヒーロー + 道ライン演出）改善: 実装済み
- `/prompt` の入力仕様を更新（旅行条件メモテンプレート入力）: 実装済み
- 共有リンクを `id/hash` 方式から `key + KV` 方式へ移行（URL長さ/431対策）: 実装済み
- JSON生成プロンプト強化（```jsonコードブロック指定 + 引用符ルール厳格化）: 実装済み
- 新規暗号フォーマットを `v5(compact + base2048)` へ更新（新規生成は非圧縮、`v3/v4` は後方互換復号）: 実装済み
- 復号の後方互換（`v3` と Base64URL `v4`）と `v1/v2` 拒否: 実装済み
- 共有データcompact化（`mapUrl` 保持）: 実装済み
- 新共有ルート `/s/$key` 追加（旧 `/shiori` は再生成案内）: 実装済み
- Cloudflare Workers 向け設定（`wrangler.toml`）追加: 実装済み
- 作成/閲覧レート制限、サイズ制限、作成停止フラグ: 実装済み

## 方針（固定）
1. アーキテクチャ: `Clean Architecture + DDD`
2. 依存方向: `presentation -> application -> domain`
3. 暗号化/復号はサーバAPIで実行し、平文パスワードを永続保存しない
4. 外部LLMは手動運用（アプリ内で有料LLM APIは呼ばない）
5. モバイルファースト（320px以上で横スクロールなし）
6. 開発/検証は Docker Compose を標準とする

## ディレクトリ構成（実装済み）
- `src/routes/*`:
  - `__root.tsx`
  - `index.tsx`
  - `prompt.tsx`
  - `builder.tsx`
  - `shiori.tsx`（旧リンク再生成案内）
  - `s/$key.tsx`
  - `api/encrypt.ts`
  - `api/decrypt.ts`
- `src/application/*`:
  - `usecases/generatePrompt.ts`
  - `usecases/createShareLink.ts`
  - `usecases/unlockShiori.ts`
  - `mappers/shioriCompactMapper.ts`
  - `dto/shiori.ts`
- `src/domain/*`:
  - `entities/Shiori.ts`
  - `services/ShioriValidationService.ts`
  - `repositories/PasshashRepository.ts`
  - `repositories/SharedPayloadRepository.ts`
- `src/infrastructure/*`:
  - `config/runtimeConfig.ts`
  - `crypto/serverCrypto.ts`
  - `parsing/jsonParser.ts`
  - `security/rateLimit.ts`
  - `storage/passhashStorage.ts`
  - `storage/sharedPayloadStorage.ts`
  - `http/shioriApiClient.ts`
- `src/presentation/components/*`:
  - `BuilderForm.tsx`
  - `PromptForm.tsx`
  - `ShioriUnlockPanel.tsx`
  - `ShioriTimeline.tsx`
  - `layoutMode.ts`

## API契約（固定）
- `POST /api/encrypt`
  - request: `{"plainText":"...","password":"..."}`
  - response: `{"key":"...","passhash":{"v":1,"salt":"...","hash":"...","iter":100000},"expiresAt":1767225600000}`
- `POST /api/decrypt`
  - request: `{"key":"...","password":"..."}`
  - response: `{"plainText":"...","expiresAt":1767225600000}`
  - note: `expiresAt` は保存メタデータが無い場合（旧共有データなど）に `null` になる

## 暗号仕様（固定）
- KDF: PBKDF2(SHA-256, 100000)
- 暗号: AES-256-GCM
- 新規共有データ: `d = base2048([0x05 | salt(16) | iv(12) | ciphertext])`（KVに保存）
- 圧縮: 新規発行は未使用（後方互換復号のため `v4(brotli)` 読み取りのみ維持）
- 後方互換復号: `v4 + Base64URL`, `v3 + gzip + Base64URL(JSON envelope)` を受理
- 非対応: `v1/v2`
- 共有URL形式: `/s/<key>`
- localStorage保存: `shiori:passhash:<key>` に passhash メタデータのみ
- 保存TTL: `SHARE_TTL_SECONDS`（既定30日）

## モバイル要件（固定）
- 320px以上で横スクロール禁止
- タップ領域は最小44x44px
- しおり画面はスマホ時1カラム時系列
- 検証ビューポート: 375x812 / 390x844 / 430x932

## テスト（実装済み）
- `src/application/usecases/generatePrompt.test.ts`
- `src/application/usecases/createShareLink.test.ts`
- `src/application/usecases/unlockShiori.test.ts`
- `src/domain/services/ShioriValidationService.test.ts`
- `src/infrastructure/crypto/serverCrypto.test.ts`
- `src/routes/api/-encrypt.test.ts`
- `src/routes/api/-decrypt.test.ts`
- `src/application/mappers/shioriCompactMapper.test.ts`
- `src/presentation/components/BuilderForm.test.tsx`
- `src/presentation/components/PromptForm.test.tsx`
- `src/presentation/components/ShioriUnlockPanel.test.tsx`
- `src/presentation/components/shareLink.test.ts`
- `src/presentation/components/layoutMode.test.ts`
- 合計: 59 tests passed（`docker compose run --rm app npm run test`）

## 実行コマンド（標準）
- 依存インストール:
  - `docker compose run --rm app npm install`
- テスト:
  - `docker compose run --rm app npm run test`
- ビルド:
  - `docker compose run --rm app npm run build`
- 開発起動:
  - `docker compose up --build`

## 受け入れ基準
- 4画面の主要フローが通る
- `/prompt` は旅行条件メモ（テンプレート付き）だけで入力できる
- `/prompt` の旅行条件メモを編集すると即時で生成プロンプトに反映される
- 生成プロンプトは ` ```json ` コードブロック出力と引用符ルール（半角 `"` / `\"`）を明示する
- 生成プロンプトのスキーマ例は `mapUrl` を含めず、最小必須項目を明示する
- JSON不正時に明示エラー
- 誤パスワード時に復号不可
- 共有URLは `/s/<key>` 形式で短縮され、暗号ペイロードはKVに保持される
- 復号APIは `key` 参照で動作し、期限切れ/未存在キーは 404 を返す
- `/builder` と `/s/$key` は `expiresAt` が取得できる場合に有効期限/残り時間を表示する
- 作成/閲覧APIにレート制限が適用される（429）
- 320px+で横スクロールなし
- Docker Compose でテスト/ビルド成功

## 次アクション
1. `docker compose up --build` で実機UI確認（375/390/430幅）
2. `/s/$key` の視覚演出をさらに画像寄せする場合は装飾パーツ（イラスト/アイコン）を追加
3. Cloudflare KV の実IDを `wrangler.toml` に設定してデプロイ確認
