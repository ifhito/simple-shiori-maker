# コードレビュー修正計画

## 対象ブランチ
`claude/code-review-zP0p5`

## 修正一覧

### 修正1: `decryptV4` と `decryptV6` の重複解消
- **ファイル**: `src/infrastructure/crypto/serverCrypto.ts`
- **問題**: `decryptV4`（`0x04`）と `decryptV6`（`0x06`）はどちらも brotli 解凍付きバイナリ復号で、本体が完全に同一
- **修正**: 共通処理を `decryptBrotliBinaryPacked` ヘルパーに抽出し、両バージョンから呼び出す

### 修正2: `isDate` の値域検証追加
- **ファイル**: `src/domain/services/ShioriValidationService.ts`
- **問題**: `isDate` は正規表現のみで、`2024-13-99` などの不正日付が通過する
- **修正**: 月が 1〜12、日が 1〜31 の範囲内であることを検証する

### 修正3: `decrypt.ts` のエラーメッセージ素通し修正
- **ファイル**: `src/routes/api/decrypt.ts`
- **問題**: `error instanceof Error` の場合に `error.message` をそのままクライアントに返す。予期しない例外が内部情報を漏洩するリスクがある
- **修正**: フォールバックを固定メッセージ `'復号に失敗しました'` に統一する

### 修正4: レートリミッターの期限切れエントリ削除
- **ファイル**: `src/infrastructure/security/rateLimit.ts`
- **問題**: 期限切れになったバケットが `Map` に残り続け、メモリが際限なく増加する
- **修正**: `consumeRateLimit` でウィンドウリセット時に古いエントリを削除する簡易 GC を追加

### 修正5: `mapUrl` の空文字列拒否
- **ファイル**: `src/domain/services/ShioriValidationService.ts`
- **問題**: `mapUrl: ""` が有効として通過し、レンダリング時に無効リンクになる
- **修正**: `mapUrl` が存在する場合は非空文字列であることを要求する

### 修正6: `cloudflareEnvPromise` のエラー永続キャッシュ修正
- **ファイル**: `src/infrastructure/storage/sharedPayloadStorage.ts`
- **問題**: `resolveCloudflareEnvBindings` が一度 `null` に解決されると再評価されない
- **修正**: Promise を `then` ではなく `.catch` でリセットし、失敗時は再試行できるようにする

### 修正7: `exists()` の KV 二重読み最適化
- **ファイル**: `src/infrastructure/storage/sharedPayloadStorage.ts`
- **問題**: `exists()` が ArrayBuffer で `null` を受け取った後、さらに Text で再フェッチする
- **修正**: `getWithMetadata` で軽量確認し、それが使えない場合のみフォールバック

## 修正の影響範囲
- ロジック変更なし（バグ修正・安全性強化のみ）
- 後方互換性を維持（v3/v4/v5/v6 の復号は引き続き動作）
- テストの更新が必要な箇所: `ShioriValidationService.test.ts`（`isDate` の新しい検証ケース）
