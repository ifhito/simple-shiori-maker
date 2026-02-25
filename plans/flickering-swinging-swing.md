# Plan: プロンプト入力フォームを個別フィールドに分割

## Context

現在の `/prompt` ページは、旅行条件を一つの `<textarea>` にテンプレート形式でまとめて入力する設計になっている。
ユーザーがテンプレートの書式を崩しやすく、LLM に渡すテキストの品質がばらつく原因にもなっている。
フィールドごとに分割されたフォームにすることで、入力の明確さを高め、モバイルでも扱いやすくする。
全フィールドは任意（必須なし）。

## 変更方針

- `generatePromptUseCase`・`PromptInput` DTO・ルート・CSS は **変更しない**
- `PromptForm.tsx` 内でフィールド値を組み立て、既存の `requestText: string` インターフェースに渡す
  - 組み立てロジック（`assembleRequestText`）は presentation 層のモジュールスコープ関数として定義
  - 空フィールドはスキップ → 全フィールド空のとき `requestText = ""` → プロンプト空 → コピー無効（既存の動作と同じ）

## フィールド設計

| key | ラベル | 入力種別 | placeholder |
|-----|--------|----------|-------------|
| destination | 行き先 | text | 例: 金沢、富山 |
| startDateTime | 開始日時 | text | 例: 2026-03-20T09:00 |
| endDateTime | 終了日時 | text | 例: 2026-03-21T18:00 |
| people | 人数・同行者 | text | — |
| transport | 移動手段 | text | — |
| budget | 予算 | text | — |
| mustVisit | 絶対に行きたい場所（必ず全て含まれます）| textarea | — |
| meals | 食事の希望 | textarea | — |
| experiences | 体験の希望 | textarea | — |
| avoidance | 避けたいこと | textarea | — |
| notes | 補足メモ | textarea | — |

> 開始・終了日時は `datetime-local` ではなく `type="text"` を使う。
> フォーマット（`2026-03-20T09:00`）の一貫性を保ち、ブラウザ差異を排除するため。

## 組み立てロジック

```typescript
// PromptForm.tsx モジュールスコープ（エクスポートなし）

function assembleRequestText(fields: Record<PromptFieldKey, string>): string {
  return FIELD_CONFIG
    .filter(({ key }) => fields[key].trim() !== '')
    .map(({ key, assemblyLabel }) => `- ${assemblyLabel}: ${fields[key].trim()}`)
    .join('\n');
}
```

非空フィールドのみ `- ラベル: 値` の箇条書き行として出力。
`generatePromptUseCase` 内の `indentBlock()` が全体を2スペースインデントするため、既存のプロンプト構造を維持できる。

## 変更ファイル

### `src/presentation/components/PromptForm.tsx`

1. `REQUEST_TEMPLATE` 定数を削除
2. `PromptFieldKey` 型、`FieldConfig` インターフェース、`FIELD_CONFIG` 配列、`EMPTY_FIELDS` 定数、`assembleRequestText()` を追加（モジュールスコープ）
3. `useState(REQUEST_TEMPLATE)` → `useState(EMPTY_FIELDS)` に変更
4. `updateField` ヘルパーを追加
5. `useMemo` を `assembleRequestText(fields)` ベースに変更
6. 入力 `<textarea>` を `FIELD_CONFIG` をループした個別フィールドに置き換え
7. 説明文を「各項目を入力すると…」に更新
8. 出力エリア・コピーボタンはそのまま維持

レンダリング例:
```tsx
{FIELD_CONFIG.map(({ key, label, inputType, placeholder }) => (
  <div key={key}>
    <label className="label" htmlFor={`field-${key}`}>{label}</label>
    {inputType === 'textarea' ? (
      <textarea id={`field-${key}`} className="textarea" rows={3}
        value={fields[key]} onChange={(e) => updateField(key, e.target.value)}
        placeholder={placeholder} />
    ) : (
      <input id={`field-${key}`} className="input" type="text"
        value={fields[key]} onChange={(e) => updateField(key, e.target.value)}
        placeholder={placeholder} />
    )}
  </div>
))}
```

`htmlFor` ↔ `id` の対応により `getByLabelText('行き先')` がテストで動作する。

### `src/presentation/components/PromptForm.test.tsx`

既存3テストを新仕様に合わせて書き換え、新テストを追加。

**書き換え対象テスト:**

| 旧テスト | 新テスト |
|---------|---------|
| "starts with template text and generates prompt immediately" | "renders all field inputs and copy button is disabled initially" — 初期状態で `行き先` ラベルが存在し、出力が空でコピー無効を確認 |
| "updates prompt when free text changes" | "updates prompt when fields are filled in" — `行き先` に `金沢`、`開始日時` に `2026-03-20T09:00` を入力し、出力・コピー有効を確認 |
| "keeps prompt empty and copy disabled when free text is cleared" | "keeps prompt empty and copy disabled when all fields are empty" — 初期状態のまま確認（初期値が空なので即検証可能）|

**追加テスト:**

- "includes only non-empty fields in prompt" — `行き先` のみ入力、`開始日時:` が出力に含まれないことを確認
- "treats whitespace-only input as empty" — スペースのみ入力でプロンプト空・コピー無効
- "multi-line textarea field appears in prompt" — `mustVisit` に複数行入力し、出力に内容が含まれることを確認

## TDD 手順

1. `PromptForm.test.tsx` を先に書き換え（red）
2. `PromptForm.tsx` を実装（green）
3. 全テスト実行で確認

## 検証

```bash
docker compose run --rm app npx vitest run
```

UI 確認:
- `/prompt` を開き各フィールドに値を入力 → 生成プロンプトに反映されることを確認
- フィールドを全て空のままにするとコピーボタンが無効なことを確認
- 320px 幅（モバイル）で横スクロールが発生しないことを確認
