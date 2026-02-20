import { createFileRoute, useNavigate, useRouterState } from '@tanstack/react-router';
import { useMemo, useEffect, useState } from 'react';
import { createShareLinkViaApi } from '../application/usecases/createShareLink';
import { createShioriApiClient } from '../infrastructure/http/shioriApiClient';
import { LocalPasshashStorage } from '../infrastructure/storage/passhashStorage';
import {
  addDay,
  addItem,
  moveDayDown,
  moveDayUp,
  moveItemDown,
  moveItemUp,
  removeDay,
  removeItem,
  updateDayLabel,
  updateHeader,
  updateItem
} from '../application/usecases/editShiori';
import { DomainValidationError, validateShioriData } from '../domain/services/ShioriValidationService';
import type { Shiori } from '../domain/entities/Shiori';
import { parseJsonText } from '../infrastructure/parsing/jsonParser';
import { AiEditPanel } from '../presentation/components/editor/AiEditPanel';
import { DayEditor } from '../presentation/components/editor/DayEditor';
import { EditModeTab } from '../presentation/components/editor/EditModeTab';
import { EditPageHeader } from '../presentation/components/editor/EditPageHeader';
import { EditSummaryBar } from '../presentation/components/editor/EditSummaryBar';
import { JsonEditPanel } from '../presentation/components/editor/JsonEditPanel';
import { ShioriTimeline } from '../presentation/components/ShioriTimeline';

const EDIT_DRAFT_KEY = 'shiori:edit-draft';
const BUILDER_DRAFT_KEY = 'shiori:builder-draft';

export const Route = createFileRoute('/edit')({
  component: EditPage
});

function validateLive(shiori: Shiori): string[] {
  try {
    validateShioriData(shiori);
    return [];
  } catch (e) {
    if (e instanceof DomainValidationError) return e.details;
    return [String(e)];
  }
}

