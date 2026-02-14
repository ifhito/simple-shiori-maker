import { createFileRoute } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { createShareLinkViaApi } from '../application/usecases/createShareLink';
import {
  loadUserLinksViaApi,
  type LoadUserLinksClientPassphraseDeps
} from '../application/usecases/loadUserLinks';
import { saveUserLinksViaApi, type SaveUserLinksClientDeps } from '../application/usecases/saveUserLinks';
import type { UserLinkEntry } from '../domain/entities/UserLinkList';
import { isValidPassphrase } from '../domain/valueObjects/Passphrase';
import { hashPassphraseToKey } from '../infrastructure/crypto/passphraseHash';
import { createShioriApiClient } from '../infrastructure/http/shioriApiClient';
import { cachePassphraseHash } from '../infrastructure/storage/passphraseHashCache';
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

  async function handleCreate(input: { plainText: string; password: string; passphrase?: string }) {
    setSubmitting(true);
    setErrorMessage('');
    setShareUrl('');
    setExpiresAt(null);

    try {
      const result = await createShareLinkViaApi(
        { plainText: input.plainText, password: input.password },
        {
          encryptApi: apiClient.encrypt,
          passhashRepository
        }
      );

      const origin = typeof window === 'undefined' ? '' : window.location.origin;
      const url = buildShareUrl(origin, result.key);
      setShareUrl(url);
      setExpiresAt(result.expiresAt);

      // Auto-save to マイリンク (non-blocking)
      if (input.passphrase && isValidPassphrase(input.passphrase)) {
        saveToMyLinks(input.passphrase, input.plainText, result.key, result.expiresAt);
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'リンク生成に失敗しました';
      setErrorMessage(message);
      throw error;
    } finally {
      setSubmitting(false);
    }
  }

  function saveToMyLinks(
    passphrase: string,
    plainText: string,
    key: string,
    expiresAt: number
  ) {
    const saveDeps: SaveUserLinksClientDeps = { saveLinksApi: apiClient.saveLinks };
    const loadDeps: LoadUserLinksClientPassphraseDeps = {
      loadLinksApi: apiClient.loadLinks,
      hashPassphrase: hashPassphraseToKey
    };

    let title = '';
    let destination = '';
    try {
      const parsed = JSON.parse(plainText) as { title?: string; destination?: string };
      title = parsed.title || '';
      destination = parsed.destination || '';
    } catch {
      // ignore parse failures
    }

    const newEntry: UserLinkEntry = {
      key,
      title,
      destination,
      createdAt: Date.now(),
      expiresAt
    };

    // Fire-and-forget: don't block the main flow
    (async () => {
      try {
        const loaded = await loadUserLinksViaApi(passphrase, loadDeps);
        const existing = loaded.links;
        const existingEntry = existing.find((entry) => entry.key === key);

        const merged: UserLinkEntry = existingEntry
          ? {
              ...existingEntry,
              ...newEntry,
              title: newEntry.title || existingEntry.title,
              destination: newEntry.destination || existingEntry.destination
            }
          : newEntry;

        const updated = [merged, ...existing.filter((entry) => entry.key !== key)].sort(
          (a, b) => b.createdAt - a.createdAt
        );

        await saveUserLinksViaApi({ passphraseHash: loaded.passphraseHash, links: updated }, saveDeps);
        cachePassphraseHash(loaded.passphraseHash);
      } catch {
        // Non-blocking: share link is already created
      }
    })();
  }

  const locale = typeof navigator === 'undefined' ? 'ja-JP' : navigator.language;

  return (
    <section className="builder-layout">
      <BuilderForm onSubmit={handleCreate} isSubmitting={isSubmitting} />

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
