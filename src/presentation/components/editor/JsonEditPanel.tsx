import { humanizeValidationError } from './humanizeValidationError';

interface JsonEditPanelProps {
  jsonText: string;
  onChange: (text: string) => void;
  onApply: () => void;
  errors: string[];
}

export function JsonEditPanel({ jsonText, onChange, onApply, errors }: JsonEditPanelProps) {
  return (
    <div className="panel form-stack">
      <label className="label" htmlFor="json-edit-textarea">
        JSON（直接編集）
      </label>
      <textarea
        id="json-edit-textarea"
        className="textarea"
        rows={16}
        value={jsonText}
        onChange={(e) => onChange(e.target.value)}
        placeholder="JSONを貼り付けるか直接編集してください"
        spellCheck={false}
      />
      {errors.length > 0 ? (
        <ul className="error-list" role="alert">
          {errors.map((e, i) => (
            <li key={i} className="error-message">
              {humanizeValidationError(e)}
            </li>
          ))}
        </ul>
      ) : null}
      <button type="button" className="button primary" onClick={onApply}>
        このJSONを適用
      </button>
    </div>
  );
}
