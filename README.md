# 旅行しおりアプリ

TanStack Start（SSR）で作成した、旅行しおり生成アプリです。  
外部LLMで作ったJSONを貼り付け、サーバAPIで暗号化した共有URLを発行できます。

## 機能

- 使い方画面
- プロンプト生成画面（旅行条件メモのテンプレート入力）
- 文章からしおり作成画面（JSON検証 -> 暗号化URL発行）
- しおり表示画面（`/s/<key>` でパスワード復号して時系列表示）
- しおりデザイン（構造テンプレ + パラメータ）: Shiori JSON の `design` により表示レイアウトを切り替え（`timeline/ticket/metro/cards`）
- マイリンク画面（`/links` で共有リンクを一覧管理）

## 技術スタック

- TanStack Start（SSR + File-based routing）
- React + TypeScript
- Server API: `/api/encrypt`, `/api/decrypt`, `/api/links/save`, `/api/links/load`
- 暗号化: PBKDF2 (SHA-256, 100000) + AES-256-GCM
- ペイロード符号化: base2048（新規発行リンク）
- 共有データ保存: Cloudflare KV（ローカルはメモリフォールバック）
- テスト: Vitest + Testing Library

## アーキテクチャ

- Clean Architecture + DDD
- 依存方向: `presentation -> application -> domain`
- `infrastructure` が外部I/O（API、暗号、ストレージ）を担当

## ディレクトリ概要

```text
src/
  routes/                # 画面ルート + APIルート
  presentation/          # UIコンポーネント
  application/           # ユースケース + compactマッパー
  domain/                # エンティティ/値オブジェクト/ドメイン検証
  infrastructure/        # 暗号/JSONパース/HTTPクライアント/ストレージ
```

## 前提環境

- Docker Desktop
- Docker Compose v2+

補足: `package.json` では Node `>=22.12.0` を要求しています。ローカルNode実行時はこの条件を満たしてください。

## クイックスタート（推奨: Docker Compose）

### 1) 依存インストール（コンテナ内）

```bash
docker compose run --rm app npm install
```

### 2) 開発サーバ起動

```bash
docker compose up --build
```

