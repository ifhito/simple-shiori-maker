import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PromptForm } from './PromptForm';

describe('PromptForm', () => {
  it('renders all field inputs and copy button is disabled initially', () => {
    render(<PromptForm />);

    expect(screen.getByLabelText('行き先')).toBeInTheDocument();
    const output = screen.getByLabelText('生成プロンプト') as HTMLTextAreaElement;
    const copyButton = screen.getByRole('button', { name: 'プロンプトをコピー' });
    expect(output.value).toBe('');
    expect(copyButton).toBeDisabled();
  });

  it('updates prompt when fields are filled in', () => {
    render(<PromptForm />);

    fireEvent.change(screen.getByLabelText('行き先'), { target: { value: '金沢' } });
    fireEvent.change(screen.getByLabelText('開始日時'), { target: { value: '2026-03-20T09:00' } });

    const output = screen.getByLabelText('生成プロンプト') as HTMLTextAreaElement;
    const copyButton = screen.getByRole('button', { name: 'プロンプトをコピー' });
    expect(output.value).toContain('金沢');
    expect(output.value).toContain('2026-03-20T09:00');
    expect(copyButton).toBeEnabled();
  });

  it('keeps prompt empty and copy disabled when all fields are empty', () => {
    render(<PromptForm />);

    const output = screen.getByLabelText('生成プロンプト') as HTMLTextAreaElement;
    const copyButton = screen.getByRole('button', { name: 'プロンプトをコピー' });
    expect(output.value).toBe('');
    expect(copyButton).toBeDisabled();
  });

  it('includes only non-empty fields in prompt', () => {
    render(<PromptForm />);

    fireEvent.change(screen.getByLabelText('行き先'), { target: { value: '金沢' } });

    const output = screen.getByLabelText('生成プロンプト') as HTMLTextAreaElement;
    expect(output.value).toContain('金沢');
    expect(output.value).not.toContain('開始日時:');
  });

  it('treats whitespace-only input as empty', () => {
    render(<PromptForm />);

    fireEvent.change(screen.getByLabelText('行き先'), { target: { value: '   ' } });

    const output = screen.getByLabelText('生成プロンプト') as HTMLTextAreaElement;
    const copyButton = screen.getByRole('button', { name: 'プロンプトをコピー' });
    expect(output.value).toBe('');
    expect(copyButton).toBeDisabled();
  });

  it('multi-line textarea field appears in prompt', () => {
    render(<PromptForm />);

    fireEvent.change(screen.getByLabelText('行きたい場所・食事・体験（必ず全て含まれます）'), {
      target: { value: '兼六園\n金沢城' }
    });

    const output = screen.getByLabelText('生成プロンプト') as HTMLTextAreaElement;
    expect(output.value).toContain('兼六園');
    expect(output.value).toContain('金沢城');
  });
});
