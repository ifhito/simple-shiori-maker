import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PromptForm } from './PromptForm';

describe('PromptForm', () => {
  it('has basicInfo template pre-filled with destination and datetime fields', () => {
    render(<PromptForm />);

    const basicInfoInput = screen.getByLabelText('行き先・日時・人数（必須）') as HTMLTextAreaElement;
    expect(basicInfoInput.value).toContain('行き先:');
    expect(basicInfoInput.value).toContain('開始日時:');
    expect(basicInfoInput.value).toContain('終了日時:');
  });

  it('copy button is disabled until both required sections are filled', () => {
    render(<PromptForm />);

    const output = screen.getByLabelText('生成プロンプト') as HTMLTextAreaElement;
    const copyButton = screen.getByRole('button', { name: 'プロンプトをコピー' });

    expect(output.value).toBe('');
    expect(copyButton).toBeDisabled();
  });

  it('generates prompt and enables copy when both basicInfo and tripStyle are filled', () => {
    render(<PromptForm />);

    const tripStyleInput = screen.getByLabelText('どのような旅行にしたいか（必須）') as HTMLTextAreaElement;
    fireEvent.change(tripStyleInput, { target: { value: '温泉でのんびり' } });

    const output = screen.getByLabelText('生成プロンプト') as HTMLTextAreaElement;
    const copyButton = screen.getByRole('button', { name: 'プロンプトをコピー' });

    expect(output.value).toContain('行き先');
    expect(output.value).toContain('温泉でのんびり');
    expect(output.value).toContain('地理情報を熟知した旅行プランナー');
    expect(copyButton).toBeEnabled();
  });

  it('prompt becomes empty and copy is disabled when tripStyle is cleared', () => {
    render(<PromptForm />);

    const tripStyleInput = screen.getByLabelText('どのような旅行にしたいか（必須）') as HTMLTextAreaElement;
    fireEvent.change(tripStyleInput, { target: { value: '温泉でのんびり' } });
    fireEvent.change(tripStyleInput, { target: { value: '' } });

    const output = screen.getByLabelText('生成プロンプト') as HTMLTextAreaElement;
    const copyButton = screen.getByRole('button', { name: 'プロンプトをコピー' });

    expect(output.value).toBe('');
    expect(copyButton).toBeDisabled();
  });

  it('includes mustVisit content in prompt when filled', () => {
    render(<PromptForm />);

    const tripStyleInput = screen.getByLabelText('どのような旅行にしたいか（必須）') as HTMLTextAreaElement;
    const mustVisitInput = screen.getByLabelText(
      '絶対行きたい場所（任意・入力した場所は必ず含まれます）'
    ) as HTMLTextAreaElement;
    fireEvent.change(tripStyleInput, { target: { value: '観光メイン' } });
    fireEvent.change(mustVisitInput, { target: { value: '金閣寺、嵐山' } });

    const output = screen.getByLabelText('生成プロンプト') as HTMLTextAreaElement;
    expect(output.value).toContain('金閣寺');
    expect(output.value).toContain('嵐山');
    expect(output.value).toContain('すべて items に含める');
  });

  it('includes designRequest content in prompt when filled', () => {
    render(<PromptForm />);

    const tripStyleInput = screen.getByLabelText('どのような旅行にしたいか（必須）') as HTMLTextAreaElement;
    const designInput = screen.getByLabelText('デザイン希望（任意）') as HTMLInputElement;
    fireEvent.change(tripStyleInput, { target: { value: '温泉メイン' } });
    fireEvent.change(designInput, { target: { value: '黄色で電車みたい' } });

    const output = screen.getByLabelText('生成プロンプト') as HTMLTextAreaElement;
    expect(output.value).toContain('## デザイン希望');
    expect(output.value).toContain('黄色で電車みたい');
    expect(output.value).toContain('# design（見た目設定）について');
  });
});