function EditPage() {
  const navigate = useNavigate();
  const navState = useRouterState({ select: (s) => s.location.state as Record<string, unknown> | null });

  const [shiori, setShiori] = useState<Shiori | null>(null);
  const [existingKey, setExistingKey] = useState<string | null>(null);
  // パスワードは nav state (window.history.state) 経由で受け取る — sessionStorage には保存しない
  const [currentPassword, setCurrentPassword] = useState<string>(
    () => (navState?.unlockPassword as string | undefined) ?? ''
  );
  const [updatePassword, setUpdatePassword] = useState<string>(
    () => (navState?.unlockPassword as string | undefined) ?? ''
  );
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateError, setUpdateError] = useState('');

  const apiClient = useMemo(() => createShioriApiClient(''), []);
  const passhashRepository = useMemo(() => new LocalPasshashStorage(), []);

  const [editMode, setEditMode] = useState<'form' | 'json'>('form');
  const [jsonText, setJsonText] = useState('');
  const [jsonErrors, setJsonErrors] = useState<string[]>([]);
  const [aiErrors, setAiErrors] = useState<string[]>([]);
  const [previewVisible, setPreviewVisible] = useState(false);

  // Load draft and existing key from sessionStorage on mount
  useEffect(() => {
    const raw = sessionStorage.getItem(EDIT_DRAFT_KEY);
    if (raw) {
      try {
        const parsed = parseJsonText(raw);
        const validated = validateShioriData(parsed);
        setShiori(validated);
      } catch {
        // if draft is invalid, start empty
      }
    }
    const key = sessionStorage.getItem('shiori:edit-key');
    if (key) setExistingKey(key);
  }, []);

  // Auto-save draft
  useEffect(() => {
    if (shiori) {
      sessionStorage.setItem(EDIT_DRAFT_KEY, JSON.stringify(shiori));
    }
  }, [shiori]);

  const validationErrors = shiori ? validateLive(shiori) : [];

  function handleModeSwitch(mode: 'form' | 'json') {
    if (mode === 'json') {
      if (shiori) setJsonText(JSON.stringify(shiori, null, 2));
      setJsonErrors([]);
      setEditMode('json');
    } else {
      setEditMode('form');
    }
  }

  function applyJson() {
    setJsonErrors([]);
    try {
      const parsed = parseJsonText(jsonText);
      const validated = validateShioriData(parsed);
      setShiori(validated);
      setEditMode('form');
    } catch (e) {
      if (e instanceof DomainValidationError) {
        setJsonErrors(e.details);
      } else {
        setJsonErrors([e instanceof Error ? e.message : 'JSONの解析に失敗しました']);
      }
    }
  }

  function applyAiJson(raw: string) {
    setAiErrors([]);
    try {
      const parsed = parseJsonText(raw);
      const validated = validateShioriData(parsed);
      setShiori(validated);
    } catch (e) {
      if (e instanceof DomainValidationError) {
        setAiErrors(e.details);
      } else {
        setAiErrors([e instanceof Error ? e.message : 'JSONの解析に失敗しました']);
      }
    }
  }

  function handleCreateLink() {
    if (!shiori || validationErrors.length > 0) return;
    sessionStorage.setItem(BUILDER_DRAFT_KEY, JSON.stringify(shiori));
    sessionStorage.removeItem('shiori:edit-key');
    void navigate({ to: '/builder' });
  }

  async function handleUpdate() {
    if (
      !shiori ||
      !existingKey ||
      !updatePassword.trim() ||
      !currentPassword.trim() ||
      validationErrors.length > 0
    ) {
      return;
    }
    setIsUpdating(true);
    setUpdateError('');
    try {
      await createShareLinkViaApi(
        {
          plainText: JSON.stringify(shiori),
          password: updatePassword,
          existingKey,
          currentPassword
        },
        { encryptApi: apiClient.encrypt, passhashRepository }
      );
      sessionStorage.removeItem(EDIT_DRAFT_KEY);
      sessionStorage.removeItem('shiori:edit-key');
      void navigate({ to: '/s/$key', params: { key: existingKey } });
    } catch (error) {
      const message = error instanceof Error ? error.message : '更新に失敗しました';
      setUpdateError(message);
      setIsUpdating(false);
    }
  }

  if (!shiori) {
    return (
      <section className="form-stack">
        <div className="panel form-stack">
          <p>編集するしおりデータが見つかりません。</p>
          <p className="subtle-text">
            /builder でJSONを貼り付けて「編集する」ボタンを押すか、共有リンクを開いた後に「このしおりを編集する」をクリックしてください。
          </p>
          <a className="button secondary inline-block" href="/builder">
            しおりビルダーへ
          </a>
        </div>
      </section>
    );
  }

  return (
    <section className="edit-layout">
      <h1 className="edit-page-title">しおりを編集</h1>

      <EditModeTab mode={editMode} onSwitch={handleModeSwitch} />

      {editMode === 'json' ? (
        <JsonEditPanel
          jsonText={jsonText}
          onChange={setJsonText}
          onApply={applyJson}
          errors={jsonErrors}
        />
      ) : (
        <>
          <EditPageHeader
            shiori={shiori}
            onChange={(patch) => setShiori((prev) => updateHeader(prev!, patch))}
          />

          {shiori.days.map((day, dayIndex) => (
            <DayEditor
              key={dayIndex}
              day={day}
              dayIndex={dayIndex}
              isFirst={dayIndex === 0}
              isLast={dayIndex === shiori.days.length - 1}
              onLabelChange={(label) => setShiori((prev) => updateDayLabel(prev!, dayIndex, label))}
              onMoveUp={() => setShiori((prev) => moveDayUp(prev!, dayIndex))}
              onMoveDown={() => setShiori((prev) => moveDayDown(prev!, dayIndex))}
              onRemove={() => setShiori((prev) => removeDay(prev!, dayIndex))}
              onItemChange={(itemIndex, patch) =>
                setShiori((prev) => updateItem(prev!, dayIndex, itemIndex, patch))
              }
              onItemMoveUp={(itemIndex) =>
                setShiori((prev) => moveItemUp(prev!, dayIndex, itemIndex))
              }
              onItemMoveDown={(itemIndex) =>
                setShiori((prev) => moveItemDown(prev!, dayIndex, itemIndex))
              }
              onItemRemove={(itemIndex) =>
                setShiori((prev) => removeItem(prev!, dayIndex, itemIndex))
              }
              onItemAdd={() => setShiori((prev) => addItem(prev!, dayIndex))}
            />
          ))}

          <div className="add-row">
            <button
              type="button"
              className="button secondary"
              onClick={() => setShiori((prev) => addDay(prev!))}
            >
              ＋ 日を追加
            </button>
          </div>
        </>
      )}

      <AiEditPanel shiori={shiori} onApply={applyAiJson} errors={aiErrors} />

      {previewVisible ? (
        <div className="panel">
          <header className="shiori-hero">
            <h2>{shiori.title}</h2>
            <p className="hero-subtitle">
              {shiori.destination} / {shiori.startDateTime} – {shiori.endDateTime}
            </p>
          </header>
          <ShioriTimeline data={shiori} />
        </div>
      ) : null}

      <EditSummaryBar
        validationErrors={validationErrors}
        previewVisible={previewVisible}
        onPreviewToggle={() => setPreviewVisible((v) => !v)}
        onCreateLink={handleCreateLink}
        existingKey={existingKey}
        isUpdating={isUpdating}
        isUpdateDisabled={!currentPassword.trim() || !updatePassword.trim()}
        currentPassword={currentPassword}
        updatePassword={updatePassword}
        onCurrentPasswordChange={(value) => {
          setCurrentPassword(value);
          if (updateError) setUpdateError('');
        }}
        onUpdatePasswordChange={(value) => {
          setUpdatePassword(value);
          if (updateError) setUpdateError('');
        }}
        updateError={updateError}
        onUpdate={() => void handleUpdate()}
      />
    </section>
  );
}
