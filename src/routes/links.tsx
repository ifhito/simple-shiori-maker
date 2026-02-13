import { createFileRoute } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { loadUserLinksViaApi, loadUserLinksViaApiWithHash } from '../application/usecases/loadUserLinks';
import { saveUserLinksViaApi } from '../application/usecases/saveUserLinks';
import type { UserLinkEntry } from '../domain/entities/UserLinkList';
import { hashPassphraseToKey } from '../infrastructure/crypto/passphraseHash';
import { createShioriApiClient } from '../infrastructure/http/shioriApiClient';
import {
  cachePassphraseHash,
  clearCachedPassphraseHash,
  getCachedPassphraseHash
} from '../infrastructure/storage/passphraseHashCache';
import { PassphraseForm } from '../presentation/components/PassphraseForm';
import { UserLinkList } from '../presentation/components/UserLinkList';

export const Route = createFileRoute('/links')({
  component: LinksPage
});

function sortLinks(value: UserLinkEntry[]): UserLinkEntry[] {
  return [...value].sort((a, b) => b.createdAt - a.createdAt);
}

function LinksPage() {
  const [passphraseHash, setPassphraseHash] = useState<string | null>(null);
  const [links, setLinks] = useState<UserLinkEntry[]>([]);
  const [isLoading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const apiClient = useMemo(() => createShioriApiClient(''), []);

  const loadLinks = useCallback(
    async (pp: string) => {
      setLoading(true);
      setErrorMessage('');
      try {
        const result = await loadUserLinksViaApi(pp, {
          hashPassphrase: hashPassphraseToKey,
          loadLinksApi: apiClient.loadLinks
        });
        setLinks(sortLinks(result.links));
        setPassphraseHash(result.passphraseHash);
        cachePassphraseHash(result.passphraseHash);
      } catch (error) {
        const message = error instanceof Error ? error.message : '読み込みに失敗しました';
        setErrorMessage(message);
      } finally {
        setLoading(false);
      }
    },
    [apiClient]
  );

  const loadLinksWithHash = useCallback(
    async (hash: string) => {
      setLoading(true);
      setErrorMessage('');
      try {
        const loaded = await loadUserLinksViaApiWithHash(hash, {
          loadLinksApi: apiClient.loadLinks
        });
        setLinks(sortLinks(loaded));
        setPassphraseHash(hash);
      } catch (error) {
        clearCachedPassphraseHash();
        const message = error instanceof Error ? error.message : '読み込みに失敗しました';
        setErrorMessage(message);
        setPassphraseHash(null);
        setLinks([]);
      } finally {
        setLoading(false);
      }
    },
    [apiClient]
  );

  useEffect(() => {
    const cached = getCachedPassphraseHash();
    if (cached) {
      loadLinksWithHash(cached);
    }
  }, [loadLinksWithHash]);

  const handleDelete = useCallback(
    async (key: string) => {
      if (!passphraseHash) return;

      const updated = links.filter((link) => link.key !== key);
      setLinks(updated);

      try {
        await saveUserLinksViaApi(
          { passphraseHash, links: updated },
          { saveLinksApi: apiClient.saveLinks }
        );
      } catch {
        // Revert on failure
        setLinks(links);
      }
    },
    [passphraseHash, links, apiClient]
  );

  const handleLogout = useCallback(() => {
    clearCachedPassphraseHash();
    setPassphraseHash(null);
    setLinks([]);
    setErrorMessage('');
  }, []);

  if (!passphraseHash) {
    return (
      <PassphraseForm
        onSubmit={loadLinks}
        isLoading={isLoading}
        errorMessage={errorMessage}
      />
    );
  }

  return (
    <UserLinkList
      links={links}
      onDelete={handleDelete}
      onLogout={handleLogout}
    />
  );
}
