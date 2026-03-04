# Plan: Zod 導入による型安全バリデーション

## Context

現在のバリデーションは 3 つの Domain Service に手書きのヘルパー関数（`isObject`, `isNonEmptyString`, `isDate` 等）が合計 417 行あり、以下の問題がある。

- エラー収集ボイラープレートが各サービスで重複している
- `value as unknown as DesignLayout` の二重キャストが必要（TS が `Record<string,unknown>` を narrowing できないため）
- JSON 構造の型推論がなく、バリデーション後も手動キャストが必要
- `CompactShiori` の `fromCompactShiori` にも 40+ 行のガード実装が存在

Zod を導入してスキーマを「信頼できる唯一の型定義源」にし、ドメインサービスをシンプルなラッパーに置き換える。

**制約:** `humanizeValidationError.ts` が依存するエラー文字列フォーマット（`days[N].items[M].field ...` 等）は変更しない。

---

## 推奨アプローチ

### スキーマの配置場所: `src/domain/schemas/`（新設）

```
src/domain/
  entities/       (変更なし — TypeScript interface を維持)
  services/       (薄いラッパーに置換)
  schemas/        (新設 — Zod スキーマ)
    zodErrorBridge.ts
    DesignSpecSchema.ts
    ShioriSchema.ts
    UserLinkListSchema.ts
```

> schemas はドメイン知識（何が正しい値か）なので domain 層に置く。infrastructure への依存はない。

### ZodError → DomainValidationError ブリッジ

Zod の `issue.path` 配列を既存のエラーフォーマットに変換：

```typescript
// ['days', 0, 'items', 1, 'time'] + 'は必須文字列です'
//   → 'days[0].items[1].time は必須文字列です'
path.join('.').replace(/\.(\d+)/g, '[$1]') + ' ' + message
```

これにより `humanizeValidationError.ts` のすべての正規表現は変更不要。

---

## Agent チーム構成

```
[Phase 0] Zod インストール
    ↓ (全エージェントのブロッカー)

[Agent A] スキーマ層の作成          ← 最初に実行
  作成: zodErrorBridge.ts / DesignSpecSchema.ts / ShioriSchema.ts / UserLinkListSchema.ts
  作成: ShioriSchema.test.ts / DesignSpecSchema.test.ts（スキーマ直接テスト）
    ↓

[Agent B] ShioriValidationService 置換    [Agent C] DesignSpec + UserLinkList 置換
  修正: ShioriValidationService.ts          修正: DesignSpecValidationService.ts
  既存テストがそのままパスすること            修正: UserLinkListValidationService.ts
                                            既存テストがそのままパスすること
    ↓ B+C 完了後

[Agent D] CompactShiori マッパー整理
  修正: shioriCompactMapper.ts
  内部ガード関数を CompactShioriSchema に置換
```

**B と C は並列実行可能。D は B・C 完了後。**

---

## ファイル変更仕様

### 新規作成

| ファイル | 内容 |
|---------|------|
| `src/domain/schemas/zodErrorBridge.ts` | `zodErrorToDomainError(err: ZodError): DomainValidationError` |
| `src/domain/schemas/ShioriSchema.ts` | `ShioriSchema`, `ShioriDaySchema`, `ShioriItemSchema` |
| `src/domain/schemas/DesignSpecSchema.ts` | `DesignSpecSchema`, `DesignLayoutSchema`, `DesignPaletteSchema` |
| `src/domain/schemas/UserLinkListSchema.ts` | `UserLinkListSchema`, `UserLinkEntrySchema` |
| `src/domain/schemas/ShioriSchema.test.ts` | スキーマ直接テスト（エラー文字列の exact match 検証含む） |
| `src/domain/schemas/DesignSpecSchema.test.ts` | 同上 |

### 修正（公開 API は変更なし）

| ファイル | 変更内容 |
|---------|---------|
| `src/domain/services/ShioriValidationService.ts` | ヘルパー関数・エラー収集ロジックを削除、Zod ラッパーに置換。`DomainValidationError` クラスと `validateShioriData()` / `validateShioriJsonString()` シグネチャは維持 |
| `src/domain/services/DesignSpecValidationService.ts` | 同様に Zod ラッパーへ。`validateDesignSpec()` シグネチャ維持 |
| `src/domain/services/UserLinkListValidationService.ts` | 同様に Zod ラッパーへ |
| `src/application/mappers/shioriCompactMapper.ts` | `isObject`/`isNonEmptyString`/`ensureCompactDay`/`ensureCompactItem` を削除し、内部 `CompactShioriSchema` に置換。外部 API は変更なし |
| `package.json` | `"zod": "^3.23.0"` を `dependencies` に追加 |

