import type { PromptInput } from '../dto/shiori';

const schemaExample = `{
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
  const freeText = input.requestText.trim();
  if (!freeText) {
    return '';
  }

  return `あなたは地理情報を熟知した旅行プランナーです。以下の条件で旅行しおりデータを作成してください。
「絶対に行きたい場所」は必ずすべてスケジュールに組み込み、スポット間の地理的な位置関係を考慮して移動効率の高いルートを組んでください。

# 入力
- 旅行条件メモ:
${indentBlock(freeText)}

# 出力ルール（厳守）
1. 出力は1つの \`\`\`json コードブロックのみ。コードブロック外に説明文・前置きを書かない。
2. コードブロック内は厳密なJSONのみ。コメントや末尾カンマは禁止。
3. days は日付ごとに分割し、items は時系列順に並べる。
4. 各 item は time/title/description/place を必須にする。
5. 日時形式は time=HH:mm、date=YYYY-MM-DD、startDateTime/endDateTime=ISO風を維持する。
6. destination は旅行条件メモから主要エリアがわかる簡潔な1つの文字列にする。
7. 旅行条件メモの「絶対に行きたい場所」に挙げたスポットはすべて items に含める。1か所でも欠落した場合、出力は無効とみなす。
8. 各スポットの所在エリア・地区を考慮し、地理的に近いスポット同士を同じ時間帯・連続する時間枠に配置する。無駄な往復（バックトラック）を避け、移動が最短になる順序でスケジュールを組む。
9. 移動時間が長くなる場合は item として「移動」を明示し、description に手段と所要時間の目安を記載する。
10. 旅行条件メモに登場する店名・施設名が不明確または特定できない場合は、その item の description に「※ 要確認:（不明な点）」と明記する。推測で店名を補う場合も同様に description に「※ 要確認」と記載する。
11. 体験・観光スポット・飲食店は営業時間・開館時間を考慮してスケジュールを組む。時間が制限になる場合や確認が必要な場合は description に営業時間の目安を記載する。
12. JSONキーと文字列値を囲む引用符は半角のダブルクォート (") のみを使用する。
13. 全角・スマートクォート（” “ ’）は使用禁止。これらの文字を一切出力しない。
14. 文字列値の中に " を含める場合は必ず \\" へエスケープし、必要に応じてバックスラッシュは \\\\ とする。
15. 出力前に自己検証し、未エスケープの " が1つでも残らないように最終チェックする。

# JSONスキーマ例
${schemaExample}

このルールに従ったJSONだけを返してください。`;
}
