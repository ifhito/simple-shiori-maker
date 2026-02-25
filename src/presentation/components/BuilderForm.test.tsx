import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { BuilderForm } from './BuilderForm';

describe('BuilderForm', () => {
  it('shows validation message when required fields are empty', async () => {
    render(<BuilderForm onSubmit={vi.fn()} isSubmitting={false} />);

    fireEvent.click(screen.getByRole('button', { name: 'しおりリンクを生成' }));

    expect(await screen.findByText('しおりデータとパスワードは必須です')).toBeInTheDocument();
  });
});