### 変更なし（重要）

- `src/domain/entities/` 配下全て（interface は維持）
- `src/presentation/components/editor/humanizeValidationError.ts`
- `src/routes/api/encrypt.ts` / `decrypt.ts`（`validateShioriData` を呼ぶだけなので無変更）
- 既存テストファイル一式（`.test.ts`）

---

## 主要実装ポイント

### 1. TimeSchema: validate → transform で normalizeTime を内包

```typescript
const TimeSchema = z.string()
  .min(1, 'は必須文字列です')
  .refine(v => {
    if (!/^\d{1,2}:\d{2}$/.test(v)) return false;
    const [h, m] = v.split(':').map(Number);
    return h >= 0 && h <= 23 && m >= 0 && m <= 59;
  }, 'は HH:mm 形式である必要があります')
  .transform(v => v.replace(/^(\d):/, '0$1:'));  // "9:30" → "09:30"
```

### 2. 時系列チェック: `.superRefine()` で days[N].items パスに addIssue

```typescript
ShioriDaySchema = z.object({ ... })
  .superRefine((day, ctx) => {
    for (let i = 1; i < day.items.length; i++) {
      if (day.items[i - 1].time > day.items[i].time) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ['items'],
          message: 'は時系列順である必要があります'
        });
        break;
      }
    }
  });
```
→ 生成されるエラー文字列: `days[0].items は時系列順である必要があります`
→ `humanizeValidationError.ts` の `DAY_ITEMS_ONLY` + `includes('時系列')` に合致 ✓

### 3. ルートオブジェクト型エラー

```typescript
z.object({...}, {
  invalid_type_error: 'JSON全体はオブジェクトである必要があります'
})
```
→ パスなしのため文字列がそのまま → `startsWith('JSON')` → `'JSONの形式が正しくありません'` ✓

### 4. zodErrorBridge のパスフォーマット

```typescript
export function zodErrorToDomainError(error: ZodError): DomainValidationError {
  const details = error.issues.map(issue => {
    const formattedPath = issue.path
      .join('.')
      .replace(/\.(\d+)/g, '[$1]');
    return formattedPath ? `${formattedPath} ${issue.message}` : issue.message;
  });
  return new DomainValidationError(details);
}
```

### 5. Zod バージョン: v3 系（`^3.23.0`）を使用

v4 はアルファ段階のため v3 を使用。Cloudflare Workers + Vite bundler で動作確認済み。

---

## 削除するコード（不要になるもの）

### `ShioriValidationService.ts` から削除

| 削除対象 | 理由 |
|---------|------|
| `function isObject()` | `z.object()` が代替 |
| `function isNonEmptyString()` | `z.string().min(1)` が代替 |
| `function isDate()` | `z.string().regex()` が代替 |
| `function isTime()` | `TimeSchema` の `.refine()` が代替 |
| `function normalizeTime()` | `TimeSchema` の `.transform()` が代替 |
| `function isDateTime()` | `DateTimeStringSchema` の `.refine()` が代替 |
| `function validateItem()` | `ShioriItemSchema` が代替 |
| `function validateDay()` | `ShioriDaySchema` + `.superRefine()` が代替 |
| エラー収集ボイラープレート (`const errors: string[] = []` 等) | Zod の `safeParse` が代替 |

### `DesignSpecValidationService.ts` から削除

| 削除対象 | 理由 |
|---------|------|
| `function isObject()` / `isNonEmptyString()` | Zod が代替 |
| `function isHexColor()` | `z.string().regex()` が代替 |
| `function validatePalette()` | `DesignPaletteSchema` が代替 |
| `function validateMotif()` | `DesignMotifSchema` が代替 |
| `function validateLayout()` | `DesignLayoutSchema` が代替 |
| エラー収集ボイラープレート全体 | Zod が代替 |

### `UserLinkListValidationService.ts` から削除

