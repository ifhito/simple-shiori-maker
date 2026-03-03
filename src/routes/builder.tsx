import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { createShareLinkViaApi } from '../application/usecases/createShareLink';
import { prepareNewEditFromJsonUseCase } from '../application/usecases/editDraft';
import { parseAndValidateShioriJson } from '../application/usecases/parseAndValidateShiori';
import { upsertUserLinkEntryUseCase } from '../application/usecases/upsertUserLinkEntry';
import { isValidPassphrase } from '../domain/valueObjects/Passphrase';
import { validateShioriData } from '../domain/services/ShioriValidationService';
import { parseJsonText } from '../infrastructure/parsing/jsonParser';
import { hashPassphraseToKey } from '../infrastructure/crypto/passphraseHash';
import { createShioriApiClient } from '../infrastructure/http/shioriApiClient';
import { LocalPasshashStorage } from '../infrastructure/storage/passhashStorage';
import { LocalPassphraseHashCacheStorage } from '../infrastructure/storage/localPassphraseHashCacheStorage';
import { SessionDraftStorage } from '../infrastructure/storage/sessionDraftStorage';
import { BuilderForm } from '../presentation/components/BuilderForm';
import { buildShareUrl, formatExpiryDateTime, formatRemainingTime } from '../presentation/components/shareLink';

export const Route = createFileRoute('/builder')({
  component: BuilderPage
});

function BuilderPage() {
  const navigate = useNavigate();
  const [isSubmitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [shareUrl, setShareUrl] = useState('');
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [initialJson, setInitialJson] = useState<string | undefined>(undefined);

  const apiClient = useMemo(() => createShioriApiClient(''), []);
  const passhashRepository = useMemo(() => new LocalPasshashStorage(), []);
  const draftRepository = useMemo(() => new SessionDraftStorage(), []);
  const passphraseHashCache = useMemo(() => new LocalPassphraseHashCacheStorage(), []);

  // Load JSON draft coming back from /edit
  useEffect(() => {
    const draft = draftRepository.loadBuilderDraft();
    if (draft) {
      draftRepository.clearBuilderDraft();
      setInitialJson(draft);
    }
  }, [draftRepository]);

  function handleEdit(json: string) {
    prepareNewEditFromJsonUseCase(json, { draftRepository });
    void navigate({ to: '/edit' });
  }

  async function handleCreate(input: { plainText: string; password: string; passphrase?: string }) {
    setSubmitting(true);
    setErrorMessage('');
    setShareUrl('');
    setExpiresAt(null);

    try {
      const result = await createShareLinkViaApi(
        { plainText: input.plainText, password: input.password },
        { encryptApi: apiClient.encrypt, passhashRepository }
      );

      const origin = typeof window === 'undefined' ? '' : window.location.origin;
      const url = buildShareUrl(origin, result.key);
      setShareUrl(url);
      setExpiresAt(result.expiresAt);

      // Auto-save to マイリンク (non-blocking)
      if (input.passphrase && isValidPassphrase(input.passphrase)) {
        void (async () => {
          try {
            const shiori = parseAndValidateShioriJson(input.plainText, { parseJsonText, validateShioriData });
            await upsertUserLinkEntryUseCase(
              { shiori, key: result.key, expiresAt: result.expiresAt, passphrase: input.passphrase! },
              {
                loadLinksApi: apiClient.loadLinks,
                saveLinksApi: apiClient.saveLinks,
                hashPassphrase: hashPassphraseToKey,
                passphraseHashCache
              }
            );
          } catch {
            // Non-blocking: share link is already created
          }
        })();
      }
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
      <BuilderForm
        onSubmit={handleCreate}
        isSubmitting={isSubmitting}
        onEdit={handleEdit}
        initialJson={initialJson}
      />

      <aside className="panel form-stack">
        <h2>生成結果</h2>
        <p>入力内容のチェックと暗号化が成功すると、共有リンクが表示されます。</p>
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
