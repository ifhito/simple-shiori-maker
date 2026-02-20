import type { Shiori } from '../../domain/entities/Shiori';

export interface EditPromptInput {
  currentShiori: Shiori;
  modificationRequest: string;
}

export function generateEditPromptUseCase(input: EditPromptInput): string {
  const request = input.modificationRequest.trim() || '全体を見直して改善してください';
  const currentJson = JSON.stringify(input.currentShiori, null, 2);

  return `あなたは旅行しおりデータ編集エキスパートです。以下の修正内容に従い、現在のしおりデータを編集してください。

# 修正内容
${request}

# 現在のしおりデータ
\`\`\`json
${currentJson}
\`\`\`

# 出力ルール（厳守）
1. 出力は1つの \`\`\`json コードブロックのみ。コードブロック外に説明文・前置きを書かない。
2. コードブロック内は厳密なJSONのみ。コメントや末尾カンマは禁止。
3. days は日付ごとに分割し、items は時系列順に並べる。
4. 各 item は time/title/description/place を必須にする。
5. 日時形式は time=HH:mm、date=YYYY-MM-DD、startDateTime/endDateTime=ISO風を維持する。
6. destination は主要エリアがわかる簡潔な1つの文字列にする。
7. JSONキーと文字列値を囲む引用符は半角のダブルクォート (") のみを使用する。
8. 全角・スマートクォート（" " '）は使用禁止。これらの文字を一切出力しない。
9. 文字列値の中に " を含める場合は必ず \\" へエスケープし、必要に応じてバックスラッシュは \\\\ とする。
10. 出力前に自己検証し、未エスケープの " が1つでも残らないように最終チェックする。

このルールに従った修正済みJSONだけを返してください。`;
}
