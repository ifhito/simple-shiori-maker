# 計画: しおり編集画面の実装

## Context

現在の Shiori アプリはプロンプト生成 → 外部 LLM → JSON ペースト → 共有リンク生成というフローのみで、**編集機能が存在しない**。

- ユーザーが LLM の出力した JSON を微修正したい場合、JSON テキストを直接編集する必要があり UX が悪い
- 順序変更・スポット追加削除・AIによる修正生成など、直感的な編集体験が求められる
- 既存の Clean Architecture + DDD の境界を守りながら新機能を追加する

**目標**: `/edit` ルートに手動編集・AI編集・スポット並び替えが可能な編集画面を追加し、`/builder` と `/s/$key` から双方向に遷移できるようにする。

---

## ブランチ

```
git checkout feat/design-templates
git checkout -b feat/edit-screen
```

`feat/design-templates` から切る理由: デザインシステム（`DesignSpec`、複数レイアウトプリセット、CSS変数）が追加されており、編集画面はその変数・コンポーネントを活用する必要があるため。

---

## 作成する新規ファイル

### Application 層

| ファイル | 役割 |
|---------|------|
| `src/application/usecases/editShiori.ts` | Shiori を immutable に操作する純粋関数群 |
| `src/application/usecases/generateEditPrompt.ts` | 現在のしおり JSON を埋め込んだ AI 修正用プロンプト生成 |

### Presentation 層

| ファイル | 役割 |
|---------|------|
| `src/presentation/components/editor/ItemEditor.tsx` | ShioriItem 1件の編集フォーム（制御コンポーネント） |
| `src/presentation/components/editor/DayEditor.tsx` | 1日分のアイテム一覧 + ラベル編集 |
| `src/presentation/components/editor/ReorderControls.tsx` | ↑↓× アイコンボタン（共通） |
| `src/presentation/components/editor/EditPageHeader.tsx` | title / destination / 日程 の編集フォーム |
| `src/presentation/components/editor/EditModeTab.tsx` | フォーム/JSON モード切替タブ UI |
| `src/presentation/components/editor/JsonEditPanel.tsx` | JSON テキスト直接編集 + 適用ボタン |
| `src/presentation/components/editor/AiEditPanel.tsx` | AI 修正プロンプト表示 + JSON 貼り付け適用 |
| `src/presentation/components/editor/EditSummaryBar.tsx` | スティッキー下部バー（バリデーション状態 + リンク生成 CTA） |

### Route

| ファイル | 役割 |
|---------|------|
| `src/routes/edit.tsx` | `/edit` ルート（状態管理・sessionStorage I/O・ナビゲーション） |

---

## 修正する既存ファイル

| ファイル | 変更内容 |
|---------|---------|
| `src/presentation/components/BuilderForm.tsx` | `onEdit?: (json: string) => void` prop 追加、JSON 入力後に「編集する」ボタン表示 |
| `src/routes/builder.tsx` | `onEdit` ハンドラ追加（sessionStorage 書き込み + `/edit` 遷移）、mountで `shiori:builder-draft` から初期値読み込み |
| `src/routes/s/$key.tsx` | ロック解除後に「このしおりを編集する」ボタン追加 |
| `src/styles.css` | 新規 CSS クラス追加（後述） |

---

## 編集モード切替

`/edit` ページはタブで **2つのモード** を切り替えられる:

| モード | 説明 |
|--------|------|
| **フォーム編集** | フィールドごとに入力、↑↓で並び替え（メインモード） |
| **JSON直接編集** | JSONを直接貼り付け・編集、適用ボタンでフォームに反映 |

タブ切替 UI:
```
[ フォームで編集 | JSONで編集 ]  ← タブ
```

**JSON編集 → フォーム編集** への遷移: `validateShioriData()` でチェック後、成功すれば `shiori` ステートを更新してフォームモードに切替
**フォーム編集 → JSON編集** への遷移: 現在の `shiori` ステートを `JSON.stringify` してテキストエリアに流し込む（ロスなし）

これにより:
- LLM が出力した JSON をそのまま貼り直して確認・修正できる
- 細かいフィールドはフォームで直感的に編集できる
- どちらのモードでも最終的に同じ `shiori` ステートに収束する

---

## コンポーネント階層

