import { createFileRoute } from '@tanstack/react-router';
import { useEffect, useMemo, useState } from 'react';
import { unlockShioriViaApi } from '../application/usecases/unlockShiori';
import { validateShioriData } from '../domain/services/ShioriValidationService';
import { createShioriApiClient } from '../infrastructure/http/shioriApiClient';
import { parseJsonText } from '../infrastructure/parsing/jsonParser';
import {
  LocalPasshashStorage,
  verifyPasswordAgainstRecord
} from '../infrastructure/storage/passhashStorage';
import { getLayoutMode } from '../presentation/components/layoutMode';
import { readEncryptedPayloadFromHash } from '../presentation/components/shareLink';
import { ShioriTimeline } from '../presentation/components/ShioriTimeline';
import { ShioriUnlockPanel } from '../presentation/components/ShioriUnlockPanel';

export const Route = createFileRoute('/shiori')({
  validateSearch: (search: Record<string, unknown>) => ({
    id: typeof search.id === 'string' ? search.id : undefined,
    d: typeof search.d === 'string' ? search.d : undefined
  }),
  component: ShioriPage
});

function ShioriPage() {
  const search = Route.useSearch();
  const [isLoading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [data, setData] = useState<ReturnType<typeof validateShioriData> | null>(null);
  const [encryptedPayload, setEncryptedPayload] = useState<string | undefined>(search.d);

  const apiClient = useMemo(() => createShioriApiClient(''), []);
  const passhashRepository = useMemo(() => new LocalPasshashStorage(), []);

  useEffect(() => {
    if (search.d) {
      setEncryptedPayload(search.d);
      return;
    }

    if (typeof window === 'undefined') {
      setEncryptedPayload(undefined);
      return;
    }

    setEncryptedPayload(readEncryptedPayloadFromHash(window.location.hash));
  }, [search.d]);

  const hasValidQuery = Boolean(search.id && encryptedPayload);

  async function handleUnlock(password: string) {
    setLoading(true);
    setErrorMessage('');

    try {
      const result = await unlockShioriViaApi(
        {
          id: search.id,
          d: encryptedPayload,
          password
        },
        {
          decryptApi: apiClient.decrypt,
          parseJsonText,
          validateShioriData,
          passhashRepository,
          verifyPasswordHashRecord: verifyPasswordAgainstRecord
        }
      );
      setData(result.shiori);
    } catch (error) {
      const message = error instanceof Error ? error.message : '復号に失敗しました';
      setErrorMessage(message);
      setData(null);
    } finally {
      setLoading(false);
    }
  }

  const layoutMode =
    typeof window === 'undefined' ? 'desktop' : getLayoutMode(window.innerWidth);

  return (
    <section className="form-stack">
      <ShioriUnlockPanel
        hasValidQuery={hasValidQuery}
        errorMessage={errorMessage}
        onUnlock={handleUnlock}
        isLoading={isLoading}
      />

      {data ? (
        <article className={`panel ${layoutMode === 'mobile' ? 'mobile-timeline' : ''}`}>
          <header className="shiori-hero">
            <h1>{data.title}</h1>
            <p className="hero-subtitle">
              {data.destination} / {data.startDateTime} - {data.endDateTime}
            </p>
            <div className="hero-deco" aria-hidden>
              <span>⛰️</span>
              <span>🚃</span>
              <span>🌲</span>
            </div>
          </header>
          <ShioriTimeline data={data} />
        </article>
      ) : null}
    </section>
  );
}
