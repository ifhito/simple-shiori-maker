import { FormEvent, useState } from 'react';
import { isValidPassphrase } from '../../domain/valueObjects/Passphrase';

interface PassphraseFormProps {
  onSubmit: (passphrase: string) => Promise<void>;
  isLoading: boolean;
  errorMessage: string;
}

export function PassphraseForm({ onSubmit, isLoading, errorMessage }: PassphraseFormProps) {
  const [passphrase, setPassphrase] = useState('');
  const [localError, setLocalError] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!isValidPassphrase(passphrase)) {
      setLocalError('合言葉は4文字以上で入力してください（8文字以上推奨）');
      return;
    }

    setLocalError('');
    await onSubmit(passphrase);
  }

  return (
    <section className="panel form-stack">
      <h2>マイリンク</h2>
      <p>
        合言葉を入力して、保存したリンク一覧を表示します。
        合言葉自体は保存せず、このタブ内にハッシュのみ一時保存します。
      </p>
      <form className="form-stack" onSubmit={handleSubmit}>
        <label className="label" htmlFor="passphrase-input">
          合言葉
        </label>
        <input
          id="passphrase-input"
          className="input"
          type="password"
          value={passphrase}
          onChange={(event) => setPassphrase(event.target.value)}
          placeholder="4文字以上（8文字以上推奨）"
        />
        {localError ? (
          <p className="error-message" role="alert">
            {localError}
          </p>
        ) : null}
        {errorMessage ? <p className="error-message">{errorMessage}</p> : null}
        <button className="button primary" type="submit" disabled={isLoading}>
          {isLoading ? '読み込み中...' : 'リンク一覧を表示'}
        </button>
      </form>
    </section>
  );
}