- URL: [http://localhost:3000](http://localhost:3000)

### 3) テスト

```bash
docker compose run --rm app npm run test
```

### 4) ビルド

```bash
docker compose run --rm app npm run build
```

### 5) 停止

```bash
docker compose down
```

## ローカル検証フロー

1. `/prompt` で旅行条件メモ（テンプレート付き）を編集してプロンプト生成
2. 外部LLM（ChatGPT等）でJSON生成
3. `/builder` にJSONとパスワードを貼り付けて共有URLを生成
4. 生成URL（`/s/<key>`）を開き、パスワード入力でしおりを表示
5. `/builder` で合言葉を設定して作成した場合、`/links` に合言葉を入力して一覧表示

### `/prompt` 入力例（旅行条件メモ）

```text
- 行き先: 金沢、富山
- 開始日時: 2026-03-20T09:00
- 終了日時: 2026-03-21T18:00
- 人数・同行者: 大人2名
- 移動手段: 電車中心
- 予算: 1人4万円以内
- デザイン希望: 黄色で電車みたい
- 絶対に行きたい場所: 金沢21世紀美術館、ひがし茶屋街
- 食事の希望: 海鮮、郷土料理、甘味
- 体験の希望: 金箔貼り体験
- 避けたいこと: 長時間の徒歩移動
- 補足メモ: 雨でも楽しめる案を含めてほしい
```

### 検証用サンプルJSON

```json
{
  "title": "箱根1泊2日しおり",
  "destination": "箱根",
  "startDateTime": "2026-03-20T09:00",
  "endDateTime": "2026-03-21T18:00",
  "design": {
    "v": 1,
    "layout": { "preset": "ticket", "density": "comfortable", "cornerRadius": 18 },
    "motif": { "kind": "train", "heroEmojis": ["🚃", "🗺️"] }
  },
  "days": [
    {
      "date": "2026-03-20",
      "label": "DAY 1",
      "items": [
        {
          "time": "09:00",
          "title": "新宿駅集合",
          "description": "ロマンスカーで移動",
          "place": "新宿駅"
        },
        {
          "time": "11:30",
          "title": "箱根湯本到着",
          "description": "駅周辺を散策",
          "place": "箱根湯本駅"
        }
      ]
    },
    {
      "date": "2026-03-21",
      "label": "DAY 2",
      "items": [
        {
          "time": "09:00",
          "title": "ホテル出発",
          "description": "芦ノ湖方面へ移動",
          "place": "元箱根港"
        }
      ]
    }
  ]
}
```

### デザイン（`design`）でできること

`design` は「任意CSS」ではなく、**テンプレ（preset）+ パラメータ**で見た目を変える仕組みです。

現時点で反映される項目:

- `design.layout.preset`: `timeline`（標準）/ `ticket`（切符風）/ `metro`（路線図風）/ `cards`（カード風）
- `design.layout.density`: `compact` / `comfortable`
- `design.layout.cornerRadius`: 0〜28
- `design.palette`: `bg`/`panel`/`text`/`muted`/`line`/`accent`/`accentDark` の hex color（`#RGB` or `#RRGGBB`）
- `design.motif.heroEmojis`: 最大3つ（ヘッダーの装飾）

補足:

- 「時刻の位置を自由にずらす」「線をぐにゃぐにゃにする」などの構造変更は、いまは `preset` で切り替える方式です（任意のレイアウト指定は未対応）。
- `design.motif.kind` や `typography` / `pathStyle` のような追加フィールドを入れても、現時点では表示に反映されません（将来拡張用）。

## API仕様

共有リンクは `key` 参照方式です。暗号ペイロード本体は Cloudflare KV（またはローカル開発時のメモリストア）に保存し、URLには含めません。  
新規保存時の暗号形式は `v6(compact + brotli + binary-in-KV)` です。

### フォーマット概要

- 新規生成（encrypt）: `v6` バイナリ（`0x06 | salt(16) | iv(12) | ciphertext`）をKVにバイナリ保存（URLには含めない）
- 内部平文: Shiori JSONを compact 形式（`cv:1`）へ変換してから暗号化
- 圧縮: 暗号化前に brotli 圧縮（KV保存量削減のため）
- 復号（decrypt）時はKVから暗号ペイロードを取得して復号
- 暗号モジュール単体では `v3/v4/v5` の後方互換復号を維持（`v1/v2` は非対応）

### POST `/api/encrypt`

request:

```json
{
  "plainText": "{...Shiori JSON...}",
  "password": "secret"
}
```

response:

```json
{
  "key": "abc123",
  "passhash": {
    "v": 1,
    "salt": "...",
    "hash": "...",
    "iter": 100000
  },
  "expiresAt": 1767225600000
}
```

### POST `/api/decrypt`

request:

```json
{
  "key": "abc123",
  "password": "secret"
}
```

response:

```json
{
  "plainText": "{...Shiori JSON...}",
  "expiresAt": 1767225600000
}
```

補足:
- `expiresAt` は epoch milliseconds です（`number`）。保存メタデータが無い場合（旧共有データなど）は `null` になります。
- `/builder` と `/s/<key>` は `expiresAt` が取得できる場合に「有効期限 / 残り時間」を表示します。

### POST `/api/links/save`

request:

```json
{
  "passphraseHash": "base64url(sha256(passphrase))",
  "links": [
    {
      "key": "abc123",
      "title": "箱根1泊2日しおり",
      "destination": "箱根",
      "createdAt": 1700000000000,
      "expiresAt": 1767225600000
    }
  ]
}
```

response:

```json
{
  "ok": true
}
```

### POST `/api/links/load`

request:

```json
{
  "passphraseHash": "base64url(sha256(passphrase))"
}
```

response:

```json
{
  "links": []
}
```

### 運用制限（デフォルト）

- 作成API停止フラグ: `DISABLE_SHARE_CREATE`
- plainText上限: `MAX_PLAINTEXT_BYTES`（既定 32768 bytes）
- 保存TTL: `SHARE_TTL_SECONDS`（既定 2592000 = 30日）
- 作成レート制限:
  - `RATE_LIMIT_CREATE_PER_MIN`（既定 10）
  - `RATE_LIMIT_CREATE_PER_DAY`（既定 200）
- 閲覧レート制限:
  - `RATE_LIMIT_READ_PER_MIN`（既定 60）
- links API レート制限:
  - `RATE_LIMIT_LINKS_PER_MIN`（既定 20）
- マイリンク保存TTL: `LINKS_TTL_SECONDS`（既定 2592000 = 30日、アクセスで延長）
- マイリンク上限:
  - `MAX_LINKS_COUNT`（既定 200）
  - `MAX_LINKS_PLAINTEXT_BYTES`（既定 32768 bytes）

## セキュリティ方針

- パスワード平文は保存しない
- `localStorage` には `shiori:passhash:<key>` 形式でハッシュメタデータのみ保存
- `sessionStorage` には `passphraseHash` のみ一時保存（合言葉の平文は保存しない）
- 外部LLM出力は不正入力として検証してから処理

## モバイル要件

- 320px以上で横スクロールなし
- タップ領域は最小44x44px
- しおり画面はスマホ幅で1カラム時系列表示
- 推奨確認幅: 375x812 / 390x844 / 430x932

## 既知の制約

- 共有データはKV保存のため、URLが直接長くなる問題は解消しましたが、リンクはTTL（既定30日）で期限切れになります。
- マイリンクはKVキーが `SHA-256(合言葉)` 由来のため、合言葉が違う場合は「0件」として表示されます（不一致を確定できません）。
- `mapUrl` は compact 変換でも保持されるため、復号後JSONでも利用できます。
- `v1/v2` で生成済みの旧共有リンクは復号できません。再生成が必要です。
- MVP方針として、アプリ内で有料LLM APIは呼びません（外部LLMを手動利用）。

## デプロイ（Cloudflare Workers）

`wrangler.toml` を利用します。

- 事前準備（env管理）:
  1. `cp .env.example .env`
  2. `.env` に `CLOUDFLARE_API_TOKEN` を設定
- build command: `docker compose run --rm app npm run build`
- worker entrypoint: `@tanstack/react-start/server-entry`（`wrangler.toml`）
- KV binding: `SHARE_KV`
- deploy（Docker経由）: `docker compose run --rm app npm run deploy`
