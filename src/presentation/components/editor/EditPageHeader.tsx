import type { Shiori } from '../../../domain/entities/Shiori';

interface EditPageHeaderProps {
  shiori: Shiori;
  onChange: (patch: Partial<Pick<Shiori, 'title' | 'destination' | 'startDateTime' | 'endDateTime'>>) => void;
}

export function EditPageHeader({ shiori, onChange }: EditPageHeaderProps) {
  return (
    <div className="panel form-stack edit-header-panel">
      <h2>基本情報</h2>
      <label className="label" htmlFor="edit-title">
        タイトル
      </label>
      <input
        id="edit-title"
        className="input"
        type="text"
        value={shiori.title}
        onChange={(e) => onChange({ title: e.target.value })}
        placeholder="旅行しおりのタイトル"
      />

      <label className="label" htmlFor="edit-destination">
        目的地
      </label>
      <input
        id="edit-destination"
        className="input"
        type="text"
        value={shiori.destination}
        onChange={(e) => onChange({ destination: e.target.value })}
        placeholder="例: 箱根"
      />

      <label className="label" htmlFor="edit-start">
        開始日時
      </label>
      <input
        id="edit-start"
        className="input"
        type="datetime-local"
        value={shiori.startDateTime}
        onChange={(e) => onChange({ startDateTime: e.target.value })}
      />

      <label className="label" htmlFor="edit-end">
        終了日時
      </label>
      <input
        id="edit-end"
        className="input"
        type="datetime-local"
        value={shiori.endDateTime}
        onChange={(e) => onChange({ endDateTime: e.target.value })}
      />
    </div>
  );
}
