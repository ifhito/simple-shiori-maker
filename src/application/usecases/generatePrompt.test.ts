import { describe, expect, it } from 'vitest';
import { generatePromptUseCase } from './generatePrompt';

describe('generatePromptUseCase', () => {
  it('includes strict JSON requirements with free text instructions', () => {
    const prompt = generatePromptUseCase({
      basicInfo: '- 行き先: 金沢, 富山\n- 開始日時: 2026-03-20T09:00\n- 終了日時: 2026-03-21T18:00',
      tripStyle: '観光メインでのんびり'
    });

    expect(prompt).toContain('厳密なJSONのみ');
    expect(prompt).toContain('JSONを `\`\`json コードブロックで出力する');
    expect(prompt).toContain('各 item は time/title/description/place を必須');
    expect(prompt).not.toContain('mapUrl は可能な限り');
    expect(prompt).toContain('金沢');
    expect(prompt).toContain('富山');
    expect(prompt).toContain('2026-03-20T09:00');
    expect(prompt).toContain('2026-03-21T18:00');
  });

  it('returns empty string when basicInfo is empty', () => {
    const prompt = generatePromptUseCase({ basicInfo: '', tripStyle: '観光メイン' });
    expect(prompt).toBe('');
  });

  it('returns empty string when tripStyle is empty', () => {
    const prompt = generatePromptUseCase({
      basicInfo: '- 行き先: 箱根',
      tripStyle: ''
    });
    expect(prompt).toBe('');
  });

  it('embeds basicInfo with indentation', () => {
    const prompt = generatePromptUseCase({
      basicInfo: '- 食事\n  - もりもり寿司\n- 体験\n  - 金箔貼り',
      tripStyle: '観光メイン'
    });

    expect(prompt).toContain('## 行き先・日時・人数');
    expect(prompt).toContain('  - 食事');
    expect(prompt).toContain('    - もりもり寿司');
    expect(prompt).toContain('  - 体験');
    expect(prompt).toContain('    - 金箔貼り');
  });

  it('includes mustVisit section when provided', () => {
    const prompt = generatePromptUseCase({
      basicInfo: '- 行き先: 京都',
      tripStyle: '文化体験',
      mustVisit: '金閣寺、嵐山'
    });

    expect(prompt).toContain('## 絶対行きたい場所');
    expect(prompt).toContain('金閣寺');
    expect(prompt).toContain('嵐山');
  });

  it('omits mustVisit section when not provided', () => {
    const prompt = generatePromptUseCase({
      basicInfo: '- 行き先: 京都',
      tripStyle: '文化体験'
    });

    expect(prompt).not.toContain('## 絶対行きたい場所');
  });

  it('includes designRequest section when provided', () => {
    const prompt = generatePromptUseCase({
      basicInfo: '- 行き先: 箱根',
      tripStyle: '温泉でのんびり',
      designRequest: '黄色で電車みたい'
    });

    expect(prompt).toContain('## デザイン希望');
    expect(prompt).toContain('黄色で電車みたい');
  });

  it('includes strict quote rules to avoid malformed JSON', () => {
    const prompt = generatePromptUseCase({
      basicInfo: '- 行き先: 金沢',
      tripStyle: '観光メイン'
    });
    const escapedQuote = String.raw`\"`;
    const escapedBackslash = String.raw`\\`;

    expect(prompt).toContain('JSONキーと文字列値を囲む引用符は半角のダブルクォート (") のみを使用する');
    expect(prompt).toContain('全角・スマートクォート');
    expect(prompt).toContain(`文字列値の中に " を含める場合は必ず ${escapedQuote} へエスケープ`);
    expect(prompt).toContain(`必要に応じてバックスラッシュは ${escapedBackslash} とする`);
    expect(prompt).toContain('未エスケープの " が1つでも残らないように最終チェック');
  });

  it('schema example omits mapUrl to reduce payload size', () => {
    const prompt = generatePromptUseCase({
      basicInfo: '- 行き先: 箱根',
      tripStyle: '温泉'
    });

    expect(prompt).not.toContain('"mapUrl"');
  });

  it('schema example omits heroEmojis', () => {
    const prompt = generatePromptUseCase({
      basicInfo: '- 行き先: 箱根',
      tripStyle: '温泉'
    });

    expect(prompt).not.toContain('heroEmojis');
  });

  it('includes an explanation of what design means', () => {
    const prompt = generatePromptUseCase({
      basicInfo: '- 行き先: 箱根',
      tripStyle: '温泉'
    });

    expect(prompt).toContain('# design（見た目設定）について');
    expect(prompt).toContain('任意CSS');
    expect(prompt).toContain('layout.preset');
  });

  it('design is required in output rules', () => {
    const prompt = generatePromptUseCase({
      basicInfo: '- 行き先: 箱根',
      tripStyle: '温泉'
    });

    expect(prompt).toContain('design は必須');
    expect(prompt).toContain('timeline レイアウトを使用');
  });

  it('includes serpentine in the preset list', () => {
    const prompt = generatePromptUseCase({
      basicInfo: '- 行き先: 箱根',
      tripStyle: '温泉'
    });

    expect(prompt).toContain('serpentine（蛇行道路風）');
    expect(prompt).toContain('timeline/ticket/metro/cards/serpentine');
  });

  it('always includes image reference note', () => {
    const prompt = generatePromptUseCase({
      basicInfo: '- 行き先: 箱根',
      tripStyle: '温泉'
    });

    expect(prompt).toContain('プロンプトに画像を添付した場合は、それを参考にデザインを決めてください');
  });
});
