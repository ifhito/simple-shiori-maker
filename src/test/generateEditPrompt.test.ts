import { describe, expect, it } from 'vitest';
import { generateEditPromptUseCase } from '../application/usecases/generateEditPrompt';
import type { Shiori } from '../domain/entities/Shiori';

const sampleShiori: Shiori = {
  title: '箱根1泊2日しおり',
  destination: '箱根',
  startDateTime: '2026-03-20T09:00',
  endDateTime: '2026-03-21T18:00',
  days: [
    {
      date: '2026-03-20',
      label: 'DAY 1',
      items: [
        {
          time: '09:00',
          title: '新宿駅集合',
          description: 'ロマンスカーで移動',
          place: '新宿駅'
        }
      ]
    }
  ]
};

describe('generateEditPromptUseCase', () => {
  it('includes the current shiori JSON in the prompt', () => {
    const prompt = generateEditPromptUseCase({
      currentShiori: sampleShiori,
      modificationRequest: 'ランチスポットを追加してください'
    });

    expect(prompt).toContain('"title": "箱根1泊2日しおり"');
    expect(prompt).toContain('"destination": "箱根"');
    expect(prompt).toContain('"time": "09:00"');
  });

  it('embeds modification request in the prompt', () => {
    const prompt = generateEditPromptUseCase({
      currentShiori: sampleShiori,
      modificationRequest: 'ランチスポットを追加してください'
    });

    expect(prompt).toContain('ランチスポットを追加してください');
  });

  it('uses default modification request when empty string provided', () => {
    const prompt = generateEditPromptUseCase({
      currentShiori: sampleShiori,
      modificationRequest: ''
    });

    expect(prompt).toContain('全体を見直して改善してください');
  });

  it('includes role declaration as edit expert', () => {
    const prompt = generateEditPromptUseCase({
      currentShiori: sampleShiori,
      modificationRequest: '時間を調整してください'
    });

    expect(prompt).toContain('旅行しおりデータ編集');
  });

  it('includes strict JSON output rules (same as generatePrompt)', () => {
    const prompt = generateEditPromptUseCase({
      currentShiori: sampleShiori,
      modificationRequest: '修正してください'
    });

    expect(prompt).toContain('```json コードブロックのみ');
    expect(prompt).toContain('厳密なJSONのみ');
    expect(prompt).toContain('各 item は time/title/description/place を必須');
  });

  it('embeds current JSON in a json code block', () => {
    const prompt = generateEditPromptUseCase({
      currentShiori: sampleShiori,
      modificationRequest: '修正'
    });

    expect(prompt).toContain('```json');
    expect(prompt).toContain('```');
  });

  it('returns a non-empty string', () => {
    const prompt = generateEditPromptUseCase({
      currentShiori: sampleShiori,
      modificationRequest: '修正'
    });

    expect(typeof prompt).toBe('string');
    expect(prompt.length).toBeGreaterThan(100);
  });
});
