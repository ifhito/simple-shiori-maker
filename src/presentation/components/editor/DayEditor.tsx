import type { ShioriDay, ShioriItem } from '../../../domain/entities/Shiori';
import { ItemEditor } from './ItemEditor';
import { ReorderControls } from './ReorderControls';

interface DayEditorProps {
  day: ShioriDay;
  dayIndex: number;
  isFirst: boolean;
  isLast: boolean;
  onLabelChange: (label: string) => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onRemove: () => void;
  onItemChange: (itemIndex: number, patch: Partial<ShioriItem>) => void;
  onItemMoveUp: (itemIndex: number) => void;
  onItemMoveDown: (itemIndex: number) => void;
  onItemRemove: (itemIndex: number) => void;
  onItemAdd: () => void;
}

export function DayEditor({
  day,
  dayIndex,
  isFirst,
  isLast,
  onLabelChange,
  onMoveUp,
  onMoveDown,
  onRemove,
  onItemChange,
  onItemMoveUp,
  onItemMoveDown,
  onItemRemove,
  onItemAdd
}: DayEditorProps) {
  return (
    <div className="edit-day">
      <div className="edit-day-header">
        <div className="edit-day-meta">
          <span className="day-badge">{day.label || `DAY ${dayIndex + 1}`}</span>
          <input
            className="input edit-day-label-input"
            type="text"
            value={day.label}
            onChange={(e) => onLabelChange(e.target.value)}
            placeholder={`DAY ${dayIndex + 1}`}
            aria-label="日ラベル"
          />
        </div>
        <ReorderControls
          onMoveUp={onMoveUp}
          onMoveDown={onMoveDown}
          onRemove={onRemove}
          isFirst={isFirst}
          isLast={isLast}
        />
      </div>

      <div className="edit-items-list">
        {day.items.map((item, itemIndex) => (
          <ItemEditor
            key={itemIndex}
            item={item}
            isFirst={itemIndex === 0}
            isLast={itemIndex === day.items.length - 1}
            onChange={(patch) => onItemChange(itemIndex, patch)}
            onMoveUp={() => onItemMoveUp(itemIndex)}
            onMoveDown={() => onItemMoveDown(itemIndex)}
            onRemove={() => onItemRemove(itemIndex)}
          />
        ))}
      </div>

      <div className="add-row">
        <button type="button" className="button secondary" onClick={onItemAdd}>
          ＋ スポットを追加
        </button>
      </div>
    </div>
  );
}
