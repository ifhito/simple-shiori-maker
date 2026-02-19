import { humanizeValidationError } from './humanizeValidationError';

interface EditSummaryBarProps {
  validationErrors: string[];
  onPreviewToggle: () => void;
  previewVisible: boolean;
  onCreateLink: () => void;
  existingKey?: string | null;
  isUpdating?: boolean;
  onUpdate?: () => void;
}

export function EditSummaryBar({
  validationErrors,
  onPreviewToggle,
  previewVisible,
  onCreateLink,
  existingKey,
  isUpdating,
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
      <div className="edit-summary-actions">
        <button type="button" className="button secondary" onClick={onPreviewToggle}>
          {previewVisible ? 'プレビューを閉じる' : 'プレビュー'}
        </button>
        {isUpdateMode ? (
          <button
            type="button"
            className="button primary"
            disabled={hasErrors || isUpdating}
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