- 全手書きヘルパー関数とエラー収集ロジック

### `shioriCompactMapper.ts` から削除

| 削除対象 | 理由 |
|---------|------|
| `function isObject()` / `isNonEmptyString()` | 内部コピー — Zod が代替 |
| `function ensureCompactItem()` | `CompactItemSchema` が代替 |
| `function ensureCompactDay()` | `CompactDaySchema` が代替 |
| `fromCompactShiori` 内の if ガード 40+ 行 | `CompactShioriSchema.safeParse()` が代替 |

---

## 削減効果

| ファイル | 現在 | 置換後 |
|---------|------|--------|
| `ShioriValidationService.ts` | 191 行 | ~25 行 |
| `DesignSpecValidationService.ts` | 165 行 | ~15 行 |
| `UserLinkListValidationService.ts` | 61 行 | ~15 行 |
| `shioriCompactMapper.ts` | 136 行 | ~70 行 |
| 新規スキーマファイル群 | 0 行 | ~155 行 |
| **合計変化** | **417 → 280 行** | **−137 行、型推論 ◎** |

---

## Git ワークフロー

### 1. ブランチ作成（実装開始前）

```bash
git checkout main
git pull origin main
git checkout -b feat/introduce-zod
```

### 2. 実装・コミット

各 Agent の完了ごとにコミットを分ける（例）：

```
feat(schema): add Zod schemas and zodErrorBridge for domain entities
feat(domain): replace ShioriValidationService with Zod wrapper
feat(domain): replace DesignSpecValidationService and UserLinkListValidationService with Zod
feat(mapper): replace CompactShiori manual guards with Zod schema
```

### 3. PR 作成（全テスト通過後）

```bash
git push -u origin feat/introduce-zod
gh pr create \
  --title "feat: introduce Zod for type-safe validation" \
  --body "$(cat <<'EOF'
## Summary
- Add Zod schemas in `src/domain/schemas/` as single source of truth for domain entity types
- Replace 417 lines of manual validation helpers with Zod-backed thin wrappers
- Preserve all public API signatures and error message formats (humanizeValidationError unmodified)
- Net reduction: ~137 lines; gain: type inference via `z.infer<>`

## Changes
- `src/domain/schemas/` (new): ShioriSchema, DesignSpecSchema, UserLinkListSchema, zodErrorBridge
- `src/domain/services/`: ShioriValidationService, DesignSpecValidationService, UserLinkListValidationService replaced with Zod wrappers
- `src/application/mappers/shioriCompactMapper.ts`: internal guards replaced with CompactShioriSchema

## Test plan
- [ ] All existing tests pass without modification
- [ ] New schema unit tests pass (including exact error string assertions)
- [ ] `tsc --noEmit` passes with no new errors

Closes #13
EOF
)"
```

---

## 検証方法

```bash
# 全テスト実行（Docker 経由）
docker compose run --rm app sh -c "cd /workspace && node_modules/.bin/vitest run"

# Agent A 完了後: スキーマ単体テスト
docker compose run --rm app sh -c "cd /workspace && node_modules/.bin/vitest run src/domain/schemas"

# Agent B/C 完了後: サービステスト（既存テストがパスすることを確認）
docker compose run --rm app sh -c "cd /workspace && node_modules/.bin/vitest run src/domain/services"

# 全体: 既存テスト + 新スキーマテスト + TS 型チェック
docker compose run --rm app sh -c "cd /workspace && node_modules/.bin/vitest run"
docker compose run --rm app sh -c "cd /workspace && npx tsc --noEmit"
```

`humanizeValidationError.ts` の動作確認は `ShioriSchema.test.ts` で DomainValidationError の `details` 文字列の exact match を検証することで行う。

---

## リスクと対策

| リスク | 対策 |
|--------|------|
| Zod エラー文字列が humanizer の正規表現にマッチしない | スキーマテストで `details` の exact match を検証。ブリッジのパスフォーマットも単体テスト |
| `.transform()` により `z.infer<>` 型が interface と乖離 | サービスラッパーで `result.data as Shiori` キャスト（ランタイム検証済みなので安全） |
| Zod v3 + Cloudflare Workers バンドル問題 | Zod v3 は CF Workers で広く使用されており問題なし |
