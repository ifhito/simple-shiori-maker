interface ReorderControlsProps {
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  isFirst: boolean;
  isLast: boolean;
}

export function ReorderControls({
  onMoveUp,
  onMoveDown,
  onRemove,
  isFirst,
  isLast
}: ReorderControlsProps) {
  return (
    <div className="reorder-controls">
      <button
        type="button"
        className="icon-button"
        onClick={onMoveUp}
        disabled={isFirst}
        aria-label="上へ移動"
        title="上へ移動"
      >
        ↑
      </button>
      <button
        type="button"
        className="icon-button"
        onClick={onMoveDown}
        disabled={isLast}
        aria-label="下へ移動"
        title="下へ移動"
      >
        ↓
      </button>
      <button
        type="button"
        className="icon-button danger"
        onClick={onRemove}
        aria-label="削除"
        title="削除"
      >
        ×
      </button>
    </div>
  );
}
