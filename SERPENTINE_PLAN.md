# 蛇行道路風レイアウト（serpentine）追加計画

## Context
現在4つのレイアウトプリセット（timeline, ticket, metro, cards）があるが、旅行しおりの「旅の道筋」を視覚的に表現する蛇行する道デザインが欲しい。ユーザー提供の画像（白いS字カーブの道）を参考に、新しい `serpentine` プリセットを追加する。

## 変更ファイル一覧

| # | ファイル | 変更種別 |
|---|---------|---------|
| 1 | `src/domain/entities/DesignSpec.ts` | 修正: `LayoutPreset` に `'serpentine'` 追加 |
| 2 | `src/domain/services/DesignSpecValidationService.ts` | 修正: `presetAllow` 配列に追加 |
| 3 | `src/domain/services/DesignSpecValidationService.test.ts` | 修正: テスト追加 |
| 4 | `src/application/usecases/generatePrompt.ts` | 修正: プロンプト文中2箇所に serpentine 追加 |
| 5 | `src/application/usecases/generatePrompt.test.ts` | 修正: serpentine がプロンプトに含まれるか確認 |
| 6 | `src/presentation/components/ShioriView.tsx` | 修正: import + resolvePreset + JSX分岐 |
| 7 | `src/presentation/components/ShioriView.test.tsx` | 修正: serpentine レンダリングテスト追加 |
| 8 | `src/presentation/components/shioriLayouts/SerpentineLayout.tsx` | **新規** |
| 9 | `src/styles.css` | 修正: serpentine CSS + density + レスポンシブ |
| 10 | `src/presentation/components/PromptForm.tsx` | 修正: デザイン説明に serpentine 追加 |

## ビジュアルデザイン方針

CSSのみ（SVGなし）で蛇行道路を表現:
- 3カラム CSS Grid: `[コンテンツ左] [中央ノード] [コンテンツ右]`
- 奇数アイテムは左側、偶数アイテムは右側に配置（`data-side` 属性で制御）
- 中央の道ノード（丸い駅マーク）を `border + border-radius` で描画
- ノード間をS字カーブコネクタで接続: 2つの quarter-ellipse arc で構成
- `serpentine-road` 要素が全3カラムにまたがり、S字コネクタを `::before` / `::after` で描画
- 320px以下の狭い画面では単一カラムにフォールバック（metro風の縦並び）

## 実装手順（TDD順）

### Step 1: Domain層 — 型 + バリデーション + テスト
- `DesignSpec.ts`: `LayoutPreset` ユニオンに `'serpentine'` 追加
- `DesignSpecValidationService.ts` L96: `presetAllow` に `'serpentine'` 追加
- `DesignSpecValidationService.test.ts`: serpentine が受理されるテスト追加

### Step 2: Application層 — プロンプト更新
- `generatePrompt.ts` L61: `serpentine（蛇行道路風）` をプリセット説明に追加
- `generatePrompt.ts` L76: ルール8のプリセット列挙に追加
- `generatePrompt.test.ts`: serpentine がプロンプトに含まれることをアサート

### Step 3: Presentation層 — コンポーネント + ルーティング
- `SerpentineLayout.tsx` を新規作成（MetroLayout.tsx と同パターン）
  - `data-side="left"|"right"` で交互配置
  - `serpentine-road`, `serpentine-node` 要素で道と駅を表現
  - `data-testid="shiori-layout-serpentine"` をルートに設定
- `ShioriView.tsx`: import追加 + `resolvePreset` に serpentine 追加 + JSX分岐追加
- `ShioriView.test.tsx`: serpentine プリセットテスト追加

### Step 4: CSS
- `styles.css` density compact セクションに `.serpentine-wrapper` 追加
- serpentine 専用CSSブロック追加（Cards layout の後）
  - `.serpentine-wrapper`, `.serpentine-day`, `.serpentine-day-header`, `.serpentine-day-badge`
  - `.serpentine-list`, `.serpentine-item`（3カラムgrid）
  - `.serpentine-node`（中央の道ノード）, `.serpentine-road`（S字コネクタ）
  - `[data-side="left"]` / `[data-side="right"]` でコンテンツ配置切替
  - S字カーブ: border + border-radius で quarter-ellipse arc を2つ組み合わせ
  - `@media (max-width: 400px)`: 狭い画面用フォールバック（単一カラム化）

### Step 5: UI ドキュメント
- `PromptForm.tsx` L53: プリセット一覧に `serpentine`（蛇行道路風）追加

## 検証方法
1. `docker compose run --rm app npm test` で全テスト通過確認
2. ブラウザで `preset: "serpentine"` を含むしおりJSONを貼り付け、表示確認
3. Chrome DevTools で 320px 幅にリサイズし、横スクロールが発生しないこと確認
4. アクセントカラーが道の曲線コネクタとノードに反映されること確認