```
EditPage (routes/edit.tsx)
├── [state: Shiori | null, editMode: 'form' | 'json', validationErrors: string[]]
│
├── EditModeTab  ← モード切替タブ
│   ├── <button active="form"> フォームで編集
│   └── <button active="json"> JSONで編集
│
│── [editMode === 'json'] JsonEditPanel
│   ├── <textarea> JSON テキスト（現在のshioriをJSONで表示・編集可）
│   ├── バリデーションエラー表示
│   └── <button> このJSONを適用 → parseして shiori ステートを更新
│
├── [editMode === 'form'] EditPageHeader
│   ├── <input> title
│   ├── <input> destination
│   ├── <input type="datetime-local"> startDateTime
│   └── <input type="datetime-local"> endDateTime
│
├── [editMode === 'form'] [days.map] DayEditor
│   ├── ReorderControls (day レベル: ↑↓削除)
│   ├── <input> day.label
│   │
│   └── [items.map] ItemEditor
│       ├── ReorderControls (item レベル: ↑↓削除)
│       ├── <input> time (HH:mm)
│       ├── <input> title
│       ├── <textarea> description
│       ├── <input> place
│       └── <input> mapUrl (任意)
│
├── [editMode === 'form'] <button> 日を追加
│
├── AiEditPanel (<details> 折りたたみ、両モードで表示)
│   ├── <textarea> modificationRequest (ユーザーが修正内容を記述)
│   ├── <textarea readonly> 生成プロンプト
│   ├── <button> コピー
│   ├── <textarea> 修正JSON貼り付け
│   └── <button> 修正を適用
│
└── EditSummaryBar (position: sticky; bottom: 0)
    ├── バリデーションエラー件数バッジ
    ├── <button> プレビュー (ShioriView インライン表示切替)
    └── <button> しおりリンクを作成 → /builder
```

---

## State 管理

### EditPage のステート

```typescript
const [shiori, setShiori] = useState<Shiori | null>(null);
const [editMode, setEditMode] = useState<'form' | 'json'>('form');
const [jsonText, setJsonText] = useState('');        // JSON編集モード用テキスト
const [validationErrors, setValidationErrors] = useState<string[]>([]);
const [previewVisible, setPreviewVisible] = useState(false);
```

**モード切替ロジック:**

```typescript
// フォーム → JSON: shiori を文字列に変換してセット
function switchToJson() {
  if (shiori) setJsonText(JSON.stringify(shiori, null, 2));
  setEditMode('json');
}

// JSON → フォーム: パース・バリデーション後に shiori ステートを更新
function applyJson() {
  const result = parseJsonText(jsonText);
  if (!result.ok) { setValidationErrors([result.error]); return; }
  try {
    const validated = validateShioriData(result.value);
    setShiori(validated);
    setValidationErrors([]);
    setEditMode('form');
  } catch (e) {
    setValidationErrors(e instanceof DomainValidationError ? e.details : [String(e)]);
  }
}
```

### 純粋関数による immutable 更新 (`editShiori.ts`)

```typescript
// すべて新しい Shiori オブジェクトを返す
export function updateHeader(s: Shiori, patch: Partial<Pick<Shiori, 'title'|'destination'|'startDateTime'|'endDateTime'>>): Shiori
export function updateDayLabel(s: Shiori, dayIndex: number, label: string): Shiori
export function updateItem(s: Shiori, dayIndex: number, itemIndex: number, patch: Partial<ShioriItem>): Shiori
export function addItem(s: Shiori, dayIndex: number): Shiori
export function removeItem(s: Shiori, dayIndex: number, itemIndex: number): Shiori
export function moveItemUp(s: Shiori, dayIndex: number, itemIndex: number): Shiori
export function moveItemDown(s: Shiori, dayIndex: number, itemIndex: number): Shiori
export function addDay(s: Shiori): Shiori
export function removeDay(s: Shiori, dayIndex: number): Shiori
export function moveDayUp(s: Shiori, dayIndex: number): Shiori
export function moveDayDown(s: Shiori, dayIndex: number): Shiori
```

使用例（EditPage 内）:
```typescript
setShiori(prev => moveItemUp(prev!, dayIndex, itemIndex));
```

### 自動ドラフト保存

```typescript
useEffect(() => {
  if (shiori) sessionStorage.setItem('shiori:edit-draft', JSON.stringify(shiori));
}, [shiori]);
```

---

## ルート間データ連携 (sessionStorage)

