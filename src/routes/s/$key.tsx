import { createFileRoute, useNavigate } from '@tanstack/react-router';
import { useMemo, useState } from 'react';
import { unlockShioriViaApi } from '../../application/usecases/unlockShiori';
import { validateShioriData } from '../../domain/services/ShioriValidationService';
import { createShioriApiClient } from '../../infrastructure/http/shioriApiClient';
import { parseJsonText } from '../../infrastructure/parsing/jsonParser';
import {
  LocalPasshashStorage,
  verifyPasswordAgainstRecord
} from '../../infrastructure/storage/passhashStorage';
import { getLayoutMode } from '../../presentation/components/layoutMode';
import { formatExpiryDateTime, formatRemainingTime } from '../../presentation/components/shareLink';
import { ShioriTimeline } from '../../presentation/components/ShioriTimeline';
import { ShioriUnlockPanel } from '../../presentation/components/ShioriUnlockPanel';

export const Route = createFileRoute('/s/$key')({
  component: SharedShioriPage
});

const EDIT_DRAFT_KEY = 'shiori:edit-draft';

function SharedShioriPage() {
  const { key } = Route.useParams();
  const navigate = useNavigate();
  const [isLoading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [data, setData] = useState<ReturnType<typeof validateShioriData> | null>(null);
  const [expiresAt, setExpiresAt] = useState<number | null>(null);
  const [unlockPassword, setUnlockPassword] = useState('');

  const apiClient = useMemo(() => createShioriApiClient(''), []);
  const passhashRepository = useMemo(() => new LocalPasshashStorage(), []);

  const hasValidQuery = Boolean(key);

  async function handleUnlock(password: string) {
    setLoading(true);
    setErrorMessage('');

    try {
      const result = await unlockShioriViaApi(
        {
          key,
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
      setExpiresAt(result.expiresAt);
      setUnlockPassword(password);
    } catch (error) {
      const message = error instanceof Error ? error.message : '復号に失敗しました';
      setErrorMessage(message);
      setData(null);
      setExpiresAt(null);
    } finally {
      setLoading(false);
    }
  }

  function handleEdit() {
    if (!data) return;
    sessionStorage.setItem(EDIT_DRAFT_KEY, JSON.stringify(data));
    sessionStorage.setItem('shiori:edit-key', key);
    void navigate({
      to: '/edit',
      state: (prev: unknown) => ({
        ...(typeof prev === 'object' && prev !== null ? prev : {}),
        unlockPassword
      })
    });
  }

  const layoutMode =
    typeof window === 'undefined' ? 'desktop' : getLayoutMode(window.innerWidth);
  const locale = typeof navigator === 'undefined' ? 'ja-JP' : navigator.language;

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
            {expiresAt !== null ? (
              <p className="subtle-text">
                有効期限: {formatExpiryDateTime(expiresAt, locale)}（{formatRemainingTime(expiresAt)}）
              </p>
            ) : null}
            <div className="hero-deco" aria-hidden>
              <span>⛰️</span>
              <span>🚃</span>
              <span>🌲</span>
            </div>
          </header>
          <ShioriTimeline data={data} />
          <div className="add-row" style={{ marginTop: '14px' }}>
            <button type="button" className="button secondary" onClick={handleEdit}>
              このしおりを編集する
            </button>
          </div>
        </article>
      ) : null}
    </section>
  );
}
