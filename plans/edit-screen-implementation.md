# Plan: しおり編集画面の実装

## Context

既存のフローはプロンプト生成 → 外部 LLM → JSON ペースト → 共有リンク生成のみで、**編集機能が存在しない**。

- LLM 出力の微修正をしたい場合、JSON テキストを直接書き換えるしかなく UX が悪い
- フォームによるフィールド編集・スポット並び替え・AI再編集など直感的な操作が求められる
- Clean Architecture + DDD の層境界を維持しながら追加する

**目標**: `/edit` ルートに手動編集・JSON直接編集・AI編集・スポット並び替えが可能な編集画面を追加し、`/builder` と `/s/$key` から双方向に遷移できるようにする。

---

## 変更方針

- Application 層に **純粋関数** の immutable 更新ユーティリティと AI 編集用プロンプト生成を置く
- Presentation 層にコンポーネントを下から上へ積み上げる（ReorderControls → Item → Day → Page）
- ルート間データ連携は **sessionStorage** で行う（URLにJSONを載せない、タブ終了時に消える）
- `validateShioriData()` を JSON 適用時・リンク生成時の両方で呼び出し、一貫したバリデーションを保つ

---

## 新規ファイル

### Application 層

| ファイル | 役割 |
|---------|------|
| `src/application/usecases/editShiori.ts` | Shiori を immutable に操作する純粋関数群 |
| `src/application/usecases/generateEditPrompt.ts` | 現在のしおり JSON を埋め込んだ AI 修正用プロンプト生成 |

#### `editShiori.ts` が公開する関数

```typescript
export function updateHeader(s, patch): Shiori
export function updateDayLabel(s, dayIndex, label): Shiori
export function updateItem(s, dayIndex, itemIndex, patch): Shiori
export function addItem(s, dayIndex): Shiori       // 末尾に空アイテム追加
export function removeItem(s, dayIndex, itemIndex): Shiori
export function moveItemUp(s, dayIndex, itemIndex): Shiori
export function moveItemDown(s, dayIndex, itemIndex): Shiori
export function addDay(s): Shiori                  // 末尾に空の日を追加
export function removeDay(s, dayIndex): Shiori
export function moveDayUp(s, dayIndex): Shiori
export function moveDayDown(s, dayIndex): Shiori
```

すべて新しい Shiori オブジェクトを返す（React の setState との相性が良い）。

#### `generateEditPrompt.ts`

```typescript
export interface EditPromptInput {
  currentShiori: Shiori;
  modificationRequest: string;   // 空文字は "全体を見直して改善してください" に置換
}
export function generateEditPromptUseCase(input: EditPromptInput): string
```

`generatePrompt.ts` と同一の出力ルール（厳密 JSON、strict quote）を採用することで、生成 JSON を `validateShioriData()` で検証できる。

### テスト

| ファイル | 内容 |
|---------|------|
| `src/test/editShiori.test.ts` | 純粋関数を網羅（24テスト）|
| `src/test/generateEditPrompt.test.ts` | プロンプト内容・デフォルト値・ルール記載を確認（7テスト）|

### Presentation 層コンポーネント

| ファイル | 役割 |
|---------|------|
| `src/presentation/components/editor/ReorderControls.tsx` | ↑↓× アイコンボタン（min 44px タップエリア） |
| `src/presentation/components/editor/ItemEditor.tsx` | ShioriItem 1件の制御フォーム |
| `src/presentation/components/editor/DayEditor.tsx` | 1日分のアイテム一覧 + ラベル編集 |
| `src/presentation/components/editor/EditPageHeader.tsx` | title / destination / 日程の編集フォーム |
| `src/presentation/components/editor/EditModeTab.tsx` | フォーム / JSON モード切替タブ UI |
| `src/presentation/components/editor/JsonEditPanel.tsx` | JSON テキスト直接編集 + 適用ボタン |
| `src/presentation/components/editor/AiEditPanel.tsx` | AI 修正プロンプト生成・コピー + JSON 貼り付け適用 |
| `src/presentation/components/editor/EditSummaryBar.tsx` | sticky 下部バー（バリデーション状態 + リンク生成 CTA）|

### Route

| ファイル | 役割 |
|---------|------|
| `src/routes/edit.tsx` | `/edit` ルート本体（状態管理・sessionStorage I/O）|

---

## 修正する既存ファイル

### `src/presentation/components/BuilderForm.tsx`

- `onEdit?: (json: string) => void` prop 追加
- `initialJson?: string` prop 追加（`/edit` から戻ったとき JSON を復元）
- JSON 入力後に「このJSONを編集する」ボタン表示
- `initialJson` が後から来てもテキストエリアに反映されるよう `useEffect` で同期

### `src/routes/builder.tsx`

- `useNavigate` / `useEffect` を追加
- mount 時に `shiori:builder-draft` を読み込み `initialJson` ステートに設定後削除
- `handleEdit(json)` ハンドラ: `shiori:edit-draft` に書き込み → `/edit` に遷移
- `BuilderForm` に `onEdit` / `initialJson` を渡す

### `src/routes/s/$key.tsx`

- `useNavigate` を追加
- `handleEdit()`: `shiori:edit-draft` に現在の `data` を書き込み → `/edit` に遷移
- アンロック後の article 下部に「このしおりを編集する」ボタンを追加

### `src/styles.css`

編集画面専用クラスを追加:

