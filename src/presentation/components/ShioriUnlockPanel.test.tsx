import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ShioriUnlockPanel } from './ShioriUnlockPanel';

describe('ShioriUnlockPanel', () => {
  it('shows missing query message', () => {
    render(
      <ShioriUnlockPanel
        hasValidQuery={false}
        errorMessage=""
        onUnlock={async () => {}}
        isLoading={false}
      />
    );

    expect(screen.getByText('共有リンクが不正です。URLを確認してください。')).toBeInTheDocument();
  });

  it('shows decrypt failure message', () => {
    render(
      <ShioriUnlockPanel
        hasValidQuery
        errorMessage="復号に失敗しました（パスワード不一致またはデータ破損）"
        onUnlock={async () => {}}
        isLoading={false}
      />
    );

    expect(screen.getByText('復号に失敗しました（パスワード不一致またはデータ破損）')).toBeInTheDocument();
  });
});
