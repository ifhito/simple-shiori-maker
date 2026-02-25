import type { PromptInput } from '../dto/shiori';

const schemaExample = `{
  "title": "箱根1泊2日しおり",
  "destination": "箱根",
  "startDateTime": "2026-03-20T09:00",
  "endDateTime": "2026-03-21T18:00",
  "design": {
    "v": 1,
    "layout": { "preset": "ticket", "density": "comfortable", "cornerRadius": 18 },
    "palette": { "bg": "#fdfaf1", "panel": "#fffdf7", "accent": "#d9ab23" },
    "motif": { "kind": "train" }
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
        }
      ]
    }
  ]
}`;

function indentBlock(text: string): string {
  return text
    .split('\n')
    .map((line) => `  ${line}`)
    .join('\n');
}

export function generatePromptUseCase(input: PromptInput): string {
  const basicInfo = input.basicInfo.trim();
  const tripStyle = input.tripStyle.trim();
  if (!basicInfo || !tripStyle) {
    return '';
  }

  const mustVisitBlock = input.mustVisit?.trim()
    ? `\n## 絶対行きたい場所（任意）\n${indentBlock(input.mustVisit.trim())}\n`
    : '';

  const designBlock = input.designRequest?.trim()
    ? `\n## デザイン希望（任意）\n${input.designRequest.trim()}\n`
    : '';

  return `あなたは旅行プランナーです。以下の条件で旅行しおりデータを作成してください。

# 入力
## 行き先・日時・人数
${indentBlock(basicInfo)}

## どのような旅行にしたいか
${indentBlock(tripStyle)}
${mustVisitBlock}${designBlock}
プロンプトに画像を添付した場合は、それを参考にデザインを決めてください。

# design（見た目設定）について
- design は共有ページ（/s/<key>）の見た目を変えるためのオプションです。
- design は「任意CSS」ではなく、テンプレ（layout.preset）+ パラメータで表現します。
- 現時点で反映されるのは次の項目のみです:
  - design.layout.preset: timeline（標準）/ ticket（切符風）/ metro（路線図風）/ cards（カード風）/ serpentine（蛇行道路風）
  - design.layout.density: compact / comfortable
  - design.layout.cornerRadius: 0〜28
  - design.palette: bg/panel/text/muted/line/accent/accentDark（hex colorのみ）
- 上記以外の design フィールド（例: typography/pathStyle 等）は、出力しても現時点では表示に反映されません。迷う場合は出力しないでください。

# 出力ルール（厳守）
1. JSONのみ出力（コードブロック不要）。
2. コメントや末尾カンマは禁止。厳密なJSONのみ。
3. days は日付ごとに分割し、items は時系列順に並べる。
4. 各 item は time/title/description/place を必須にする。
5. 日時形式は time=HH:mm、date=YYYY-MM-DD、startDateTime/endDateTime=ISO風を維持する。
6. destination は旅行条件メモから主要エリアがわかる簡潔な1つの文字列にする。
7. 旅行条件メモの優先度や希望内容を反映する。
8. design は必須。デザイン希望がない場合は標準的な timeline レイアウトを使用。layout.preset は timeline/ticket/metro/cards/serpentine のいずれかにする。
9. design.layout.cornerRadius は 0〜28 の範囲にする。density は compact/comfortable のいずれかにする。
10. design.palette は #RGB または #RRGGBB のみ（例: "#d9ab23"）。読みやすさ（コントラスト）を最優先にする。
11. JSONキーと文字列値を囲む引用符は半角のダブルクォート (") のみを使用する。
12. 全角・スマートクォート（" " '）は使用禁止。これらの文字を一切出力しない。
13. 文字列値の中に " を含める場合は必ず \\" へエスケープし、必要に応じてバックスラッシュは \\\\ とする。
14. 出力前に自己検証し、未エスケープの " が1つでも残らないように最終チェックする。

# JSONスキーマ例
${schemaExample}

このルールに従ったJSONだけを返してください。`;
}
