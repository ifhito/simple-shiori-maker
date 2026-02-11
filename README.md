# 旅行しおりアプリ

TanStack Start（SSR）で作成した、旅行しおり生成アプリです。  
外部LLMで作ったJSONを貼り付け、サーバAPIで暗号化した共有URLを発行できます。

## 機能

- 使い方画面
- プロンプト生成画面（旅行条件メモのテンプレート入力）
- 文章からしおり作成画面（JSON検証 -> 暗号化URL発行）
- しおり表示画面（パスワード復号して時系列表示）

## 技術スタック

- TanStack Start（SSR + File-based routing）
- React + TypeScript
- Server API: `/api/encrypt`, `/api/decrypt`
- 暗号化: PBKDF2 (SHA-256, 120000) + AES-256-GCM
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
  application/           # ユースケース
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
4. 生成URLを開き、パスワード入力でしおりを表示

### `/prompt` 入力例（旅行条件メモ）

```text
- 行き先: 金沢、富山
- 開始日時: 2026-03-20T09:00
- 終了日時: 2026-03-21T18:00
- 人数・同行者: 大人2名
- 移動手段: 電車中心
- 予算: 1人4万円以内
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
  "days": [
    {
      "date": "2026-03-20",
      "label": "DAY 1",
      "items": [
        {
          "time": "09:00",
          "title": "新宿駅集合",
          "description": "ロマンスカーで移動",
          "place": "新宿駅",
          "mapUrl": "https://www.google.com/maps/search/?api=1&query=%E6%96%B0%E5%AE%BF%E9%A7%85"
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

## API仕様

### POST `/api/encrypt`

request:

```json
{
  "plainText": "{...Shiori JSON...}",
  "password": "secret",
  "id": "optional"
}
```

response:

```json
{
  "id": "abc123",
  "d": "base64url_payload",
  "passhash": {
    "v": 1,
    "salt": "...",
    "hash": "...",
    "iter": 120000
  }
}
```

### POST `/api/decrypt`

request:

```json
{
  "d": "base64url_payload",
  "password": "secret"
}
```

response:

```json
{
  "plainText": "{...Shiori JSON...}"
}
```

## セキュリティ方針

- パスワード平文は保存しない
- `localStorage` には `shiori:passhash:<id>` 形式でハッシュメタデータのみ保存
- 外部LLM出力は不正入力として検証してから処理

## モバイル要件

- 320px以上で横スクロールなし
- タップ領域は最小44x44px
- しおり画面はスマホ幅で1カラム時系列表示
- 推奨確認幅: 375x812 / 390x844 / 430x932

## 既知の制約

- 共有データをURLクエリに含めるため、旅程が長すぎるとURL長制限に到達する可能性があります。
- MVP方針として、アプリ内で有料LLM APIは呼びません（外部LLMを手動利用）。

## デプロイ（Netlify）

`netlify.toml` を利用します。

- build command: `NITRO_PRESET=netlify npm run build`
- publish directory: `.output/public`
