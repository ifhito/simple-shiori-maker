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

  return `あなたは地理情報を熟知した旅行プランナーです。以下の条件で旅行しおりデータを作成してください。
「絶対行きたい場所」のスポットはすべてスケジュールに組み込み、スポット間の地理的な位置関係を考慮して移動効率の高いルートを組んでください。

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
1. JSONを \`\`\`json コードブロックで出力する。コードブロック外の説明文は不要。
2. コメントや末尾カンマは禁止。厳密なJSONのみ。
3. days は日付ごとに分割し、items は時系列順に並べる。
4. 各 item は time/title/description/place を必須にする。
5. 日時形式は time=HH:mm、date=YYYY-MM-DD、startDateTime/endDateTime=ISO風を維持する。
6. destination は旅行条件メモから主要エリアがわかる簡潔な1つの文字列にする。
7. 「絶対行きたい場所」に挙げたスポットはすべて items に含める。1か所でも欠落した場合、出力は無効とみなす。
8. 各スポットの所在エリア・地区を考慮し、地理的に近いスポット同士を同じ時間帯・連続する時間枠に配置する。無駄な往復（バックトラック）を避け、移動が最短になる順序でスケジュールを組む。
9. 複数日にわたる旅行の場合、スポットを特定の日に偏らせず、各日に分散して配置する。各日の観光密度が均等になるよう調整し、どの日も充実したスケジュールにする。
10. 移動時間が長くなる場合は item として「移動」を明示し、description に手段と所要時間の目安を記載する。
11. 旅行条件メモに登場する店名・施設名が不明確または特定できない場合は、その item の description に「※ 要確認:（不明な点）」と明記する。推測で店名を補う場合も同様に description に「※ 要確認」と記載する。
12. 体験・観光スポット・飲食店は営業時間・開館時間を考慮してスケジュールを組む。時間が制限になる場合や確認が必要な場合は description に営業時間の目安を記載する。
13. design は必須。デザイン希望がない場合は標準的な timeline レイアウトを使用。layout.preset は timeline/ticket/metro/cards/serpentine のいずれかにする。
14. design.layout.cornerRadius は 0〜28 の範囲にする。density は compact/comfortable のいずれかにする。
15. design.palette は #RGB または #RRGGBB のみ（例: "#d9ab23"）。読みやすさ（コントラスト）を最優先にする。
16. JSONキーと文字列値を囲む引用符は半角のダブルクォート (") のみを使用する。
17. 全角・スマートクォート（" " '）は使用禁止。これらの文字を一切出力しない。
18. 文字列値の中に " を含める場合は必ず \\" へエスケープし、必要に応じてバックスラッシュは \\\\ とする。
19. 出力前に自己検証し、未エスケープの " が1つでも残らないように最終チェックする。

# JSONスキーマ例
${schemaExample}

このルールに従ったJSONだけを返してください。`;
}
