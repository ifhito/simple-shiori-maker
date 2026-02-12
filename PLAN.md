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
- 共有URLの431対策（`d` をクエリからハッシュへ移動）: 実装済み
- JSON生成プロンプト強化（```jsonコードブロック指定 + 引用符ルール厳格化）: 実装済み
- 暗号フォーマットを `v4(base2048 + brotli + compact)` へ更新: 実装済み
- 復号の後方互換（`v3` と Base64URL `v4`）と `v1/v2` 拒否: 実装済み
- 共有データcompact化（`mapUrl` 非保持）: 実装済み

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
  - `shiori.tsx`
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
  - `valueObjects/ShareId.ts`
  - `repositories/PasshashRepository.ts`
- `src/infrastructure/*`:
  - `crypto/serverCrypto.ts`
  - `parsing/jsonParser.ts`
  - `storage/passhashStorage.ts`
  - `http/shioriApiClient.ts`
- `src/presentation/components/*`:
  - `BuilderForm.tsx`
  - `PromptForm.tsx`
  - `ShioriUnlockPanel.tsx`
  - `ShioriTimeline.tsx`
  - `layoutMode.ts`

## API契約（固定）
- `POST /api/encrypt`
  - request: `{"plainText":"...","password":"...","id?":"..."}`
  - response: `{"id":"...","d":"...","passhash":{"v":1,"salt":"...","hash":"...","iter":120000}}`
- `POST /api/decrypt`
  - request: `{"d":"...","password":"..."}`
  - response: `{"plainText":"..."}`

## 暗号仕様（固定）
- KDF: PBKDF2(SHA-256, 120000)
- 暗号: AES-256-GCM
- 新規共有データ: `d = base2048([0x04 | salt(16) | iv(12) | ciphertext])`
- 圧縮: brotli（暗号化前）
- 後方互換復号: `v4 + Base64URL`, `v3 + gzip + Base64URL(JSON envelope)` を受理
- 非対応: `v1/v2`
- 共有URL形式: `/shiori?id=<id>#d=<encrypted>`
- localStorage保存: `shiori:passhash:<id>` に passhash メタデータのみ

## モバイル要件（固定）
- 320px以上で横スクロール禁止
- タップ領域は最小44x44px
- しおり画面はスマホ時1カラム時系列
- 検証ビューポート: 375x812 / 390x844 / 430x932

## テスト（実装済み）
- `src/application/usecases/generatePrompt.test.ts`
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
- 合計: 47 tests passed（`docker compose run --rm app npm run test`）

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
- 長文データでも共有URLで431を起こしにくい（`d` がハッシュ格納）
- 復号APIは `v3/v4` 互換を維持しつつ `v1/v2` を拒否する
- 320px+で横スクロールなし
- Docker Compose でテスト/ビルド成功

## 次アクション
1. `docker compose up --build` で実機UI確認（375/390/430幅）
2. `/shiori` の視覚演出をさらに画像寄せする場合は装飾パーツ（イラスト/アイコン）を追加
3. Netlifyデプロイ設定の最終確認（環境差分なし）
