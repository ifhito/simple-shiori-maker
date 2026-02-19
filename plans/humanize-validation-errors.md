# Plan: バリデーションエラーをユーザー向け表現に変換

## Context

編集画面の `EditSummaryBar` に表示されるエラーメッセージが、ドメイン層の技術的な表現（`days[0].items は時系列順である必要があります`）のまま表示されており、一般ユーザーには意味が伝わりにくい。

**目標**: ドメイン層・検証ロジックには一切手を加えず、プレゼンテーション層に変換関数を置いてユーザー向け日本語に翻訳する。

---

## 変更方針

- `DomainValidationError.details` の文字列を正規表現でパースし、ユーザー向けメッセージに変換する関数を **presentation 層のみ** に追加する
- ドメイン層 (`ShioriValidationService.ts`) は変更しない（内部コードの正確な表現を維持）
- 変換できないメッセージはフォールバックとしてそのまま表示する

---

## 新規ファイル

### `src/presentation/components/editor/humanizeValidationError.ts`

パターン変換関数:

```typescript
export function humanizeValidationError(raw: string): string
```

#### 変換ルール一覧

| ドメイン層出力（raw） | ユーザー向け表示 |
|---|---|
| `title は必須文字列です` | `タイトルを入力してください` |
| `destination は必須文字列です` | `目的地を入力してください` |
| `startDateTime は必須文字列です` | `開始日時を入力してください` |
| `startDateTime は YYYY-MM-DDTHH:mm 形式…` | `開始日時の形式が正しくありません（例: 2026-03-20T09:00）` |
| `endDateTime は必須文字列です` | `終了日時を入力してください` |
| `endDateTime は YYYY-MM-DDTHH:mm 形式…` | `終了日時の形式が正しくありません（例: 2026-03-21T18:00）` |
| `days は1件以上必要です` | `日程を1日以上追加してください` |
| `days[N].items は時系列順…` | `N+1日目：スポットの時刻が時系列順になっていません（↑↓で並び替えてください）` |
| `days[N].items[M].time は必須文字列です` | `N+1日目 スポットM+1：時刻を入力してください` |
| `days[N].items[M].time は HH:mm 形式…` | `N+1日目 スポットM+1：時刻は HH:mm 形式で入力してください（例: 09:00）` |
| `days[N].items[M].title は必須文字列です` | `N+1日目 スポットM+1：スポット名を入力してください` |
| `days[N].items[M].description は必須文字列です` | `N+1日目 スポットM+1：説明を入力してください` |
| `days[N].items[M].place は必須文字列です` | `N+1日目 スポットM+1：場所を入力してください` |
| `days[N].items[M].mapUrl は文字列…` | `N+1日目 スポットM+1：地図URLの形式が正しくありません` |
| `days[N].label は必須文字列です` | `N+1日目：ラベルを入力してください` |
| `days[N].date は必須文字列です` | `N+1日目：日付を入力してください` |
| `days[N].date は YYYY-MM-DD 形式…` | `N+1日目：日付は YYYY-MM-DD 形式で入力してください（例: 2026-03-20）` |
| `JSON全体は…` / `JSONの構文が…` | `JSONの形式が正しくありません` |
| （上記に一致しない）| そのまま表示（フォールバック） |

パターンマッチは正規表現の優先度順（より具体的なパターンを先に評価）:
1. `days[N].items[M].field`
2. `days[N].items[M]`（オブジェクトエラー）
3. `days[N].items`（時系列・配列エラー）
4. `days[N].field`
5. `days[N]`（オブジェクトエラー）
6. トップレベルフィールド

---

## 修正する既存ファイル

### `src/presentation/components/editor/EditSummaryBar.tsx`

- `humanizeValidationError` をインポート
- エラーリスト表示部で `{e}` → `{humanizeValidationError(e)}` に変更
- エラー件数バッジの下にエラー一覧を展開表示（件数だけでなく内容も見える）

```tsx
<div className="edit-summary-status">
  {hasErrors ? (
    <>
      <span className="error-badge">⚠ {validationErrors.length}件のエラー</span>
      <ul className="edit-summary-errors" role="alert">
        {validationErrors.map((e, i) => (
          <li key={i}>{humanizeValidationError(e)}</li>
        ))}
      </ul>
    </>
  ) : (
    <span className="ok-badge">✓ 検証OK</span>
  )}
</div>
```

### `src/presentation/components/editor/JsonEditPanel.tsx`

- `humanizeValidationError` をインポート
- JSON 適用時のエラー表示に適用

### `src/presentation/components/editor/AiEditPanel.tsx`

- `humanizeValidationError` をインポート
- AI JSON 適用時のエラー表示に適用

### `src/styles.css`

- `.edit-summary-bar` の `align-items: center` → `align-items: flex-start`（エラーリストが縦に伸びてもボタンが上に揃う）
- `.edit-summary-status` 追加（縦並びラッパー）
- `.edit-summary-errors` / `.edit-summary-errors li` 追加（赤字・小フォント）
- `.edit-summary-actions` に `flex-shrink: 0` 追加

---

## 検証

```bash
docker compose run --rm app npm run test
# → 108件パス（変更による既存テストの破壊なし）
```

表示確認:
- 時刻が時系列でないスポットを作成 → `「1日目：スポットの時刻が時系列順になっていません（↑↓で並び替えてください）」` が表示される
- タイトルを空にして「しおりリンクを作成」→ `「タイトルを入力してください」` が表示される
- 不正 JSON を JSON パネルで適用 → ユーザー向けメッセージが表示される
