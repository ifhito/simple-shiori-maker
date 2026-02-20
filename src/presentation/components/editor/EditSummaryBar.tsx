import { humanizeValidationError } from './humanizeValidationError';

interface EditSummaryBarProps {
  validationErrors: string[];
  onPreviewToggle: () => void;
  previewVisible: boolean;
  onCreateLink: () => void;
  existingKey?: string | null;
  isUpdating?: boolean;
  isUpdateDisabled?: boolean;
  currentPassword?: string;
  updatePassword?: string;
  onCurrentPasswordChange?: (value: string) => void;
  onUpdatePasswordChange?: (value: string) => void;
  updateError?: string;
  onUpdate?: () => void;
}

export function EditSummaryBar({
  validationErrors,
  onPreviewToggle,
  previewVisible,
  onCreateLink,
  existingKey,
  isUpdating,
  isUpdateDisabled,
  currentPassword,
  updatePassword,
  onCurrentPasswordChange,
  onUpdatePasswordChange,
  updateError,
  onUpdate
}: EditSummaryBarProps) {
  const hasErrors = validationErrors.length > 0;
  const isUpdateMode = Boolean(existingKey);

  return (
    <div className="edit-summary-bar">
      <div className="edit-summary-status">
        {hasErrors ? (
          <>
            <span className="error-badge" role="status">
              ⚠ {validationErrors.length}件のエラー
            </span>
            <ul className="edit-summary-errors" role="alert">
              {validationErrors.map((e, i) => (
                <li key={i}>{humanizeValidationError(e)}</li>
              ))}
            </ul>
          </>
        ) : (
          <span className="ok-badge" role="status">
            ✓ 検証OK
          </span>
        )}
      </div>
      {isUpdateMode ? (
        <div className="edit-summary-update-fields">
          <p className="subtle-text">
            ✏ 編集内容で /s/{existingKey} を上書き更新します。
          </p>
          <label className="label" htmlFor="current-password-input">
            現在のパスワード（更新認証に使用）
          </label>
          <input
            id="current-password-input"
            className="input"
            type="password"
            value={currentPassword ?? ''}
            onChange={(event) => onCurrentPasswordChange?.(event.target.value)}
            placeholder="現在このしおりを開いたパスワード"
          />
          <label className="label" htmlFor="update-password-input">
            新しいパスワード（変更しない場合は同じ値）
          </label>
          <input
            id="update-password-input"
            className="input"
            type="password"
            value={updatePassword ?? ''}
            onChange={(event) => onUpdatePasswordChange?.(event.target.value)}
            placeholder="英数字混在を推奨"
          />
          {updateError ? (
            <p className="error-message" role="alert">
              {updateError}
            </p>
          ) : null}
        </div>
      ) : null}
      <div className="edit-summary-actions">
        <button type="button" className="button secondary" onClick={onPreviewToggle}>
          {previewVisible ? 'プレビューを閉じる' : 'プレビュー'}
        </button>
        {isUpdateMode ? (
          <button
            type="button"
            className="button primary"
            disabled={hasErrors || isUpdating || isUpdateDisabled}
            onClick={onUpdate}
          >
            {isUpdating ? '更新中...' : 'このしおりを更新する'}
          </button>
        ) : (
          <button
            type="button"
            className="button primary"
            disabled={hasErrors}
            onClick={onCreateLink}
          >
            しおりリンクを作成
          </button>
        )}
      </div>
    </div>
  );
}
