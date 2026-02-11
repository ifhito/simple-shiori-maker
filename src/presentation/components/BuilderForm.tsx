import { FormEvent, useState } from 'react';

interface BuilderFormProps {
  onSubmit: (input: { plainText: string; password: string }) => Promise<void> | void;
  isSubmitting: boolean;
}

export function BuilderForm({ onSubmit, isSubmitting }: BuilderFormProps) {
  const [plainText, setPlainText] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!plainText.trim() || !password.trim()) {
      setError('JSON本文とパスワードは必須です');
      return;
    }

    setError('');

    try {
      await onSubmit({ plainText, password });
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : '生成に失敗しました';
      setError(message);
    }
  }

  return (
    <form className="panel form-stack" onSubmit={handleSubmit}>
      <label className="label" htmlFor="json-input">
        AIで作成したJSON本文
      </label>
      <textarea
        id="json-input"
        className="textarea"
        rows={12}
        value={plainText}
        onChange={(event) => setPlainText(event.target.value)}
        placeholder="ここにChatGPT等が返したJSONを貼り付け"
      />

      <label className="label" htmlFor="password-input">
        しおり用パスワード
      </label>
      <input
        id="password-input"
        className="input"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        placeholder="英数字混在を推奨"
      />

      {error ? (
        <p className="error-message" role="alert">
          {error}
        </p>
      ) : null}

      <button className="button primary" type="submit" disabled={isSubmitting}>
        {isSubmitting ? '生成中...' : 'しおりリンクを生成'}
      </button>
    </form>
  );
}
