/**
 * ドメイン層のバリデーションエラー文字列をユーザー向けの日本語に変換する。
 * 変換ルールはプレゼンテーション層の責務。
 */

// "days[N].items[M].field ..." → { dayIndex: N, itemIndex: M, field }
// "days[N].items ..." → { dayIndex: N, itemIndex: null }
// "days[N].field ..." → { dayIndex: N, field }
const DAY_ITEM_FIELD = /^days\[(\d+)\]\.items\[(\d+)\]\.(\w+)/;
const DAY_ITEMS_ONLY = /^days\[(\d+)\]\.items/;
const DAY_ITEM_OBJ = /^days\[(\d+)\]\.items\[(\d+)\]/;
const DAY_FIELD = /^days\[(\d+)\]\.(\w+)/;
const DAY_OBJ = /^days\[(\d+)\]/;

function dayLabel(n: number) {
  return `${n + 1}日目`;
}
function spotLabel(n: number) {
  return `スポット${n + 1}`;
}

const FIELD_NAMES: Record<string, string> = {
  title: 'スポット名',
  description: '説明',
  place: '場所',
  time: '時刻',
  mapUrl: '地図URL',
  label: 'ラベル',
  date: '日付',
};

export function humanizeValidationError(raw: string): string {
  // ── トップレベルフィールド ──────────────────────
  if (raw.startsWith('title ')) return 'タイトルを入力してください';
  if (raw.startsWith('destination ')) return '目的地を入力してください';
  if (raw === 'startDateTime は必須文字列です') return '開始日時を入力してください';
  if (raw === 'startDateTime は YYYY-MM-DDTHH:mm 形式である必要があります')
    return '開始日時の形式が正しくありません（例: 2026-03-20T09:00）';
  if (raw === 'endDateTime は必須文字列です') return '終了日時を入力してください';
  if (raw === 'endDateTime は YYYY-MM-DDTHH:mm 形式である必要があります')
    return '終了日時の形式が正しくありません（例: 2026-03-21T18:00）';
  if (raw === 'days は1件以上必要です') return '日程を1日以上追加してください';
  if (raw.startsWith('days は')) return '日程データが壊れています';
  if (raw.startsWith('JSON')) return 'JSONの形式が正しくありません';

  // ── days[N].items[M].field ──────────────────────
  let m = DAY_ITEM_FIELD.exec(raw);
  if (m) {
    const prefix = `${dayLabel(+m[1])} ${spotLabel(+m[2])}：`;
    const field = m[3];
    if (field === 'time') {
      if (raw.includes('必須')) return `${prefix}時刻を入力してください`;
      return `${prefix}時刻は HH:mm 形式で入力してください（例: 09:00）`;
    }
    const fieldName = FIELD_NAMES[field] ?? field;
    if (raw.includes('必須')) return `${prefix}${fieldName}を入力してください`;
    return `${prefix}${fieldName}の形式が正しくありません`;
  }

  // ── days[N].items[M] (オブジェクトエラー) ────────
  m = DAY_ITEM_OBJ.exec(raw);
  if (m) {
    return `${dayLabel(+m[1])} ${spotLabel(+m[2])}：データが壊れています`;
  }

  // ── days[N].items (時系列 / 配列エラー) ──────────
  m = DAY_ITEMS_ONLY.exec(raw);
  if (m) {
    if (raw.includes('時系列'))
      return `${dayLabel(+m[1])}：スポットの時刻が時系列順になっていません（↑↓で並び替えてください）`;
    return `${dayLabel(+m[1])}：スポットデータが壊れています`;
  }

  // ── days[N].field ────────────────────────────────
  m = DAY_FIELD.exec(raw);
  if (m) {
    const prefix = `${dayLabel(+m[1])}：`;
    const field = m[2];
    if (field === 'date') {
      if (raw.includes('必須')) return `${prefix}日付を入力してください`;
      return `${prefix}日付は YYYY-MM-DD 形式で入力してください（例: 2026-03-20）`;
    }
    if (field === 'label') return `${prefix}ラベルを入力してください`;
    if (raw.includes('必須')) return `${prefix}${FIELD_NAMES[field] ?? field}を入力してください`;
    return `${prefix}${FIELD_NAMES[field] ?? field}の形式が正しくありません`;
  }

  // ── days[N] (オブジェクトエラー) ─────────────────
  m = DAY_OBJ.exec(raw);
  if (m) {
    return `${dayLabel(+m[1])}のデータが壊れています`;
  }

  // フォールバック: 変換できなかったものはそのまま返す
  return raw;
}
