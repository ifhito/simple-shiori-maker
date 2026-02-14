import { describe, expect, it } from 'vitest';
import { generatePromptUseCase } from './generatePrompt';

describe('generatePromptUseCase', () => {
  it('includes strict JSON requirements with free text instructions', () => {
    const prompt = generatePromptUseCase({
      requestText: '- 行き先: 金沢, 富山\n- 開始日時: 2026-03-20T09:00\n- 終了日時: 2026-03-21T18:00'
    });

    expect(prompt).toContain('厳密なJSONのみ');
    expect(prompt).toContain('```json コードブロックのみ');
    expect(prompt).toContain('各 item は time/title/description/place を必須');
    expect(prompt).not.toContain('mapUrl は可能な限り');
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

  it('schema example omits mapUrl to reduce payload size', () => {
    const prompt = generatePromptUseCase({
      requestText: '- 行き先: 箱根'
    });

    expect(prompt).not.toContain('"mapUrl"');
  });

  it('includes an explanation of what design means', () => {
    const prompt = generatePromptUseCase({
      requestText: '- 行き先: 箱根'
    });

    expect(prompt).toContain('# design（見た目設定）について');
    expect(prompt).toContain('任意CSS');
    expect(prompt).toContain('layout.preset');
  });

  it('includes a note to reference attached image when enabled', () => {
    const prompt = generatePromptUseCase({
      requestText: '- 行き先: 箱根\n- デザイン希望: 黄色で電車みたい',
      designReferenceImage: true
    });

    expect(prompt).toContain('デザイン参照画像');
    expect(prompt).toContain('添付');
    expect(prompt).toContain('参考');
  });
});
