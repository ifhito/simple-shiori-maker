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
- `motif.kind`: allowlist（例: `train | nature | beach | city | food | minimal`）
- `heroEmojis`: 0..3 個、各要素は短い文字列（目安: 長さ 1..4）に制限

### Hard-fail
LLM 出力は untrusted なので、`design` が存在する場合は `validateDesignSpec` で落とす。
（黙って無視すると「ユーザの意図した差別化」が失われるため）

## Rendering Design (Presentation)
### Scope
- MVP は `/s/:key` の閲覧ページのみ適用
- `:root` の全体テーマは維持
- しおりの `<article>` など限定スコープに CSS 変数を注入して適用

### Component Structure
1. `ShioriView` (new)
   - `layout.preset` により各テンプレコンポーネントへルーティング
2. `TicketLayout`, `MetroLayout`, `CardsLayout`, `TimelineLayout`
   - いずれも入力は `Shiori`（domain）+ `design?: DesignSpec`
   - mapUrl 表示などは共通ユーティリティに寄せる（表示構造だけ変える）

### CSS Strategy
- `designSpecToCssVars(design)` で CSS 変数（`--bg` 等）を style 属性に注入
- 各テンプレ用クラス: `.shiori-ticket`, `.shiori-metro`, `.shiori-cards`
- モバイルファーストを維持（320px 幅で横スクロール禁止）

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

## TDD / Test Plan
### Domain tests
- `DesignSpecValidationService.test.ts`
  - 正常: ticket/metro/cards/timeline
  - 異常: preset allowlist 外、hex 不正、cornerRadius 範囲外、heroEmojis 多すぎ

### Shiori validation tests
- `ShioriValidationService.test.ts`
  - `design` ありで通る
  - `design` 不正で落ちる

### Rendering tests (minimum)
- 各テンプレが `day.label` / `item.title` を表示する
- map リンクが生成される（place からの検索 URL or mapUrl 直指定）

## Implementation Steps (Decision-Complete)
### Phase 1: Domain
1. Add `src/domain/entities/DesignSpec.ts`
2. Add `src/domain/services/DesignSpecValidationService.ts`
3. Update `src/domain/entities/Shiori.ts` to include `design?: DesignSpec`
4. Update `src/domain/services/ShioriValidationService.ts` to validate `design` when present

### Phase 2: Presentation
5. Add `src/presentation/components/ShioriView.tsx` (routes preset)
6. Add layout components under `src/presentation/components/shioriLayouts/*`
7. Update `src/routes/s/$key.tsx` to render `ShioriView` and apply css vars
8. Update `src/styles.css` with template classes (mobile-first)

### Phase 3: Prompt
9. Update `src/presentation/components/PromptForm.tsx` template to include design preference
10. Update `src/application/usecases/generatePrompt.ts` to instruct and include schema example
11. Update `src/application/usecases/generatePrompt.test.ts` accordingly

### Phase 4: Docs
12. Update `README.md` and `PLAN.md` with:
   - DesignSpec overview
   - preset list
   - why not arbitrary CSS

## Security Notes
- 任意 CSS を受け取らないことで以下を回避:
  - 外部リソース読み込みによるトラッキング（`@import`, `url()`）
  - UI 改ざん（フィッシング的な誤誘導）
  - 表示崩壊・可読性低下の大量発生
  - 検証困難による QA コスト増
 

## Commit Plan (Suggested)
1. `feat(design): add DesignSpec domain + validation`
2. `feat(design): support design in shiori validation + prompt schema`
3. `feat(ui): add shiori layout presets and renderer`
4. `docs: document design presets`

## Local Notes (Current Working Tree)
- 現時点の作業ツリーに「design 関連のテスト差分」が入っている場合、上記 Phase 1 の一部に相当する。
- 実装開始前に差分の扱い（採用して続行 or 一旦 revert）を決め、コミットを正しく分割する。
