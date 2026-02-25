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

  it('opens with a role description emphasising geographic awareness', () => {
    const prompt = generatePromptUseCase({
      basicInfo: '- 行き先: 沖縄',
      tripStyle: '観光メイン'
    });

    expect(prompt).toContain('地理情報を熟知した旅行プランナー');
    expect(prompt).toContain('地理的な位置関係を考慮して移動効率の高いルートを組んでください');
  });

  it('requires all must-visit spots to be included in the schedule', () => {
    const prompt = generatePromptUseCase({
      basicInfo: '- 行き先: 京都',
      tripStyle: '文化体験',
      mustVisit: '金閣寺、嵐山'
    });

    expect(prompt).toContain('「絶対行きたい場所」に挙げたスポットはすべて items に含める');
    expect(prompt).toContain('1か所でも欠落した場合、出力は無効とみなす');
  });

  it('requires spots to be distributed evenly across all days', () => {
    const prompt = generatePromptUseCase({
      basicInfo: '- 行き先: 京都\n- 日程: 3日間',
      tripStyle: '観光メイン'
    });

    expect(prompt).toContain('特定の日に偏らせず');
    expect(prompt).toContain('各日に分散して配置する');
  });

  it('requires geographically efficient routing to avoid backtracking', () => {
    const prompt = generatePromptUseCase({
      basicInfo: '- 行き先: 大阪',
      tripStyle: '観光メイン'
    });

    expect(prompt).toContain('地理的に近いスポット同士を同じ時間帯・連続する時間枠に配置する');
    expect(prompt).toContain('無駄な往復（バックトラック）を避け');
  });

  it('requires long travel legs to be listed as explicit items', () => {
    const prompt = generatePromptUseCase({
      basicInfo: '- 行き先: 北海道',
      tripStyle: '観光メイン'
    });

    expect(prompt).toContain('移動時間が長くなる場合は item として「移動」を明示し');
    expect(prompt).toContain('手段と所要時間の目安を記載する');
  });

  it('flags unclear shop or place names in description', () => {
    const prompt = generatePromptUseCase({
      basicInfo: '- 行き先: 福岡',
      tripStyle: '観光メイン'
    });

    expect(prompt).toContain('店名・施設名が不明確または特定できない場合');
    expect(prompt).toContain('description に「※ 要確認');
  });

  it('requires operating hours to be checked for experiences and attractions', () => {
    const prompt = generatePromptUseCase({
      basicInfo: '- 行き先: 奈良',
      tripStyle: '観光メイン'
    });

    expect(prompt).toContain('営業時間・開館時間を考慮して');
    expect(prompt).toContain('description に営業時間の目安を記載する');
  });
});
