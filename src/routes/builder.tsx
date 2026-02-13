import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { createShareLinkViaApi } from '../application/usecases/createShareLink';
import { createShioriApiClient } from '../infrastructure/http/shioriApiClient';
import { LocalPasshashStorage } from '../infrastructure/storage/passhashStorage';
import { BuilderForm } from '../presentation/components/BuilderForm';
import { buildShareUrl, formatExpiryDateTime, formatRemainingTime } from '../presentation/components/shareLink';

export const Route = createFileRoute('/builder')({
  component: BuilderPage
});

function BuilderPage() {
  const [isSubmitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState<number | null>(null);

  const apiClient = useMemo(() => createShioriApiClient(''), []);
  const passhashRepository = useMemo(() => new LocalPasshashStorage(), []);

  async function handleCreate(input: { plainText: string; password: string }) {
    setSubmitting(true);
    setErrorMessage('');
    setShareUrl('');
    setExpiresAt(null);

    try {
      const result = await createShareLinkViaApi(input, {
        encryptApi: apiClient.encrypt,
        passhashRepository
      });

      const origin = typeof window === 'undefined' ? '' : window.location.origin;
      const url = buildShareUrl(origin, result.key);
      setShareUrl(url);
      setExpiresAt(result.expiresAt);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'リンク生成に失敗しました';
      setErrorMessage(message);
      throw error;
    } finally {
      setSubmitting(false);
    }
  }

  const locale = typeof navigator === 'undefined' ? 'ja-JP' : navigator.language;

  return (
    <section className="builder-layout">
      <BuilderForm onSubmit={handleCreate} isSubmitting={isSubmitting} />

      <aside className="panel form-stack">
        <h2>生成結果</h2>
        <p>JSON検証とAPI暗号化が成功すると、共有リンクが表示されます。</p>
        {errorMessage ? <p className="error-message">{errorMessage}</p> : null}
        {shareUrl ? (
          <>
            <a className="share-link" href={shareUrl}>
              {shareUrl}
            </a>
            {expiresAt !== null ? (
              <p className="subtle-text">
                有効期限: {formatExpiryDateTime(expiresAt, locale)}（{formatRemainingTime(expiresAt)}）
              </p>
            ) : null}
            <a className="button secondary inline-block" href={shareUrl}>
              しおりを開く
            </a>
          </>
        ) : null}
      </aside>
    </section>
  );
}
