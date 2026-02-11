import { describe, expect, it } from 'vitest';
import { generatePromptUseCase } from './generatePrompt';

describe('generatePromptUseCase', () => {
  it('includes strict JSON and map requirements with free text instructions', () => {
    const prompt = generatePromptUseCase({
      requestText: '- 行き先: 金沢, 富山\n- 開始日時: 2026-03-20T09:00\n- 終了日時: 2026-03-21T18:00'
    });

    expect(prompt).toContain('厳密なJSONのみ');
    expect(prompt).toContain('```json コードブロックのみ');
    expect(prompt).toContain('Google Maps');
    expect(prompt).toContain('旅行条件メモ');
    expect(prompt).toContain('金沢');
    expect(prompt).toContain('富山');
    expect(prompt).toContain('2026-03-20T09:00');
    expect(prompt).toContain('2026-03-21T18:00');
  });

  it('embeds free text block as-is with indentation', () => {
    const prompt = generatePromptUseCase({
      requestText: '- 食事\n  - もりもり寿司\n- 体験\n  - 金箔貼り'
    });

    expect(prompt).toContain('- 旅行条件メモ:');
    expect(prompt).toContain('  - 食事');
    expect(prompt).toContain('    - もりもり寿司');
    expect(prompt).toContain('  - 体験');
    expect(prompt).toContain('    - 金箔貼り');
  });

  it('includes strict quote rules to avoid malformed JSON', () => {
    const prompt = generatePromptUseCase({
      requestText: '- 行き先: 金沢'
    });
    const escapedQuote = String.raw`\"`;
    const escapedBackslash = String.raw`\\`;

    expect(prompt).toContain('JSONキーと文字列値を囲む引用符は半角のダブルクォート (") のみを使用する');
    expect(prompt).toContain('全角・スマートクォート（” “ ’）は使用禁止');
    expect(prompt).toContain(`文字列値の中に " を含める場合は必ず ${escapedQuote} へエスケープ`);
    expect(prompt).toContain(`必要に応じてバックスラッシュは ${escapedBackslash} とする`);
    expect(prompt).toContain('未エスケープの " が1つでも残らないように最終チェック');
  });
});
