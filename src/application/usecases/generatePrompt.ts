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

  const imageReferenceNote = input.designReferenceImage
    ? `
# 追加情報（デザイン参照画像）
- デザイン参照画像を添付しています。
- 色だけでなく、レイアウト（構造）やタイポグラフィの雰囲気もこの画像を参考にして JSON を作成してください。`
    : '';

  return `あなたは旅行プランナーです。以下の条件で旅行しおりデータを作成してください。

# 入力
- 旅行条件メモ:
${indentBlock(freeText)}
${imageReferenceNote}

# 出力ルール（厳守）
1. 出力は1つの \`\`\`json コードブロックのみ。コードブロック外に説明文・前置きを書かない。
2. コードブロック内は厳密なJSONのみ。コメントや末尾カンマは禁止。
3. days は日付ごとに分割し、items は時系列順に並べる。
4. 各 item は time/title/description/place を必須にする。
5. 日時形式は time=HH:mm、date=YYYY-MM-DD、startDateTime/endDateTime=ISO風を維持する。
6. destination は旅行条件メモから主要エリアがわかる簡潔な1つの文字列にする。
7. 旅行条件メモの優先度や希望内容を反映する。
8. design は任意。ただしデザイン希望がある場合は design を含め、layout.preset は timeline/ticket/metro/cards のいずれかにする。
9. design.layout.cornerRadius は 0〜28 の範囲にする。density は compact/comfortable のいずれかにする。
10. design.palette は #RGB または #RRGGBB のみ（例: "#d9ab23"）。読みやすさ（コントラスト）を最優先にする。
11. JSONキーと文字列値を囲む引用符は半角のダブルクォート (") のみを使用する。
12. 全角・スマートクォート（” “ ’）は使用禁止。これらの文字を一切出力しない。
13. 文字列値の中に " を含める場合は必ず \\" へエスケープし、必要に応じてバックスラッシュは \\\\ とする。
14. 出力前に自己検証し、未エスケープの " が1つでも残らないように最終チェックする。

# JSONスキーマ例
${schemaExample}

このルールに従ったJSONだけを返してください。`;
}
