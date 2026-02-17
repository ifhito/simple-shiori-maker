# Shiori Design Templates Plan (Layout Preset + Params)

## Context
現状の Shiori は、LLM で「旅程 JSON」を生成し、それを `/builder` で暗号化して `/s/:key` で閲覧する MVP になっている。

差別化のために、色だけでなく **表示構造（レイアウト）** も変えられる「デザイン」機能を追加したい。

ただし MVP 方針として:
- アプリ内で LLM API は呼ばない（外部 LLM に貼り付け運用）
- 外部 LLM 出力は不正入力として扱う（検証必須）
- 任意 CSS / 任意 HTML は受け取らない（安全性・品質・モバイル保証のため）

このため、**構造テンプレ（preset） + パラメータ（params）** を JSON として受け取り、アプリ側の React コンポーネントで安全にレンダリングする。

## Goal / Non-Goal
### Goal
- しおり JSON に `design` を追加し、共有リンク閲覧 `/s/:key` の見た目を **テンプレ単位** で切替できる
- LLM に「旅程 + design」を考えてもらえる（手動コピペ運用）
- 不正な design はハードエラー（黙って無視しない）
- モバイルファーストで崩れないこと

### Non-Goal (MVP)
- 任意 CSS 文字列の適用
- 任意 HTML 断片の適用
- 外部画像 URL/フォント URL の注入（しおり表示内への画像反映）
- Builder のプレビュー反映（まずは閲覧ページのみ）

## High Level Approach
- **Domain**: `DesignSpec` を定義し、allowlist + 範囲検証を行う
- **Presentation**: `layout.preset` に応じてレンダリングコンポーネントを切替
- **Style**: CSS 変数は局所スコープで適用（ページ全体は変えない）
- **Prompt**: `generatePromptUseCase` の schemaExample と出力ルールに `design` 指示を追加

## JSON / Public Interface
### Add `design?: DesignSpec` to Shiori JSON
`src/domain/entities/Shiori.ts` の `Shiori` に `design?: DesignSpec` を追加する。

#### DesignSpec v1 (proposed)
```json
{
  "v": 1,
  "layout": {
    "preset": "ticket",
    "density": "comfortable",
    "cornerRadius": 18,
    "showDaySeparators": true
  },
  "palette": {
    "bg": "#fff7d9",
    "panel": "#fffdf7",
    "text": "#2e2d2a",
    "muted": "#6f6a5f",
    "line": "#d5c99c",
    "accent": "#f0c300",
    "accentDark": "#9f7b11"
  },
  "motif": {
    "kind": "train",
    "heroEmojis": ["🚃", "🗺️"]
  }
}
```

### Layout Presets (MVP)
- `ticket`: 切符/乗車券風（点線、スタンプ、駅名ブロック）
- `metro`: 路線図風（縦ライン + 駅ノードで items を表示）
- `cards`: スクラップ/付箋カード風（日ごとカードで items を表示）
- `timeline`: 現状互換（既存 `ShioriTimeline` 相当）
- `serpentine`: 蛇行道路風（後述）✅ 実装済み

## Validation Rules (Domain)
### Allowlist & Ranges
- `v`: 1 固定
- `layout.preset`: allowlist のみ
- `layout.density`: `compact | comfortable`
- `layout.cornerRadius`: 0..28（例。最終値は調整）
- `layout.showDaySeparators`: boolean

### Palette
- 受け入れるキー（任意）: `bg`, `panel`, `text`, `muted`, `line`, `accent`, `accentDark`
- 値は hex のみ: `#RGB` または `#RRGGBB`
- 未指定は既定（`src/styles.css` の現行テーマ）にフォールバック

### Motif
- `motif.kind`: 自由文字列（≤ 32 文字）✅ 実装済み（当初 allowlist 予定だったが自由入力に変更）
- `heroEmojis`: 0..3 個、各要素は短い文字列（目安: 長さ 1..4）に制限

### Hard-fail
LLM 出力は untrusted なので、`design` が存在する場合は `validateDesignSpec` で落とす。
（黙って無視すると「ユーザの意図した差別化」が失われるため）

## Rendering Design (Presentation)
### Scope
- MVP は `/s/:key` の閲覧ページのみ適用
- `:root` の全体テーマは維持
- しおりの `<article>` など限定スコープに CSS 変数を注入して適用

### Component Structure ✅ 実装済み
1. `ShioriView` — `layout.preset` により各テンプレコンポーネントへルーティング
2. `TicketLayout`, `MetroLayout`, `CardsLayout`, `SerpentineLayout` + `ShioriTimeline`（timeline）
   - いずれも入力は `Shiori`（domain）のみ
   - mapUrl は `mapLink.ts` 共通ユーティリティに集約

### CSS Strategy ✅ 実装済み
- `resolveDesignCssVars(design)` で CSS 変数（`--accent`, `--bg` 等）を style 属性に注入
- 各テンプレ用クラス: `.shiori-layout-ticket` / `.shiori-layout-metro` / `.shiori-layout-cards` / `.shiori-layout-serpentine`
- モバイルファーストを維持（320px 幅で横スクロール禁止）

### serpentine レイアウト詳細 ✅ 実装済み（コミット `56387db`）
旅程の「道筋」を視覚的に表現する蛇行道路風レイアウト。

