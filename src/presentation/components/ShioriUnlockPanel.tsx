import { FormEvent, useState } from 'react';

interface ShioriUnlockPanelProps {
  hasValidQuery: boolean;
  errorMessage: string;
  onUnlock: (password: string) => Promise<void>;
  isLoading: boolean;
}

export function ShioriUnlockPanel({
  hasValidQuery,
  errorMessage,
  onUnlock,
  isLoading
}: ShioriUnlockPanelProps) {
  const [password, setPassword] = useState('');
  const [localError, setLocalError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!password.trim()) {
      setLocalError('パスワードを入力してください');
      return;
    }

    setLocalError('');
    await onUnlock(password);
  }

  if (!hasValidQuery) {
    return (
      <section className="panel">
        <h2>共有URLの確認</h2>
        <p className="error-message">共有リンクが不正です。URLを確認してください。</p>
        <a href="/" className="button secondary inline-block">
          使い方ページへ戻る
        </a>
      </section>
    );
  }

  return (
    <section className="panel form-stack">
      <h2>しおりを開く</h2>
      <form className="form-stack" onSubmit={handleSubmit}>
        <label className="label" htmlFor="unlock-password">
          パスワード
        </label>
        <input
          id="unlock-password"
          className="input"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          placeholder="設定したパスワード"
        />
        {localError ? (
          <p className="error-message" role="alert">
            {localError}
          </p>
        ) : null}
        {errorMessage ? <p className="error-message">{errorMessage}</p> : null}
        <button className="button primary" type="submit" disabled={isLoading}>
          {isLoading ? '復号中...' : 'しおりを表示'}
        </button>
      </form>
    </section>
  );
}