| キー | 書き込み元 | 読み取り先 |
|-----|-----------|-----------|
| `shiori:edit-draft` | `/builder` の「編集する」ボタン | `/edit` の mount 時 |
| `shiori:edit-draft` | `/s/$key` の「編集する」ボタン | `/edit` の mount 時 |
| `shiori:edit-draft` | `/edit` の自動保存 | `/edit` の mount 時（ブラウザ戻り時継続） |
| `shiori:builder-draft` | `/edit` の「しおりリンクを作成」ボタン | `/builder` の mount 時 |

URL パラメータは使用しない（JSON が数 KB になり URL が汚れるため）。`sessionStorage` はタブ終了時に破棄されるため、プレーンテキストの一時保管として許容範囲（ドメインルール: メモリ保持のみ = session scoped も対応）。

---

## AI 編集フロー (`generateEditPrompt.ts`)

```typescript
export interface EditPromptInput {
  currentShiori: Shiori;
  modificationRequest: string;  // 空文字も許容
}
export function generateEditPromptUseCase(input: EditPromptInput): string
```

プロンプト構造:
1. ロール宣言（旅行しおりデータ編集エキスパート）
2. 修正内容（modificationRequest or "全体を見直して改善してください"）
3. 現在の JSON（`JSON.stringify(currentShiori, null, 2)` を ```json ブロックで）
4. 出力ルール（`generatePrompt.ts` と同一の strict JSON ルールを再掲）

ユーザーフロー:
1. AiEditPanel で修正内容テキストを入力
2. 「プロンプトを生成」→ `<textarea readonly>` に表示
3. コピーして外部 LLM に貼り付け
4. LLM の返した JSON を貼り付けエリアに入力
5. 「修正を適用」→ `validateShioriData()` で検証 → 成功なら `shiori` ステートを置換、失敗ならエラー表示

---

## バリデーション戦略

| タイミング | 対象 | 表示場所 |
|----------|------|---------|
| フィールド blur 時 | HH:mm フォーマットのみ | `<input>` 直下の `<p class="error-message">` |
| 「修正を適用」時 | `validateShioriData()` 全体 | AiEditPanel 内エラーリスト |
| 「しおりリンクを作成」時 | `validateShioriData()` 全体 | EditSummaryBar 内、ナビゲーションをブロック |
| 並び替え中 | 実施しない（時刻順序チェックは保存時のみ） | — |

---

## 新規 CSS クラス (`styles.css` に追記)

```css
.edit-layout { display: flex; flex-direction: column; gap: 14px; }
.edit-day { border: 1px solid #dccca0; border-radius: 18px; padding: 14px; ... }
.edit-day.has-error { border-color: var(--danger); }
.edit-item { border: 1px solid var(--line); border-radius: 12px; padding: 12px; ... }
.reorder-controls { display: flex; gap: 6px; align-items: center; }
.icon-button { min-height: 44px; min-width: 44px; border: 1px solid var(--line); ... }
.icon-button.danger { border-color: var(--danger); color: var(--danger); }
.icon-button:disabled { opacity: 0.35; cursor: not-allowed; }
.edit-summary-bar { position: sticky; bottom: 0; background: var(--panel); ... }
.add-row { display: flex; justify-content: center; padding: 4px 0; }
```

モバイルファースト: すべて 320px で崩れないこと。デスクトップ（768px+）で `.edit-item` を2カラムグリッドに。

---

## 並び替え UI

**Up/Down ボタン方式**（ライブラリ追加なし）

- `ReorderControls` コンポーネントに `onMoveUp / onMoveDown / onRemove` コールバックと `isFirst / isLast` フラグ
- ボタンの最小タップエリア 44px（モバイル操作性確保）
- ↑ は `isFirst=true` のとき `disabled`、↓ は `isLast=true` のとき `disabled`
- 将来 `@dnd-kit/core` + `@dnd-kit/sortable` 追加時も up/down はフォールバックとして残す

---

## 実装順序（TDD）

1. **`editShiori.ts` のテストを先に書く** (`src/test/editShiori.test.ts`)
2. `editShiori.ts` を実装してテストをパスさせる
3. **`generateEditPrompt.ts` のテストを書く**
4. `generateEditPrompt.ts` を実装
5. プレゼンテーションコンポーネントを下から実装: `ReorderControls` → `ItemEditor` → `DayEditor` → `EditPageHeader` → `AiEditPanel` → `EditSummaryBar`
6. `edit.tsx` ルートで全コンポーネントを組み合わせ
7. `BuilderForm.tsx` に `onEdit` prop 追加
8. `builder.tsx` に `onEdit` ハンドラ + mount 時 draft 読み込み追加
9. `s/$key.tsx` に「編集する」ボタン追加
10. `styles.css` に CSS 追加

---

## 検証方法

```bash
# ユニットテスト実行
npm run test

# 開発サーバー起動
npm run dev

# 動作確認フロー 1: builder → edit → builder
1. /builder にアクセス
2. 有効な Shiori JSON を貼り付け
3. 「編集する」ボタンをクリック → /edit に遷移
4. タイトル・スポット編集、↑↓ で並び替え
5. 「しおりリンクを作成」→ /builder に戻り JSON が反映されていることを確認
6. パスワード入力してリンク生成

# 動作確認フロー 2: shared view → edit
1. 既存の共有リンク /s/{key} を開く
2. パスワード解除
3. 「このしおりを編集する」をクリック → /edit に遷移
4. 編集できることを確認

# 動作確認フロー 3: AI 編集
1. /edit で「AI編集」パネルを開く
2. 修正内容を入力
3. プロンプトをコピー（実際の LLM に貼り付けは省略可）
4. 修正済み JSON をテキストエリアに貼り付け
5. 「修正を適用」→ エディタが更新されることを確認
6. 不正な JSON を貼り付け → エラーメッセージが表示されることを確認

# モバイル確認
ブラウザ DevTools で 375px 幅に設定し、全操作が横スクロールなく使えることを確認
```

---

## 再利用する既存実装

| 既存関数/クラス | ファイル | 用途 |
|--------------|---------|------|
| `validateShioriData()` | `src/domain/services/ShioriValidationService.ts` | AI JSON 適用時・保存時の検証 |
| `parseJsonText()` | `src/infrastructure/parsing/jsonParser.ts` | AI JSON のパース |
| `ShioriView` | `src/presentation/components/ShioriView.tsx` (**design-templates**) | インラインプレビュー（レイアウトプリセット対応） |
| `DesignSpec`, `validateDesignSpec()` | `src/domain/entities/DesignSpec.ts`, `DesignSpecValidationService.ts` (**design-templates**) | デザイン編集セクション |
| `generatePromptUseCase` ルール | `src/application/usecases/generatePrompt.ts` | AI 編集プロンプトの出力ルール参照 |
| `Shiori`, `ShioriDay`, `ShioriItem` 型 | `src/domain/entities/Shiori.ts` | 型定義 |
| `.panel`, `.form-stack`, `.passphrase-details` など | `src/styles.css` | CSS 再利用 |
| CSS変数 `--bg`, `--panel`, `--text`, `--accent`, `--shiori-radius` | `src/styles.css` (**design-templates**) | 編集画面スタイルに適用 |

---

## feat/design-templates ブランチとの統合ポイント

`feat/design-templates` には以下が追加済み。編集画面実装時に活用する:

| 要素 | 内容 |
|------|------|
| `DesignSpec` エンティティ | `layout.preset` (timeline/ticket/metro/cards/serpentine), `palette`, `motif` |
| `ShioriView.tsx` | `DesignSpec` に応じてレイアウトコンポーネントを切り替えるルーターコンポーネント → プレビューに使用 |
| CSS変数 | `--shiori-radius`, `--accent`, `--bg` など → 編集画面の `.edit-day`, `.edit-item` に適用 |
| `<details>` パターン | BuilderForm の passphrase-details が既にある → AiEditPanel も同パターンで実装 |

### 編集画面への DesignSpec 編集機能の追加

Shiori コンテンツ編集に加え、デザインテンプレート選択・カスタマイズセクションを追加する:

```
EditPage
├── EditPageHeader (title, destination, dates)
├── DayEditor × days.length
├── AiEditPanel
├── DesignEditor  ← 追加 (collapsible <details>)
│   ├── preset セレクター (timeline/ticket/metro/cards/serpentine)
│   ├── cornerRadius スライダー
│   └── (将来拡張: パレットカスタマイズ)
└── EditSummaryBar
```

`editShiori.ts` に `updateDesign(s: Shiori & { design?: DesignSpec }, patch: Partial<DesignSpec>): Shiori` を追加。