**実装方針**: CSSのみのアーク接続ではなく SVG cubic-bezier パスで連続するS字曲線を描画。
- `SerpentineLayout.tsx`: アイテムを日付をまたいでグローバルにフラット化し y 座標を計算
- SVG `<path>` で全ノード間を `C prevX midY, x midY, x y` のベジェ曲線で接続
- `vectorEffect="non-scaling-stroke"` + `preserveAspectRatio="none"` で線幅を画面空間で一定に保つ
- ノード: 各アイテムに1つ、左右交互（35% / 65%）に配置、パス上に座る
- ラベル: ノードの**外側**（曲線の外に向かう側）に配置してパスと重ならないようにする
- 日区切り: 各 day の先頭に 52px のヘッダー行（バッジ + 日付 + 下線）を挿入し、SVG y 計算にも反映
- レスポンシブ: 400px 以下で SVG を非表示にし metro 風の縦並びにフォールバック

## Prompt Generation Update
`generatePromptUseCase` の出力ルールに以下を追加する:
- `design` を追加で出力する（preset は allowlist から選ぶ）
- `layout` パラメータは範囲内の値にする（cornerRadius など）
- `palette` は読みやすさ最優先（コントラスト不足禁止）
- 参照画像がある場合は「添付画像を参考にして構造も含めて design を決める」旨を明記する

`schemaExample` に `design` を含める（ただし payload サイズの都合で mapUrl は例から省略のまま）

### UX: 参照画像は「アプリ内で処理しない」
ユーザ要望として、アプリ内では画像解析もアップロードも行わない。

- `/prompt` 画面にチェックボックス:
  - 文言例: `デザイン参照画像をLLMに添付している（プロンプトに明記する）`
- チェック ON のときだけ、生成プロンプトに追記:
  - `デザイン参照画像を添付しています。色だけでなく、レイアウト（構造）や雰囲気もこの画像を参考にしてください。`
- ユーザは外部 LLM 側で画像を添付して実行する（Shiori 側に画像は渡らない）

## TDD / Test Plan ✅ 全テスト通過（88 tests / 19 files）
### Domain tests
- `DesignSpecValidationService.test.ts`
  - 正常: ticket/metro/cards/timeline/**serpentine** ✅
  - 異常: preset allowlist 外、hex 不正、cornerRadius 範囲外、heroEmojis 多すぎ

### Shiori validation tests
- `ShioriValidationService.test.ts`
  - `design` ありで通る
  - `design` 不正で落ちる

### Rendering tests ✅
- 各テンプレが `day.label` / `item.title` を表示する
- map リンクが生成される（place からの検索 URL or mapUrl 直指定）
- `ShioriView.test.tsx`: serpentine プリセットで `data-testid="shiori-layout-serpentine"` がレンダリングされること

## Implementation Steps ✅ 完了

### Phase 1: Domain ✅
1. ✅ `src/domain/entities/DesignSpec.ts` — `LayoutPreset` ユニオン（timeline/ticket/metro/cards/serpentine）
2. ✅ `src/domain/services/DesignSpecValidationService.ts` — allowlist + 範囲検証
3. ✅ `src/domain/entities/Shiori.ts` — `design?: DesignSpec` 追加
4. ✅ `src/domain/services/ShioriValidationService.ts` — design 検証を統合

### Phase 2: Presentation ✅
5. ✅ `src/presentation/components/ShioriView.tsx` — preset ルーティング
6. ✅ `src/presentation/components/shioriLayouts/` — TicketLayout, MetroLayout, CardsLayout, SerpentineLayout
7. ✅ `src/routes/s/$key.tsx` — ShioriView + CSS 変数注入
8. ✅ `src/styles.css` — 各 preset 用 CSS + serpentine SVG パスブロック

### Phase 3: Prompt ✅
9. ✅ `src/presentation/components/PromptForm.tsx` — デザイン説明 UI（serpentine 含む）
10. ✅ `src/application/usecases/generatePrompt.ts` — preset 列挙 + ルール追加
11. ✅ `src/application/usecases/generatePrompt.test.ts` — serpentine が含まれることをアサート

### Phase 4: Docs ✅
12. ✅ `SERPENTINE_PLAN.md` — serpentine 追加計画（実装前に作成）
13. ✅ `DESIGN_TEMPLATES_PLAN.md`（本ファイル）— 実装結果を追記

## 実装済みコミット一覧（feat/design-templates ブランチ）

| コミット | 内容 |
|---------|------|
| `397e0bf` | feat(ui): add shiori layout presets and theming |
| `51d2f2b` | fix(design): allow free-form motif kind |
| `b83cbba` | docs(prompt): explain design presets in UI |
| `71bd1ee` | feat(prompt): explain design options |
| `56387db` | **feat(layout): add serpentine (winding road) preset** |

## 既知の設計変更（計画からの差分）

| 項目 | 計画時 | 実装結果 |
|------|--------|----------|
| `motif.kind` | allowlist（train/nature/…） | 自由文字列 ≤32 文字に変更（LLM の創造性を活かすため） |
| preset 一覧 | ticket/metro/cards/timeline | + `serpentine` を追加 |
| serpentine 接続 | CSS border-radius アーク | **SVG cubic-bezier パス**（連続性・滑らかさのため） |
| CSS 変数命名 | `--shiori-accent` 等 | `--accent`, `--line` 等の短縮形（既存テーマに合わせる） |