```css
.edit-layout          /* flex-direction: column; gap: 14px */
.edit-page-title
.edit-mode-tab        /* タブ行 */
.edit-tab-button      /* 非アクティブ */
.edit-tab-button.active
.edit-day             /* 日ブロック（border radius 18px, ゴールド系ボーダー）*/
.edit-day-header
.edit-day-meta
.edit-day-label-input
.edit-items-list
.edit-item            /* スポットブロック */
.edit-item-header
.edit-item-fields
.edit-field-row
.reorder-controls
.icon-button          /* min 44x44px */
.icon-button.danger
.icon-button:disabled
.ai-edit-panel
.error-list
.edit-summary-bar     /* position: sticky; bottom: 0 */
.edit-summary-status
.edit-summary-errors
.edit-summary-errors li
.edit-summary-actions
.error-badge
.ok-badge
```

デスクトップ（768px+）では `.edit-item-fields` を 2 カラムグリッドに変更。

### `src/routeTree.gen.ts`

`/edit` ルートをインポート・登録（通常は vite dev が自動生成するが Docker 環境で手動追加）。

---

## ルート間データ連携（sessionStorage）

| キー | 書き込み元 | 読み取り先 | 削除タイミング |
|-----|-----------|-----------|--------------|
| `shiori:edit-draft` | `/builder` の「編集する」 | `/edit` mount 時 | — |
| `shiori:edit-draft` | `/s/$key` の「編集する」 | `/edit` mount 時 | — |
| `shiori:edit-draft` | `/edit` 自動保存（shiori変更時） | `/edit` mount 時（ブラウザ戻り継続）| — |
| `shiori:builder-draft` | `/edit` の「しおりリンクを作成」 | `/builder` mount 時 | mount 時に削除 |

URL パラメータは使用しない（JSON が数 KB になり URL が汚れるため）。

---

## 編集モード切替ロジック

```typescript
// フォーム → JSON
function switchToJson() {
  if (shiori) setJsonText(JSON.stringify(shiori, null, 2));
  setEditMode('json');
}

// JSON → フォーム（適用ボタン押下時）
function applyJson() {
  const parsed = parseJsonText(jsonText);      // JsonParseError を投げる可能性
  const validated = validateShioriData(parsed); // DomainValidationError を投げる可能性
  setShiori(validated);
  setEditMode('form');
}
```

---

## コンポーネント階層

```
EditPage (routes/edit.tsx)
├── state: Shiori | null, editMode: 'form' | 'json', jsonText, jsonErrors, aiErrors, previewVisible
│
├── EditModeTab              ← フォーム / JSON タブ
│
├── [json] JsonEditPanel     ← textarea + 適用ボタン
│
├── [form] EditPageHeader    ← title / destination / startDateTime / endDateTime
├── [form] DayEditor × N
│   ├── ReorderControls (day)
│   ├── day.label input
│   └── ItemEditor × M
│       ├── ReorderControls (item)
│       └── time / title / description / place / mapUrl inputs
├── [form] ＋ 日を追加 button
│
├── AiEditPanel (<details> 常時表示)
│   ├── modificationRequest textarea
│   ├── 生成プロンプト textarea (readonly)
│   ├── コピーボタン
│   ├── AI結果JSON textarea
│   └── 修正を適用ボタン
│
├── [previewVisible] ShioriTimeline インラインプレビュー
│
└── EditSummaryBar (position: sticky; bottom: 0)
    ├── バリデーションエラー一覧 or ✓ 検証OK
    ├── プレビュー切替ボタン
    └── しおりリンクを作成ボタン（エラー時 disabled）
```

---

## TDD 手順

1. `src/test/editShiori.test.ts` を先に書く（red）
2. `src/application/usecases/editShiori.ts` を実装して pass させる
3. `src/test/generateEditPrompt.test.ts` を書く（red）
4. `src/application/usecases/generateEditPrompt.ts` を実装して pass させる
5. Presentation コンポーネントを下から実装: `ReorderControls` → `ItemEditor` → `DayEditor` → `EditPageHeader` → `EditModeTab` → `JsonEditPanel` → `AiEditPanel` → `EditSummaryBar`
6. `edit.tsx` ルートで組み合わせ
7. `BuilderForm.tsx` に `onEdit` / `initialJson` prop 追加
8. `builder.tsx` に `onEdit` ハンドラ + mount 時 draft 読み込み追加
9. `s/$key.tsx` に「編集する」ボタン追加
10. `styles.css` に CSS 追加
11. `routeTree.gen.ts` に `/edit` 登録

---

## 検証フロー

```bash
# ユニットテスト（Docker）
docker compose run --rm app npm run test

# 動作確認フロー 1: builder → edit → builder
1. /builder で有効な Shiori JSON を貼り付け
2. 「このJSONを編集する」クリック → /edit に遷移
3. タイトル・スポット編集、↑↓ で並び替え
4. 「しおりリンクを作成」→ /builder に戻り JSON が反映されていることを確認

# 動作確認フロー 2: shared view → edit
1. /s/{key} でパスワード解除
2. 「このしおりを編集する」クリック → /edit に遷移
3. 編集できることを確認

# 動作確認フロー 3: AI 編集
1. AiEditPanel を開き修正内容を入力
2. 「プロンプトを生成」→ コピー → 外部 LLM に貼り付け
3. 返ってきた JSON を貼り付けエリアに入力
4. 「修正を適用」→ エディタが更新されることを確認
5. 不正 JSON を貼り付け → エラーメッセージが表示されることを確認

# モバイル確認
DevTools で 375px 幅に設定し、全操作が横スクロールなく使えることを確認
```

---

## 結果

- 新規テスト: 31件追加（editShiori: 24、generateEditPrompt: 7）
- 全テスト: 108件パス（18ファイル）
