import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PromptForm } from './PromptForm';

describe('PromptForm', () => {
  it('starts with template text and generates prompt immediately', () => {
    render(<PromptForm />);

    const input = screen.getByLabelText('旅行条件メモ（テンプレート付き）') as HTMLTextAreaElement;
    const output = screen.getByLabelText('生成プロンプト') as HTMLTextAreaElement;
    const copyButton = screen.getByRole('button', { name: 'プロンプトをコピー' });

    expect(input.value).toContain('行き先:');
    expect(input.value).toContain('開始日時:');
    expect(input.value).toContain('終了日時:');
    expect(output.value).toContain('旅行条件メモ');
    expect(output.value).toContain('行き先:');
    expect(copyButton).toBeEnabled();
  });

  it('updates prompt when free text changes', () => {
    render(<PromptForm />);

    const input = screen.getByLabelText('旅行条件メモ（テンプレート付き）') as HTMLTextAreaElement;
    fireEvent.change(input, {
      target: { value: '- 行き先: 金沢\n- 開始日時: 2026-03-20T09:00\n- 終了日時: 2026-03-21T18:00' }
    });

    const output = screen.getByLabelText('生成プロンプト') as HTMLTextAreaElement;
    expect(output.value).toContain('旅行条件メモ');
    expect(output.value).toContain('金沢');
    expect(output.value).toContain('2026-03-20T09:00');
    expect(output.value).toContain('2026-03-21T18:00');
  });

  it('keeps prompt empty and copy disabled when free text is cleared', () => {
    render(<PromptForm />);

    const input = screen.getByLabelText('旅行条件メモ（テンプレート付き）') as HTMLTextAreaElement;
    fireEvent.change(input, { target: { value: '' } });

    const output = screen.getByLabelText('生成プロンプト') as HTMLTextAreaElement;
    const copyButton = screen.getByRole('button', { name: 'プロンプトをコピー' });
    expect(output.value).toBe('');
    expect(copyButton).toBeDisabled();
  });
});
