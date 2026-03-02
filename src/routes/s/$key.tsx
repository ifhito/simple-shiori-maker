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
import { ShioriView } from '../../presentation/components/ShioriView';
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
      state: { unlockPassword } as unknown as Record<string, unknown>
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
        <>
          <ShioriView data={data} expiresAt={expiresAt} layoutMode={layoutMode} locale={locale} />
          <div className="add-row" style={{ marginTop: '14px' }}>
            <button type="button" className="button secondary" onClick={handleEdit}>
              このしおりを編集する
            </button>
          </div>
        </>
      ) : null}
    </section>
  );
}
