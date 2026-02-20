import type { ShioriItem } from '../../../domain/entities/Shiori';
import { ReorderControls } from './ReorderControls';

interface ItemEditorProps {
  item: ShioriItem;
  isFirst: boolean;
  isLast: boolean;
  onChange: (patch: Partial<ShioriItem>) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
}

export function ItemEditor({
  item,
  isFirst,
  isLast,
  onChange,
  onMoveUp,
  onMoveDown,
  onRemove
}: ItemEditorProps) {
  return (
    <div className="edit-item">
      <div className="edit-item-header">
        <ReorderControls
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onRemove={onRemove}
          isFirst={isFirst}
          isLast={isLast}
        />
      </div>
      <div className="edit-item-fields">
        <div className="edit-field-row">
          <label className="label" htmlFor={`time-${item.title}-${item.time}`}>
            時刻
          </label>
          <input
            id={`time-${item.title}-${item.time}`}
            className="input"
            type="text"
            value={item.time}
            onChange={(e) => onChange({ time: e.target.value })}
            placeholder="HH:mm"
            pattern="\d{2}:\d{2}"
          />
        </div>
        <div className="edit-field-row">
          <label className="label">スポット名</label>
          <input
            className="input"
            type="text"
            value={item.title}
            onChange={(e) => onChange({ title: e.target.value })}
            placeholder="スポット名"
          />
        </div>
        <div className="edit-field-row">
          <label className="label">説明</label>
          <textarea
            className="textarea"
            rows={2}
            value={item.description}
            onChange={(e) => onChange({ description: e.target.value })}
            placeholder="説明・メモ"
          />
        </div>
        <div className="edit-field-row">
          <label className="label">場所</label>
          <input
            className="input"
            type="text"
            value={item.place}
            onChange={(e) => onChange({ place: e.target.value })}
            placeholder="場所・住所"
          />
        </div>
        <div className="edit-field-row">
          <label className="label">地図URL（任意）</label>
          <input
            className="input"
            type="url"
            value={item.mapUrl ?? ''}
            onChange={(e) => onChange({ mapUrl: e.target.value || undefined })}
            placeholder="https://maps.google.com/..."
          />
        </div>
      </div>
    </div>
  );
}
